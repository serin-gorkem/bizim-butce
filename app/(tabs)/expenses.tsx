import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";

import { getCurrentUserHousehold } from "../../src/lib/household";
import { supabase } from "../../src/lib/supabase";
import { formatCurrency, formatDate } from "../../src/utils/formatters";
import { parsePositiveNumber } from "../../src/utils/parsers";
import { firstOrNull } from "../../src/utils/relations";

type ExpenseRaw = {
  id: string;
  user_id: string;
  category_id: string;
  amount: number | string;
  description: string | null;
  spent_at: string;
  entry_type: string;
  quantity: number | null;
  unit_price: number | null;
  categories:
    | {
        name: string;
        slug: string;
      }
    | {
        name: string;
        slug: string;
      }[]
    | null;
  profiles:
    | {
        full_name: string;
      }
    | {
        full_name: string;
      }[]
    | null;
};

type Expense = {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  description: string | null;
  spent_at: string;
  entry_type: string;
  quantity: number | null;
  unit_price: number | null;
  categories: {
    name: string;
    slug: string;
  } | null;
  profiles: {
    full_name: string;
  } | null;
};

type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
};

function normalizeExpense(raw: ExpenseRaw): Expense {
  return {
    id: raw.id,
    user_id: raw.user_id,
    category_id: raw.category_id,
    amount: Number(raw.amount),
    description: raw.description,
    spent_at: raw.spent_at,
    entry_type: raw.entry_type,
    quantity: raw.quantity,
    unit_price: raw.unit_price,
    categories: firstOrNull(raw.categories),
    profiles: firstOrNull(raw.profiles),
  };
}

