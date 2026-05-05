import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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

const homeImage = require("../../assets/images/Home.png");

const SCREEN_BG = "#fcedd9";
const TEXT_DARK = "#3B2414";
const TEXT_MUTED = "#7C5A3A";
const PRIMARY_BLUE = "#2563EB";
const WARM_BROWN = "#92400E";
const CARD_BG = "#FFF9F0";
const SOFT_YELLOW = "#FDE68A";

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
  memberCount: number;
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

function calculateSummary(
  monthExpenses: Expense[],
  memberCount: number,
): HomeSummary {
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
    memberCount,
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
    memberCount: 0,
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

      const { count: memberCount, error: memberCountError } = await supabase
        .from("household_members")
        .select("id", { count: "exact", head: true })
        .eq("household_id", membership.household_id);

      if (memberCountError) {
        setErrorMessage(memberCountError.message);
        return;
      }

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

      setSummary(calculateSummary(normalizedMonthExpenses, memberCount ?? 0));

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
          borderRadius: 20,
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
      <SafeAreaView style={{ flex: 1, backgroundColor: SCREEN_BG }}>
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
            Ana sayfa yükleniyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: SCREEN_BG }}>
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: SCREEN_BG }}>
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
                alignItems: "center",
                justifyContent: "center",
                height: 185,
                marginTop: -8,
                marginBottom: 2,
                overflow: "visible",
              }}
            >
              <Image
                source={homeImage}
                style={{
                  width: 330,
                  height: 270,
                }}
                resizeMode="contain"
              />
            </View>

            <View
              style={{
                alignItems: "center",
                marginBottom: 18,
              }}
            >
              <Text
                style={{
                  fontSize: 34,
                  fontWeight: "900",
                  color: TEXT_DARK,
                  textAlign: "center",
                  marginBottom: 6,
                }}
              >
                BizimBütçe
              </Text>

              <Text
                style={{
                  fontSize: 15,
                  lineHeight: 21,
                  color: TEXT_MUTED,
                  textAlign: "center",
                }}
              >
                {householdName} ortak harcama alanı.
              </Text>
            </View>

            <View
              style={{
                padding: 22,
                borderRadius: 28,
                backgroundColor: PRIMARY_BLUE,
                marginBottom: 16,
                shadowColor: PRIMARY_BLUE,
                shadowOpacity: 0.22,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 10 },
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "900",
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
                  fontWeight: "600",
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
                  borderRadius: 22,
                  backgroundColor: CARD_BG,
                  borderWidth: 1,
                  borderColor: SOFT_YELLOW,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: TEXT_MUTED,
                    fontWeight: "900",
                    marginBottom: 6,
                  }}
                >
                  Bugün
                </Text>

                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "900",
                    color: WARM_BROWN,
                  }}
                >
                  {formatCurrency(summary.todayTotal)}
                </Text>
              </View>

              <View
                style={{
                  flex: 1,
                  padding: 16,
                  borderRadius: 22,
                  backgroundColor: CARD_BG,
                  borderWidth: 1,
                  borderColor: SOFT_YELLOW,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: TEXT_MUTED,
                    fontWeight: "900",
                    marginBottom: 6,
                  }}
                >
                  Kişi Sayısı
                </Text>

                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "900",
                    color: WARM_BROWN,
                  }}
                >
                  {summary.memberCount}
                </Text>
              </View>
            </View>

            <Text
              style={{
                fontSize: 20,
                fontWeight: "900",
                color: TEXT_DARK,
                marginBottom: 12,
              }}
            >
              Kişi Bazlı Toplamlar
            </Text>

            <View
              style={{
                marginBottom: 24,
                padding: 18,
                borderRadius: 26,
                backgroundColor: CARD_BG,
                borderWidth: 1,
                borderColor: SOFT_YELLOW,
              }}
            >
              {summary.userTotals.length === 0 ? (
                <Text style={{ color: TEXT_MUTED, fontWeight: "800" }}>
                  Henüz harcama yok.
                </Text>
              ) : (
                summary.userTotals.map((userTotal) => (
                  <View
                    key={userTotal.userId}
                    style={{
                      padding: 14,
                      borderRadius: 20,
                      backgroundColor: "#FFFFFF",
                      borderWidth: 1,
                      borderColor: "#FCD34D",
                      marginBottom: 10,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "900",
                        color: TEXT_DARK,
                      }}
                    >
                      {userTotal.fullName}
                    </Text>

                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "900",
                        color: WARM_BROWN,
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
                color: TEXT_DARK,
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
          <Swipeable renderRightActions={() => renderRightActions(item)}>
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
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "900",
                      color: TEXT_DARK,
                    }}
                  >
                    {item.categories?.name ?? "Kategori yok"}
                  </Text>

                  {item.description && (
                    <Text
                      style={{
                        marginTop: 4,
                        fontSize: 14,
                        color: TEXT_DARK,
                        fontWeight: "700",
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
                          color: "#BE185D",
                          fontWeight: "800",
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
            backgroundColor: "rgba(59,36,20,0.45)",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              width: "100%",
              borderRadius: 28,
              backgroundColor: CARD_BG,
              padding: 24,
              borderWidth: 1,
              borderColor: SOFT_YELLOW,
            }}
          >
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
              }}
            >
              Ana sayfadaki son harcamayı hızlıca düzenle.
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
                borderColor: "#FCD34D",
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
                borderColor: "#FCD34D",
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
                      borderColor: isSelected ? PRIMARY_BLUE : "#FCD34D",
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
                borderColor: "#FCD34D",
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
    </SafeAreaView>
  );
}
