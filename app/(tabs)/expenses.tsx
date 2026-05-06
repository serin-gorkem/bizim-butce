import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppScreen } from "../../components/AppScreen";
import { ExpenseSwipeActions } from "../../components/ExpenseSwipeActions";

import { guardActiveHousehold } from "@/lib/household";
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

type MonthlySummary = {
  id: string;
  household_id: string;
  period_year: number;
  period_month: number;
  total_amount: number | string;
  expense_count: number;
  created_at: string;
};

const MONTH_NAMES_TR = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

function formatMonthTitle(year: number, month: number) {
  const monthName = MONTH_NAMES_TR[month - 1] ?? "Bilinmeyen Ay";

  return `${monthName} ${year}`;
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

export default function ExpensesScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");

  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  const [monthlySummaries, setMonthlySummaries] = useState<MonthlySummary[]>(
    [],
  );
  const [isSummariesModalVisible, setIsSummariesModalVisible] = useState(false);
  const [isSummariesLoading, setIsSummariesLoading] = useState(false);
  const [summariesErrorMessage, setSummariesErrorMessage] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadMonthlySummaries() {
    setIsSummariesLoading(true);
    setSummariesErrorMessage("");

    try {
      const membership = await guardActiveHousehold();

      if (!membership) {
        setSummariesErrorMessage("Ortak alan bulunamadı.");
        return;
      }

      const { data, error } = await supabase
        .from("monthly_expense_summaries")
        .select(
          `
        id,
        household_id,
        period_year,
        period_month,
        total_amount,
        expense_count,
        created_at
      `,
        )
        .eq("household_id", membership.household_id)
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false });

      if (error) {
        setSummariesErrorMessage(error.message);
        return;
      }

      setMonthlySummaries((data ?? []) as MonthlySummary[]);
    } catch (error) {
      setSummariesErrorMessage(
        error instanceof Error ? error.message : "Aylık özetler yüklenemedi.",
      );
    } finally {
      setIsSummariesLoading(false);
    }
  }

  async function openMonthlySummariesModal() {
    setIsSummariesModalVisible(true);
    await loadMonthlySummaries();
  }

  function closeMonthlySummariesModal() {
    setIsSummariesModalVisible(false);
  }

  function getCurrentMonthRange() {
    const now = new Date();

    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return {
      startDate: start.toISOString(),
      endDate: nextMonth.toISOString(),
    };
  }
  function getPreviousMonth() {
    const now = new Date();

    const previousMonthDate = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );

    return {
      year: previousMonthDate.getFullYear(),
      month: previousMonthDate.getMonth() + 1,
    };
  }

  async function loadExpenses() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const membership = await guardActiveHousehold();

      if (!membership) {
        setErrorMessage("Ortak alan bulunamadı.");
        return;
      }

      const previousMonth = getPreviousMonth();

      const { error: closeMonthError } = await supabase.rpc(
        "close_monthly_expenses",
        {
          target_year: previousMonth.year,
          target_month: previousMonth.month,
        },
      );

      if (closeMonthError) {
        setErrorMessage(closeMonthError.message);
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

      const { startDate, endDate } = getCurrentMonthRange();

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
        .gte("spent_at", startDate)
        .lt("spent_at", endDate)
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
  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const matchesCategory =
        !filterCategoryId || expense.category_id === filterCategoryId;

      const expenseDate = expense.spent_at.slice(0, 10);

      const matchesStartDate =
        !filterStartDate || expenseDate >= filterStartDate;

      const matchesEndDate = !filterEndDate || expenseDate <= filterEndDate;

      return matchesCategory && matchesStartDate && matchesEndDate;
    });
  }, [expenses, filterCategoryId, filterStartDate, filterEndDate]);

  const hasActiveFilters =
    !!filterCategoryId || !!filterStartDate || !!filterEndDate;

  function clearFilters() {
    setFilterCategoryId("");
    setFilterStartDate("");
    setFilterEndDate("");
  }

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
        data={filteredExpenses}
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
                    Bu ay ortak alana girilen harcamalar.
                  </Text>

                  <Pressable
                    onPress={openMonthlySummariesModal}
                    style={{
                      marginTop: 14,
                      alignSelf: "flex-start",
                      paddingHorizontal: 14,
                      height: 40,
                      borderRadius: 14,
                      backgroundColor: PRIMARY_BLUE,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: 13,
                        fontWeight: "900",
                      }}
                    >
                      Aylık Özetler
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
            <View
              style={{
                padding: 18,
                borderRadius: 26,
                backgroundColor: CARD_BG,
                borderWidth: 1,
                borderColor: SOFT_YELLOW,
                marginBottom: 20,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 14,
                  gap: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: "900",
                      color: TEXT_DARK,
                      marginBottom: 4,
                    }}
                  >
                    Filtrele
                  </Text>

                  <Text
                    style={{
                      fontSize: 13,
                      color: TEXT_MUTED,
                      fontWeight: "700",
                    }}
                  >
                    Kategoriye ve tarihe göre harcamaları süz.
                  </Text>
                </View>

                {hasActiveFilters && (
                  <Pressable
                    onPress={clearFilters}
                    style={{
                      paddingHorizontal: 12,
                      height: 38,
                      borderRadius: 14,
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
                        fontSize: 13,
                        fontWeight: "900",
                      }}
                    >
                      Temizle
                    </Text>
                  </Pressable>
                )}
              </View>

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
                  marginBottom: 16,
                }}
              >
                <Pressable
                  onPress={() => setFilterCategoryId("")}
                  style={{
                    paddingHorizontal: 12,
                    height: 40,
                    borderRadius: 14,
                    backgroundColor: !filterCategoryId
                      ? PRIMARY_BLUE
                      : "#FFFFFF",
                    borderWidth: 1,
                    borderColor: !filterCategoryId
                      ? PRIMARY_BLUE
                      : INPUT_BORDER,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "900",
                      color: !filterCategoryId ? "#FFFFFF" : WARM_BROWN,
                    }}
                  >
                    Tümü
                  </Text>
                </Pressable>

                {categories.map((category) => {
                  const isSelected = filterCategoryId === category.id;

                  return (
                    <Pressable
                      key={category.id}
                      onPress={() => setFilterCategoryId(category.id)}
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

              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "900",
                      color: TEXT_DARK,
                      marginBottom: 8,
                    }}
                  >
                    Başlangıç
                  </Text>

                  <TextInput
                    value={filterStartDate}
                    onChangeText={setFilterStartDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#B08A63"
                    autoCapitalize="none"
                    style={{
                      height: 48,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: INPUT_BORDER,
                      backgroundColor: "#FFFFFF",
                      paddingHorizontal: 12,
                      fontSize: 14,
                      fontWeight: "800",
                      color: TEXT_DARK,
                    }}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "900",
                      color: TEXT_DARK,
                      marginBottom: 8,
                    }}
                  >
                    Bitiş
                  </Text>

                  <TextInput
                    value={filterEndDate}
                    onChangeText={setFilterEndDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#B08A63"
                    autoCapitalize="none"
                    style={{
                      height: 48,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: INPUT_BORDER,
                      backgroundColor: "#FFFFFF",
                      paddingHorizontal: 12,
                      fontSize: 14,
                      fontWeight: "800",
                      color: TEXT_DARK,
                    }}
                  />
                </View>
              </View>

              {hasActiveFilters && (
                <Text
                  style={{
                    marginTop: 14,
                    fontSize: 13,
                    color: TEXT_MUTED,
                    fontWeight: "800",
                  }}
                >
                  {filteredExpenses.length} harcama gösteriliyor.
                </Text>
              )}
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
              {hasActiveFilters
                ? "Filtrelere uygun harcama bulunamadı."
                : "Bu ay henüz harcama eklenmedi."}
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
      <Modal
        visible={isSummariesModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeMonthlySummariesModal}
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
              maxWidth: 430,
              maxHeight: "82%",
              borderRadius: 28,
              backgroundColor: CARD_BG,
              padding: 22,
              borderWidth: 1,
              borderColor: SOFT_YELLOW,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 18,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 26,
                    fontWeight: "900",
                    color: TEXT_DARK,
                    marginBottom: 4,
                  }}
                >
                  Aylık Özetler
                </Text>

                <Text
                  style={{
                    fontSize: 14,
                    color: TEXT_MUTED,
                    fontWeight: "700",
                  }}
                >
                  Kapanan ayların toplam harcamaları.
                </Text>
              </View>

              <Pressable
                onPress={closeMonthlySummariesModal}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 14,
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
                    fontSize: 18,
                    fontWeight: "900",
                  }}
                >
                  ×
                </Text>
              </Pressable>
            </View>

            {isSummariesLoading ? (
              <View
                style={{
                  paddingVertical: 34,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                }}
              >
                <ActivityIndicator color={PRIMARY_BLUE} />

                <Text
                  style={{
                    color: TEXT_MUTED,
                    fontWeight: "800",
                  }}
                >
                  Aylık özetler yükleniyor...
                </Text>
              </View>
            ) : summariesErrorMessage ? (
              <View
                style={{
                  padding: 18,
                  borderRadius: 20,
                  backgroundColor: "#FFF1F2",
                  borderWidth: 1,
                  borderColor: "#FCA5A5",
                }}
              >
                <Text
                  style={{
                    color: "#DC2626",
                    fontWeight: "900",
                    textAlign: "center",
                  }}
                >
                  {summariesErrorMessage}
                </Text>
              </View>
            ) : monthlySummaries.length === 0 ? (
              <View
                style={{
                  padding: 22,
                  borderRadius: 22,
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: INPUT_BORDER,
                }}
              >
                <Text
                  style={{
                    color: TEXT_MUTED,
                    textAlign: "center",
                    fontWeight: "800",
                  }}
                >
                  Henüz kapanmış ay özeti bulunmuyor.
                </Text>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingBottom: 4,
                }}
              >
                {monthlySummaries.map((summary) => {
                  const totalAmount = Number(summary.total_amount);

                  return (
                    <View
                      key={summary.id}
                      style={{
                        padding: 16,
                        borderRadius: 22,
                        backgroundColor: "#FFFFFF",
                        borderWidth: 1,
                        borderColor: INPUT_BORDER,
                        marginBottom: 10,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          gap: 12,
                          alignItems: "flex-start",
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 20,
                              fontWeight: "900",
                              color: TEXT_DARK,
                              marginBottom: 8,
                            }}
                          >
                            {formatMonthTitle(
                              summary.period_year,
                              summary.period_month,
                            )}
                          </Text>

                          <View
                            style={{
                              alignSelf: "flex-start",
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 999,
                              backgroundColor: "#FFE8B8",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: "900",
                                color: WARM_BROWN,
                              }}
                            >
                              {summary.expense_count} harcama
                            </Text>
                          </View>
                        </View>

                        <Text
                          style={{
                            fontSize: 17,
                            fontWeight: "900",
                            color: WARM_BROWN,
                            textAlign: "right",
                          }}
                        >
                          {formatCurrency(totalAmount)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}