export default function ExpensesScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadExpenses() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const membership = await getCurrentUserHousehold();

      if (!membership) {
        setErrorMessage("Ortak alan bulunamadı.");
        return;
      }

      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("id, name, slug, icon, sort_order")
        .eq("household_id", membership.household_id)
        .order("sort_order", { ascending: true });

      if (categoriesError) {
        setErrorMessage(categoriesError.message);
        return;
      }

      setCategories(categoriesData ?? []);

      const { data, error } = await supabase
        .from("expenses")
        .select(
          `
          id,
          user_id,
          category_id,
          amount,
          description,
          spent_at,
          entry_type,
          quantity,
          unit_price,
          categories (
            name,
            slug
          ),
          profiles (
            full_name
          )
        `,
        )
        .eq("household_id", membership.household_id)
        .order("spent_at", { ascending: false });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      const normalizedExpenses = ((data ?? []) as ExpenseRaw[]).map(
        normalizeExpense,
      );

      setExpenses(normalizedExpenses);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Harcamalar yüklenemedi.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, []),
  );

  function openEditModal(expense: Expense) {
    setSelectedExpense(expense);
    setEditAmount(String(expense.amount));
    setEditDescription(expense.description ?? "");
    setEditCategoryId(expense.category_id);
  }

  function closeEditModal() {
    setSelectedExpense(null);
    setEditAmount("");
    setEditDescription("");
    setEditCategoryId("");
  }

  async function handleUpdateExpense() {
    if (!selectedExpense) {
      Alert.alert("Harcama seçilmedi", "Düzenlenecek harcama bulunamadı.");
      return;
    }

    const parsedAmount = parsePositiveNumber(editAmount);

    if (!parsedAmount) {
      Alert.alert("Geçersiz tutar", "Lütfen geçerli bir tutar gir.");
      return;
    }

    if (!editCategoryId) {
      Alert.alert("Kategori seçilmedi", "Lütfen bir kategori seç.");
      return;
    }

    setIsSaving(true);

    try {
      const cleanedDescription = editDescription.trim();

      const { error } = await supabase
        .from("expenses")
        .update({
          amount: parsedAmount,
          description: cleanedDescription || null,
          category_id: editCategoryId,
        })
        .eq("id", selectedExpense.id);

      if (error) {
        Alert.alert("Güncellenemedi", error.message);
        return;
      }

      closeEditModal();
      await loadExpenses();

      Alert.alert("Güncellendi", "Harcama başarıyla güncellendi.");
    } catch (error) {
      Alert.alert(
        "Beklenmeyen hata",
        error instanceof Error
          ? error.message
          : "Harcama güncellenirken hata oluştu.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteExpense(expense: Expense) {
    Alert.alert("Harcamayı sil", "Bu harcamayı silmek istediğine emin misin?", [
      {
        text: "Vazgeç",
        style: "cancel",
      },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("expenses")
            .delete()
            .eq("id", expense.id);

          if (error) {
            Alert.alert("Silinemedi", error.message);
            return;
          }

          await loadExpenses();
        },
      },
    ]);
  }

  function renderRightActions(expense: Expense) {
    return (
      <Pressable
        onPress={() => handleDeleteExpense(expense)}
        style={{
          width: 88,
          minHeight: 74,
          backgroundColor: "#DC2626",
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 14,
            fontWeight: "900",
          }}
        >
          Sil
        </Text>
      </Pressable>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F5FBFF" }}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <ActivityIndicator color="#2563EB" />
          <Text style={{ color: "#6B7280", fontWeight: "700" }}>
            Harcamalar yükleniyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F5FBFF" }}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              width: "100%",
              padding: 20,
              borderRadius: 24,
              backgroundColor: "#FFFFFF",
              borderWidth: 1,
              borderColor: "#FCA5A5",
            }}
          >
            <Text
              style={{
                color: "#DC2626",
                textAlign: "center",
                fontWeight: "800",
              }}
            >
              {errorMessage}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5FBFF" }}>
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: 24,
          paddingBottom: 48,
        }}
        ListHeaderComponent={
          <View>
            <View
              style={{
                padding: 20,
                borderRadius: 28,
                backgroundColor: "#DBEAFE",
                borderWidth: 6,
                borderColor: "#FFFFFF",
                marginBottom: 24,
                shadowColor: "#1E3A8A",
                shadowOpacity: 0.12,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 10 },
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <View
                  style={{
                    width: 66,
                    height: 66,
                    borderRadius: 24,
                    backgroundColor: "#2563EB",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 28,
                      fontWeight: "900",
                    }}
                  >
                    ₺
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 32,
                      fontWeight: "900",
                      color: "#111827",
                      marginBottom: 4,
                    }}
                  >
                    Harcamalar
                  </Text>

                  <Text
                    style={{
                      fontSize: 15,
                      lineHeight: 21,
                      color: "#4B5563",
                    }}
                  >
                    Ortak alana girilen tüm harcamalar.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View
            style={{
              padding: 24,
              borderRadius: 24,
              backgroundColor: "#FFFFFF",
              borderWidth: 1,
              borderColor: "#BFDBFE",
            }}
          >
            <Text
              style={{
                color: "#6B7280",
                textAlign: "center",
                fontWeight: "700",
              }}
            >
              Henüz harcama eklenmedi.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Swipeable renderRightActions={() => renderRightActions(item)}>
            <Pressable
              onPress={() => openEditModal(item)}
              style={{
                padding: 16,
                borderRadius: 22,
                backgroundColor: "#FFFFFF",
                borderWidth: 1,
                borderColor: "#BFDBFE",
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      alignSelf: "flex-start",
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 999,
                      backgroundColor: "#EDE9FE",
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "900",
                        color: "#5B21B6",
                      }}
                    >
                      {item.categories?.name ?? "Kategori yok"}
                    </Text>
                  </View>

                  {item.entry_type === "template" &&
                    item.quantity &&
                    item.unit_price && (
                      <Text
                        style={{
                          marginBottom: 4,
                          fontSize: 13,
                          color: "#5B21B6",
                          fontWeight: "800",
                        }}
                      >
                        {item.quantity} adet × ₺
                        {Number(item.unit_price).toFixed(2)}
                      </Text>
                    )}

                  {item.description && (
                    <Text
                      style={{
                        marginBottom: 4,
                        fontSize: 15,
                        color: "#111827",
                        fontWeight: "800",
                      }}
                    >
                      {item.description}
                    </Text>
                  )}

                  <Text
                    style={{
                      marginTop: 2,
                      fontSize: 14,
                      color: "#6B7280",
                    }}
                  >
                    {item.profiles?.full_name ?? "Bilinmeyen kullanıcı"} ·{" "}
                    {formatDate(item.spent_at)}
                  </Text>
                </View>

                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "900",
                    color: "#1E3A8A",
                  }}
                >
                  {formatCurrency(item.amount)}
                </Text>
              </View>
            </Pressable>
          </Swipeable>
        )}
      />

      <Modal
        visible={!!selectedExpense}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isSaving) {
            closeEditModal();
          }
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(30,58,138,0.45)",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              width: "100%",
              borderRadius: 28,
              backgroundColor: "#FFFFFF",
              padding: 24,
              borderWidth: 1,
              borderColor: "#BFDBFE",
            }}
          >
            <Text
              style={{
                fontSize: 26,
                fontWeight: "900",
                color: "#111827",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              Harcama Düzenle
            </Text>

            <Text
              style={{
                fontSize: 15,
                color: "#6B7280",
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              Tutar, açıklama ve kategoriyi güncelleyebilirsin.
            </Text>

            <Text
              style={{
                fontSize: 14,
                fontWeight: "800",
                color: "#111827",
                marginBottom: 8,
              }}
            >
              Tutar
            </Text>

            <TextInput
              value={editAmount}
              onChangeText={setEditAmount}
              placeholder="Örn: 350"
              keyboardType="decimal-pad"
              style={{
                height: 54,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: "#D1D5DB",
                backgroundColor: "#F9FAFB",
                paddingHorizontal: 16,
                fontSize: 20,
                fontWeight: "800",
                marginBottom: 16,
              }}
            />

            <Text
              style={{
                fontSize: 14,
                fontWeight: "800",
                color: "#111827",
                marginBottom: 8,
              }}
            >
              Başlık / Not
            </Text>

            <TextInput
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Örn: Migros alışverişi"
              style={{
                height: 54,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: "#D1D5DB",
                backgroundColor: "#F9FAFB",
                paddingHorizontal: 16,
                fontSize: 16,
                fontWeight: "500",
                marginBottom: 16,
              }}
            />

            <Text
              style={{
                fontSize: 14,
                fontWeight: "800",
                color: "#111827",
                marginBottom: 8,
              }}
            >
              Kategori
            </Text>

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 20,
              }}
            >
              {categories.map((category) => {
                const isSelected = editCategoryId === category.id;

                return (
                  <Pressable
                    key={category.id}
                    onPress={() => setEditCategoryId(category.id)}
                    disabled={isSaving}
                    style={{
                      paddingHorizontal: 12,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: isSelected ? "#2563EB" : "#F5FBFF",
                      borderWidth: 1,
                      borderColor: isSelected ? "#2563EB" : "#DBEAFE",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "800",
                        color: isSelected ? "#FFFFFF" : "#1E3A8A",
                      }}
                    >
                      {category.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={handleUpdateExpense}
              disabled={isSaving}
              style={{
                height: 54,
                borderRadius: 18,
                backgroundColor: isSaving ? "#93C5FD" : "#2563EB",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 16,
                  fontWeight: "900",
                }}
              >
                {isSaving ? "Kaydediliyor..." : "Kaydet"}
              </Text>
            </Pressable>

            <Pressable
              onPress={closeEditModal}
              disabled={isSaving}
              style={{
                height: 54,
                borderRadius: 18,
                backgroundColor: "#FFFFFF",
                borderWidth: 1,
                borderColor: "#BFDBFE",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: "#1E3A8A",
                  fontSize: 16,
                  fontWeight: "900",
                }}
              >
                Vazgeç
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
