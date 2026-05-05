import { AppScreen } from "@/components/AppScreen";
import { ExpenseSwipeActions } from "@/components/ExpenseSwipeActions";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { getCurrentUserHousehold } from "../../src/lib/household";
import { supabase } from "../../src/lib/supabase";
import { showAlert } from "../../src/utils/appAlert";
import { formatCurrency, formatDate } from "../../src/utils/formatters";
import { parsePositiveNumber } from "../../src/utils/parsers";
import { firstOrNull } from "../../src/utils/relations";

const SCREEN_BG = "#fcedd9";
const TEXT_DARK = "#3B2414";
const TEXT_MUTED = "#7C5A3A";
const PRIMARY_BLUE = "#2563EB";
const WARM_BROWN = "#92400E";
const CARD_BG = "#FFF9F0";
const SOFT_YELLOW = "#FDE68A";
const INPUT_BORDER = "#FCD34D";

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
      showAlert("Harcama seçilmedi", "Düzenlenecek harcama bulunamadı.");
      return;
    }

    const parsedAmount = parsePositiveNumber(editAmount);

    if (!parsedAmount) {
      showAlert("Geçersiz tutar", "Lütfen geçerli bir tutar gir.");
      return;
    }

    if (!editCategoryId) {
      showAlert("Kategori seçilmedi", "Lütfen bir kategori seç.");
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
        showAlert("Güncellenemedi", error.message);
        return;
      }

      closeEditModal();
      await loadExpenses();

      showAlert("Güncellendi", "Harcama başarıyla güncellendi.");
    } catch (error) {
      showAlert(
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
    showAlert("Harcamayı sil", "Bu harcamayı silmek istediğine emin misin?", [
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
            showAlert("Silinemedi", error.message);
            return;
          }

          await loadExpenses();
        },
      },
    ]);
  }

  if (isLoading) {
    return (
      <AppScreen backgroundColor={SCREEN_BG}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <ActivityIndicator color={PRIMARY_BLUE} />
          <Text style={{ color: TEXT_MUTED, fontWeight: "800" }}>
            Harcamalar yükleniyor...
          </Text>
        </View>
      </AppScreen>
    );
  }

  if (errorMessage) {
    return (
      <AppScreen backgroundColor={SCREEN_BG}>
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
              backgroundColor: CARD_BG,
              borderWidth: 1,
              borderColor: "#FCA5A5",
            }}
          >
            <Text
              style={{
                color: "#DC2626",
                textAlign: "center",
                fontWeight: "900",
              }}
            >
              {errorMessage}
            </Text>
          </View>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen backgroundColor={SCREEN_BG}>
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
                backgroundColor: CARD_BG,
                borderWidth: 1,
                borderColor: SOFT_YELLOW,
                marginBottom: 24,
                shadowColor: WARM_BROWN,
                shadowOpacity: 0.1,
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
                    backgroundColor: "#FFE8B8",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: SOFT_YELLOW,
                  }}
                >
                  <Text style={{ fontSize: 34 }}>🧾</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 32,
                      fontWeight: "900",
                      color: TEXT_DARK,
                      marginBottom: 4,
                    }}
                  >
                    Harcamalar
                  </Text>

                  <Text
                    style={{
                      fontSize: 15,
                      lineHeight: 21,
                      color: TEXT_MUTED,
                      fontWeight: "600",
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
              borderRadius: 26,
              backgroundColor: CARD_BG,
              borderWidth: 1,
              borderColor: SOFT_YELLOW,
            }}
          >
            <Text
              style={{
                color: TEXT_MUTED,
                textAlign: "center",
                fontWeight: "800",
              }}
            >
              Henüz harcama eklenmedi.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ExpenseSwipeActions onDelete={() => handleDeleteExpense(item)}>
            <Pressable
              onPress={() => openEditModal(item)}
              style={{
                padding: 16,
                borderRadius: 22,
                backgroundColor: CARD_BG,
                borderWidth: 1,
                borderColor: SOFT_YELLOW,
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
                      backgroundColor: "#FFE8B8",
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "900",
                        color: WARM_BROWN,
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
                          color: "#BE185D",
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
                        color: TEXT_DARK,
                        fontWeight: "900",
                      }}
                    >
                      {item.description}
                    </Text>
                  )}

                  <Text
                    style={{
                      marginTop: 2,
                      fontSize: 14,
                      color: TEXT_MUTED,
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
                    color: WARM_BROWN,
                  }}
                >
                  {formatCurrency(item.amount)}
                </Text>
              </View>
            </Pressable>
          </ExpenseSwipeActions>
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
            backgroundColor: "rgba(59,36,20,0.45)",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 390,
              borderRadius: 28,
              backgroundColor: CARD_BG,
              padding: 24,
              borderWidth: 1,
              borderColor: SOFT_YELLOW,
              alignSelf: "center",
            }}
          >
            <View
              style={{
                alignSelf: "center",
                width: 76,
                height: 76,
                borderRadius: 28,
                backgroundColor: "#FFE8B8",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 18,
                borderWidth: 1,
                borderColor: SOFT_YELLOW,
              }}
            >
              <Text style={{ fontSize: 34 }}>✏️</Text>
            </View>

            <Text
              style={{
                fontSize: 26,
                fontWeight: "900",
                color: TEXT_DARK,
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              Harcama Düzenle
            </Text>

            <Text
              style={{
                fontSize: 15,
                color: TEXT_MUTED,
                textAlign: "center",
                marginBottom: 20,
                fontWeight: "600",
              }}
            >
              Tutar, açıklama ve kategoriyi güncelleyebilirsin.
            </Text>

            <Text
              style={{
                fontSize: 14,
                fontWeight: "900",
                color: TEXT_DARK,
                marginBottom: 8,
              }}
            >
              Tutar
            </Text>

            <TextInput
              value={editAmount}
              onChangeText={setEditAmount}
              placeholder="Örn: 350"
              placeholderTextColor="#B08A63"
              keyboardType="decimal-pad"
              style={{
                height: 54,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: INPUT_BORDER,
                backgroundColor: "#FFFFFF",
                paddingHorizontal: 16,
                fontSize: 20,
                fontWeight: "900",
                color: TEXT_DARK,
                marginBottom: 16,
              }}
            />

            <Text
              style={{
                fontSize: 14,
                fontWeight: "900",
                color: TEXT_DARK,
                marginBottom: 8,
              }}
            >
              Başlık / Not
            </Text>

            <TextInput
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Örn: Migros alışverişi"
              placeholderTextColor="#B08A63"
              style={{
                height: 54,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: INPUT_BORDER,
                backgroundColor: "#FFFFFF",
                paddingHorizontal: 16,
                fontSize: 16,
                fontWeight: "600",
                color: TEXT_DARK,
                marginBottom: 16,
              }}
            />

            <Text
              style={{
                fontSize: 14,
                fontWeight: "900",
                color: TEXT_DARK,
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
                      borderRadius: 14,
                      backgroundColor: isSelected ? PRIMARY_BLUE : "#FFFFFF",
                      borderWidth: 1,
                      borderColor: isSelected ? PRIMARY_BLUE : INPUT_BORDER,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "900",
                        color: isSelected ? "#FFFFFF" : WARM_BROWN,
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
                borderRadius: 20,
                backgroundColor: isSaving ? "#93C5FD" : PRIMARY_BLUE,
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
                borderRadius: 20,
                backgroundColor: "#FFFFFF",
                borderWidth: 1,
                borderColor: INPUT_BORDER,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: WARM_BROWN,
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
    </AppScreen>
  );
}
