import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { getCurrentUserHousehold } from "../../src/lib/household";
import { supabase } from "../../src/lib/supabase";
import { parsePositiveNumber } from "../../src/utils/parsers";

type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
};

type ExpenseTemplate = {
  id: string;
  household_id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  template_type: string;
  default_unit_price: number | string;
  is_active: boolean;
};

export default function AddExpenseScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<ExpenseTemplate[]>([]);

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );

  const [selectedTemplate, setSelectedTemplate] =
    useState<ExpenseTemplate | null>(null);
  const [templateQuantity, setTemplateQuantity] = useState("1");
  const [isTemplateModalVisible, setIsTemplateModalVisible] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadAddScreenData() {
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

      const { data: templatesData, error: templatesError } = await supabase
        .from("expense_templates")
        .select(
          "id, household_id, category_id, name, slug, description, template_type, default_unit_price, is_active",
        )
        .eq("household_id", membership.household_id)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (templatesError) {
        setErrorMessage(templatesError.message);
        return;
      }

      setTemplates((templatesData ?? []) as ExpenseTemplate[]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Ekle ekranı yüklenemedi.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadAddScreenData();
    }, []),
  );

  function openTemplateModal(template: ExpenseTemplate) {
    setSelectedTemplate(template);
    setTemplateQuantity("1");
    setIsTemplateModalVisible(true);
  }

  function closeTemplateModal() {
    setIsTemplateModalVisible(false);
    setSelectedTemplate(null);
    setTemplateQuantity("1");
  }

  async function handleCreateExpense() {
    const parsedAmount = parsePositiveNumber(amount);

    if (!parsedAmount) {
      Alert.alert("Geçersiz tutar", "Lütfen geçerli bir tutar gir.");
      return;
    }

    if (!selectedCategory) {
      Alert.alert("Kategori seçilmedi", "Lütfen bir kategori seç.");
      return;
    }

    setIsSaving(true);

    try {
      const membership = await getCurrentUserHousehold();

      if (!membership) {
        Alert.alert(
          "Ortak alan bulunamadı",
          "Önce bir ortak alana katılmalısın.",
        );
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert("Oturum hatası", "Kullanıcı bilgisi alınamadı.");
        return;
      }

      const cleanedDescription = description.trim();

      const expensePayload = {
        household_id: membership.household_id,
        user_id: user.id,
        category_id: selectedCategory.id,
        amount: parsedAmount,
        description: cleanedDescription || null,
        entry_type: "manual",
        spent_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("expenses").insert(expensePayload);

      if (error) {
        Alert.alert("Harcama eklenemedi", error.message);
        return;
      }

      const savedCategoryName = selectedCategory.name;

      setAmount("");
      setDescription("");
      setSelectedCategory(null);

      Alert.alert(
        "Harcama eklendi",
        `${savedCategoryName} harcaması kaydedildi. Harcamaları görmek ister misin?`,
        [
          {
            text: "Hayır",
            style: "cancel",
          },
          {
            text: "Harcamaları Gör",
            onPress: () => router.push("/(tabs)/expenses"),
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        "Beklenmeyen hata",
        error instanceof Error
          ? error.message
          : "Harcama eklenirken hata oluştu.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateTemplateExpense() {
    if (!selectedTemplate) {
      Alert.alert("Template seçilmedi", "Lütfen bir hazır harcama seç.");
      return;
    }

    const parsedQuantity = parsePositiveNumber(templateQuantity);

    if (!parsedQuantity) {
      Alert.alert("Geçersiz adet", "Lütfen geçerli bir adet gir.");
      return;
    }

    const unitPrice = Number(selectedTemplate.default_unit_price);

    if (Number.isNaN(unitPrice) || unitPrice <= 0) {
      Alert.alert("Geçersiz fiyat", "Template birim fiyatı geçersiz.");
      return;
    }

    const totalAmount = parsedQuantity * unitPrice;

    setIsSaving(true);

    try {
      const membership = await getCurrentUserHousehold();

      if (!membership) {
        Alert.alert(
          "Ortak alan bulunamadı",
          "Önce bir ortak alana katılmalısın.",
        );
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert("Oturum hatası", "Kullanıcı bilgisi alınamadı.");
        return;
      }

      const expensePayload = {
        household_id: membership.household_id,
        user_id: user.id,
        category_id: selectedTemplate.category_id,
        template_id: selectedTemplate.id,
        amount: totalAmount,
        description: selectedTemplate.description,
        entry_type: "template",
        quantity: parsedQuantity,
        unit_price: unitPrice,
        spent_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("expenses").insert(expensePayload);

      if (error) {
        Alert.alert("Template harcama eklenemedi", error.message);
        return;
      }

      const savedTemplateName = selectedTemplate.name;

      closeTemplateModal();

      Alert.alert(
        "Harcama eklendi",
        `${savedTemplateName} harcaması kaydedildi. Harcamaları görmek ister misin?`,
        [
          {
            text: "Hayır",
            style: "cancel",
          },
          {
            text: "Harcamaları Gör",
            onPress: () => router.push("/(tabs)/expenses"),
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        "Beklenmeyen hata",
        error instanceof Error
          ? error.message
          : "Template harcama eklenirken hata oluştu.",
      );
    } finally {
      setIsSaving(false);
    }
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
            Ekle ekranı yükleniyor...
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
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 24,
          paddingBottom: 48,
        }}
        keyboardShouldPersistTaps="handled"
      >
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
                width: 64,
                height: 64,
                borderRadius: 22,
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
                  fontSize: 30,
                  fontWeight: "900",
                  color: "#111827",
                  marginBottom: 4,
                }}
              >
                Harcama Ekle
              </Text>

              <Text
                style={{
                  fontSize: 15,
                  lineHeight: 21,
                  color: "#4B5563",
                }}
              >
                Hazır harcama seçebilir veya manuel harcama ekleyebilirsin.
              </Text>
            </View>
          </View>
        </View>

        {templates.length > 0 && (
          <View
            style={{
              marginBottom: 28,
              padding: 18,
              borderRadius: 24,
              backgroundColor: "#FFFFFF",
              borderWidth: 1,
              borderColor: "#BFDBFE",
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "900",
                color: "#111827",
                marginBottom: 4,
              }}
            >
              Hazır Harcamalar
            </Text>

            <Text
              style={{
                fontSize: 14,
                color: "#6B7280",
                marginBottom: 14,
              }}
            >
              Tek dokunuşla sık kullanılan harcamaları ekle.
            </Text>

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              {templates.map((template) => (
                <Pressable
                  key={template.id}
                  onPress={() => openTemplateModal(template)}
                  disabled={isSaving}
                  style={{
                    width: "47%",
                    minHeight: 86,
                    borderRadius: 18,
                    backgroundColor: "#F5FBFF",
                    borderWidth: 1,
                    borderColor: "#DBEAFE",
                    justifyContent: "center",
                    padding: 14,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "900",
                      color: "#1E3A8A",
                    }}
                  >
                    {template.name}
                  </Text>

                  {template.description && (
                    <Text
                      style={{
                        marginTop: 4,
                        fontSize: 13,
                        color: "#6B7280",
                      }}
                    >
                      {template.description}
                    </Text>
                  )}

                  <Text
                    style={{
                      marginTop: 6,
                      fontSize: 13,
                      color: "#5B21B6",
                      fontWeight: "800",
                    }}
                  >
                    Birim: ₺{Number(template.default_unit_price).toFixed(2)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View
          style={{
            padding: 20,
            borderRadius: 24,
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            borderColor: "#BFDBFE",
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "900",
              color: "#111827",
              marginBottom: 4,
            }}
          >
            Manuel Harcama
          </Text>

          <Text
            style={{
              fontSize: 14,
              color: "#6B7280",
              marginBottom: 18,
            }}
          >
            Tutarı yaz, kategori seç ve kaydet.
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
            value={amount}
            onChangeText={setAmount}
            placeholder="Örn: 350"
            keyboardType="decimal-pad"
            style={{
              height: 56,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: "#D1D5DB",
              backgroundColor: "#F9FAFB",
              paddingHorizontal: 16,
              fontSize: 22,
              fontWeight: "800",
              marginBottom: 20,
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
            value={description}
            onChangeText={setDescription}
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
              marginBottom: 20,
            }}
          />

          <Text
            style={{
              fontSize: 14,
              fontWeight: "800",
              color: "#111827",
              marginBottom: 10,
            }}
          >
            Kategori
          </Text>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            {categories.map((category) => {
              const isSelected = selectedCategory?.id === category.id;

              return (
                <Pressable
                  key={category.id}
                  onPress={() => setSelectedCategory(category)}
                  disabled={isSaving}
                  style={{
                    width: "47%",
                    height: 56,
                    borderRadius: 18,
                    backgroundColor: isSelected ? "#2563EB" : "#F5FBFF",
                    borderWidth: 1,
                    borderColor: isSelected ? "#2563EB" : "#DBEAFE",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
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

          {selectedCategory && (
            <View
              style={{
                marginTop: 16,
                alignSelf: "flex-start",
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: "#EDE9FE",
              }}
            >
              <Text
                style={{
                  color: "#5B21B6",
                  fontSize: 13,
                  fontWeight: "800",
                }}
              >
                Seçili kategori: {selectedCategory.name}
              </Text>
            </View>
          )}

          <Pressable
            onPress={handleCreateExpense}
            disabled={isSaving}
            style={{
              height: 58,
              borderRadius: 20,
              backgroundColor: isSaving ? "#93C5FD" : "#2563EB",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 24,
              shadowColor: "#2563EB",
              shadowOpacity: 0.2,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 8 },
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 16,
                fontWeight: "900",
              }}
            >
              {isSaving ? "Ekleniyor..." : "Harcama Ekle"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={isTemplateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isSaving) {
            closeTemplateModal();
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
            <View
              style={{
                alignSelf: "center",
                width: 76,
                height: 76,
                borderRadius: 28,
                backgroundColor: "#DBEAFE",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 18,
                borderWidth: 4,
                borderColor: "#FFFFFF",
              }}
            >
              <Text
                style={{
                  color: "#2563EB",
                  fontSize: 30,
                  fontWeight: "900",
                }}
              >
                ₺
              </Text>
            </View>

            <Text
              style={{
                fontSize: 26,
                fontWeight: "900",
                color: "#111827",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              {selectedTemplate?.name ?? "Hazır Harcama"}
            </Text>

            {selectedTemplate?.description && (
              <Text
                style={{
                  fontSize: 15,
                  color: "#6B7280",
                  textAlign: "center",
                  marginBottom: 18,
                }}
              >
                {selectedTemplate.description}
              </Text>
            )}

            <Text
              style={{
                fontSize: 14,
                fontWeight: "800",
                color: "#111827",
                marginBottom: 8,
              }}
            >
              Adet
            </Text>

            <TextInput
              value={templateQuantity}
              onChangeText={setTemplateQuantity}
              keyboardType="decimal-pad"
              placeholder="Örn: 2"
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

            <View
              style={{
                padding: 18,
                borderRadius: 20,
                backgroundColor: "#F5FBFF",
                borderWidth: 1,
                borderColor: "#DBEAFE",
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  color: "#6B7280",
                  fontSize: 14,
                  fontWeight: "700",
                  marginBottom: 4,
                }}
              >
                Toplam
              </Text>

              <Text
                style={{
                  color: "#1E3A8A",
                  fontSize: 28,
                  fontWeight: "900",
                }}
              >
                ₺
                {(
                  (parsePositiveNumber(templateQuantity) ?? 0) *
                  Number(selectedTemplate?.default_unit_price ?? 0)
                ).toFixed(2)}
              </Text>
            </View>

            <Pressable
              onPress={handleCreateTemplateExpense}
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
                {isSaving ? "Ekleniyor..." : "Kaydet"}
              </Text>
            </Pressable>

            <Pressable
              onPress={closeTemplateModal}
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
