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

type UserTotal = {
  userId: string;
  fullName: string;
  total: number;
};

type HomeSummary = {
  monthTotal: number;
  todayTotal: number;
  userTotals: UserTotal[];
};

function getMonthDateRange() {
  const now = new Date();

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function getTodayDateRange() {
  const now = new Date();

  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

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

function calculateSummary(monthExpenses: Expense[]): HomeSummary {
  const { start: todayStart, end: todayEnd } = getTodayDateRange();

  const monthTotal = monthExpenses.reduce(
    (total, expense) => total + expense.amount,
    0,
  );

  const todayTotal = monthExpenses
    .filter((expense) => {
      const spentAt = new Date(expense.spent_at).toISOString();

      return spentAt >= todayStart && spentAt < todayEnd;
    })
    .reduce((total, expense) => total + expense.amount, 0);

  const totalsByUser = new Map<string, UserTotal>();

  for (const expense of monthExpenses) {
    const existing = totalsByUser.get(expense.user_id);

    if (existing) {
      existing.total += expense.amount;
      continue;
    }

    totalsByUser.set(expense.user_id, {
      userId: expense.user_id,
      fullName: expense.profiles?.full_name ?? "Bilinmeyen kullanıcı",
      total: expense.amount,
    });
  }

  return {
    monthTotal,
    todayTotal,
    userTotals: Array.from(totalsByUser.values()),
  };
}

export default function HomeScreen() {
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");

  const [householdName, setHouseholdName] = useState("");
  const [summary, setSummary] = useState<HomeSummary>({
    monthTotal: 0,
    todayTotal: 0,
    userTotals: [],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadHomeData() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const membership = await getCurrentUserHousehold();

      if (!membership) {
        setErrorMessage("Ortak alan bulunamadı.");
        return;
      }

      const household = Array.isArray(membership.households)
        ? membership.households[0]
        : membership.households;

      setHouseholdName(household?.name ?? "Ortak Alan");

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

      const { start: monthStart, end: monthEnd } = getMonthDateRange();

      const { data: monthData, error: monthError } = await supabase
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
        .gte("spent_at", monthStart)
        .lt("spent_at", monthEnd)
        .order("spent_at", { ascending: false });

      if (monthError) {
        setErrorMessage(monthError.message);
        return;
      }

      const normalizedMonthExpenses = ((monthData ?? []) as ExpenseRaw[]).map(
        normalizeExpense,
      );

      setSummary(calculateSummary(normalizedMonthExpenses));

      const { data: recentData, error: recentError } = await supabase
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
        .order("spent_at", { ascending: false })
        .limit(5);

      if (recentError) {
        setErrorMessage(recentError.message);
        return;
      }

      const normalizedRecentExpenses = ((recentData ?? []) as ExpenseRaw[]).map(
        normalizeExpense,
      );

      setRecentExpenses(normalizedRecentExpenses);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Ana sayfa yüklenemedi.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadHomeData();
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
      await loadHomeData();

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

          await loadHomeData();
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
            Ana sayfa yükleniyor...
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
        data={recentExpenses}
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
                marginBottom: 18,
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
                      fontSize: 25,
                      fontWeight: "900",
                    }}
                  >
                    BB
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
                    BizimBütçe
                  </Text>

                  <Text
                    style={{
                      fontSize: 15,
                      lineHeight: 21,
                      color: "#4B5563",
                    }}
                  >
                    {householdName} ortak harcama alanı.
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={{
                padding: 22,
                borderRadius: 28,
                backgroundColor: "#2563EB",
                marginBottom: 16,
                shadowColor: "#2563EB",
                shadowOpacity: 0.22,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 10 },
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "800",
                  color: "#DBEAFE",
                  marginBottom: 8,
                }}
              >
                Bu Ay Toplam Harcama
              </Text>

              <Text
                style={{
                  fontSize: 36,
                  fontWeight: "900",
                  color: "#FFFFFF",
                  marginBottom: 8,
                }}
              >
                {formatCurrency(summary.monthTotal)}
              </Text>

              <Text
                style={{
                  fontSize: 14,
                  color: "#DBEAFE",
                  lineHeight: 20,
                }}
              >
                Bu ay ortak alana girilen toplam harcama.
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                gap: 12,
                marginBottom: 24,
              }}
            >
              <View
                style={{
                  flex: 1,
                  padding: 16,
                  borderRadius: 20,
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: "#BFDBFE",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: "#6B7280",
                    fontWeight: "800",
                    marginBottom: 6,
                  }}
                >
                  Bugün
                </Text>

                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "900",
                    color: "#1E3A8A",
                  }}
                >
                  {formatCurrency(summary.todayTotal)}
                </Text>
              </View>

              <View
                style={{
                  flex: 1,
                  padding: 16,
                  borderRadius: 20,
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: "#BFDBFE",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: "#6B7280",
                    fontWeight: "800",
                    marginBottom: 6,
                  }}
                >
                  Kişi Sayısı
                </Text>

                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "900",
                    color: "#1E3A8A",
                  }}
                >
                  {summary.userTotals.length}
                </Text>
              </View>
            </View>

            <Text
              style={{
                fontSize: 20,
                fontWeight: "900",
                color: "#111827",
                marginBottom: 12,
              }}
            >
              Kişi Bazlı Toplamlar
            </Text>

            <View
              style={{
                marginBottom: 24,
                padding: 18,
                borderRadius: 24,
                backgroundColor: "#FFFFFF",
                borderWidth: 1,
                borderColor: "#BFDBFE",
              }}
            >
              {summary.userTotals.length === 0 ? (
                <Text style={{ color: "#6B7280", fontWeight: "700" }}>
                  Henüz harcama yok.
                </Text>
              ) : (
                summary.userTotals.map((userTotal) => (
                  <View
                    key={userTotal.userId}
                    style={{
                      padding: 14,
                      borderRadius: 18,
                      backgroundColor: "#F5FBFF",
                      borderWidth: 1,
                      borderColor: "#DBEAFE",
                      marginBottom: 10,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "800",
                        color: "#111827",
                      }}
                    >
                      {userTotal.fullName}
                    </Text>

                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "900",
                        color: "#5B21B6",
                      }}
                    >
                      {formatCurrency(userTotal.total)}
                    </Text>
                  </View>
                ))
              )}
            </View>

            <Text
              style={{
                fontSize: 20,
                fontWeight: "900",
                color: "#111827",
                marginBottom: 12,
              }}
            >
              Son 5 Harcama
            </Text>
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
                borderRadius: 20,
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
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "900",
                      color: "#111827",
                    }}
                  >
                    {item.categories?.name ?? "Kategori yok"}
                  </Text>

                  {item.description && (
                    <Text
                      style={{
                        marginTop: 4,
                        fontSize: 14,
                        color: "#111827",
                        fontWeight: "600",
                      }}
                    >
                      {item.description}
                    </Text>
                  )}

                  {item.entry_type === "template" &&
                    item.quantity &&
                    item.unit_price && (
                      <Text
                        style={{
                          marginTop: 4,
                          fontSize: 13,
                          color: "#5B21B6",
                          fontWeight: "700",
                        }}
                      >
                        {item.quantity} adet × ₺
                        {Number(item.unit_price).toFixed(2)}
                      </Text>
                    )}

                  <Text
                    style={{
                      marginTop: 4,
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
              Ana sayfadaki son harcamayı hızlıca düzenle.
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
