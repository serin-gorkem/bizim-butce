import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { AppScreen } from "../../components/AppScreen";
import { getCurrentUserHousehold } from "../../src/lib/household";
import { supabase } from "../../src/lib/supabase";
import { showAlert } from "../../src/utils/appAlert";
import { parsePositiveNumber } from "../../src/utils/parsers";

const SCREEN_BG = "#fcedd9";
const TEXT_DARK = "#3B2414";
const TEXT_MUTED = "#7C5A3A";
const PRIMARY_BLUE = "#2563EB";
const WARM_BROWN = "#92400E";
const CARD_BG = "#FFF9F0";
const SOFT_YELLOW = "#FDE68A";
const INPUT_BORDER = "#FCD34D";

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

  function sanitizeDecimalInput(value: string) {
    return value
      .replace(",", ".")
      .replace(/[^0-9.]/g, "")
      .replace(/(\..*)\./g, "$1");
  }
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
      showAlert("Geçersiz tutar", "Lütfen geçerli bir tutar gir.");
      return;
    }

    if (!selectedCategory) {
      showAlert("Kategori seçilmedi", "Lütfen bir kategori seç.");
      return;
    }

    setIsSaving(true);

    try {
      const membership = await getCurrentUserHousehold();

      if (!membership) {
        showAlert(
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
        showAlert("Oturum hatası", "Kullanıcı bilgisi alınamadı.");
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
        showAlert("Harcama eklenemedi", error.message);
        return;
      }

      const savedCategoryName = selectedCategory.name;

      setAmount("");
      setDescription("");
      setSelectedCategory(null);

      showAlert(
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
      showAlert(
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
      showAlert("Template seçilmedi", "Lütfen bir hazır harcama seç.");
      return;
    }

    const parsedQuantity = parsePositiveNumber(templateQuantity);

    if (!parsedQuantity) {
      showAlert("Geçersiz adet", "Lütfen geçerli bir adet gir.");
      return;
    }

    const unitPrice = Number(selectedTemplate.default_unit_price);

    if (Number.isNaN(unitPrice) || unitPrice <= 0) {
      showAlert("Geçersiz fiyat", "Template birim fiyatı geçersiz.");
      return;
    }

    const totalAmount = parsedQuantity * unitPrice;

    setIsSaving(true);

    try {
      const membership = await getCurrentUserHousehold();

      if (!membership) {
        showAlert(
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
        showAlert("Oturum hatası", "Kullanıcı bilgisi alınamadı.");
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
        showAlert("Template harcama eklenemedi", error.message);
        return;
      }

      const savedTemplateName = selectedTemplate.name;

      closeTemplateModal();

      showAlert(
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
      showAlert(
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
            Ekle ekranı yükleniyor...
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
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 24,
          paddingBottom: 48,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
                width: 64,
                height: 64,
                borderRadius: 22,
                backgroundColor: "#FFE8B8",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: SOFT_YELLOW,
              }}
            >
              <Text style={{ fontSize: 34 }}>🌺</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 30,
                  fontWeight: "900",
                  color: TEXT_DARK,
                  marginBottom: 4,
                }}
              >
                Harcama Ekle
              </Text>

              <Text
                style={{
                  fontSize: 15,
                  lineHeight: 21,
                  color: TEXT_MUTED,
                  fontWeight: "600",
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
              borderRadius: 26,
              backgroundColor: CARD_BG,
              borderWidth: 1,
              borderColor: SOFT_YELLOW,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "900",
                color: TEXT_DARK,
                marginBottom: 4,
              }}
            >
              Hazır Harcamalar
            </Text>

            <Text
              style={{
                fontSize: 14,
                color: TEXT_MUTED,
                marginBottom: 14,
                fontWeight: "600",
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
                    minHeight: 90,
                    borderRadius: 20,
                    backgroundColor: "#FFFFFF",
                    borderWidth: 1,
                    borderColor: INPUT_BORDER,
                    justifyContent: "center",
                    padding: 14,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "900",
                      color: TEXT_DARK,
                    }}
                  >
                    {template.name}
                  </Text>

                  {template.description && (
                    <Text
                      style={{
                        marginTop: 4,
                        fontSize: 13,
                        color: TEXT_MUTED,
                        fontWeight: "600",
                      }}
                    >
                      {template.description}
                    </Text>
                  )}

                  <Text
                    style={{
                      marginTop: 6,
                      fontSize: 13,
                      color: WARM_BROWN,
                      fontWeight: "900",
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
            borderRadius: 26,
            backgroundColor: CARD_BG,
            borderWidth: 1,
            borderColor: SOFT_YELLOW,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "900",
              color: TEXT_DARK,
              marginBottom: 4,
            }}
          >
            Manuel Harcama
          </Text>

          <Text
            style={{
              fontSize: 14,
              color: TEXT_MUTED,
              marginBottom: 18,
              fontWeight: "600",
            }}
          >
            Tutarı yaz, kategori seç ve kaydet.
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
            value={amount}
            onChangeText={(value) => setAmount(sanitizeDecimalInput(value))}
            placeholder="Örn: 350"
            placeholderTextColor="#B08A63"
            keyboardType="decimal-pad"
            inputMode="decimal"
            style={{
              height: 56,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: INPUT_BORDER,
              backgroundColor: "#FFFFFF",
              paddingHorizontal: 16,
              fontSize: 22,
              fontWeight: "900",
              color: TEXT_DARK,
              marginBottom: 20,
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
            value={description}
            onChangeText={setDescription}
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
              marginBottom: 20,
            }}
          />

          <Text
            style={{
              fontSize: 14,
              fontWeight: "900",
              color: TEXT_DARK,
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
                    backgroundColor: isSelected ? PRIMARY_BLUE : "#FFFFFF",
                    borderWidth: 1,
                    borderColor: isSelected ? PRIMARY_BLUE : INPUT_BORDER,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
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

          {selectedCategory && (
            <View
              style={{
                marginTop: 16,
                alignSelf: "flex-start",
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: "#FFE8B8",
              }}
            >
              <Text
                style={{
                  color: WARM_BROWN,
                  fontSize: 13,
                  fontWeight: "900",
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
              backgroundColor: isSaving ? "#93C5FD" : PRIMARY_BLUE,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 24,
              shadowColor: PRIMARY_BLUE,
              shadowOpacity: 0.22,
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
              <Text style={{ fontSize: 36 }}>🐚</Text>
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
              {selectedTemplate?.name ?? "Hazır Harcama"}
            </Text>

            {selectedTemplate?.description && (
              <Text
                style={{
                  fontSize: 15,
                  color: TEXT_MUTED,
                  textAlign: "center",
                  marginBottom: 18,
                  fontWeight: "600",
                }}
              >
                {selectedTemplate.description}
              </Text>
            )}

            <Text
              style={{
                fontSize: 14,
                fontWeight: "900",
                color: TEXT_DARK,
                marginBottom: 8,
              }}
            >
              Adet
            </Text>

            <TextInput
              value={templateQuantity}
              onChangeText={(value) =>
                setTemplateQuantity(sanitizeDecimalInput(value))
              }
              keyboardType="decimal-pad"
              inputMode="decimal"
              placeholder="Örn: 2"
              placeholderTextColor="#B08A63"
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

            <View
              style={{
                padding: 18,
                borderRadius: 20,
                backgroundColor: "#FFFFFF",
                borderWidth: 1,
                borderColor: INPUT_BORDER,
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  color: TEXT_MUTED,
                  fontSize: 14,
                  fontWeight: "800",
                  marginBottom: 4,
                }}
              >
                Toplam
              </Text>

              <Text
                style={{
                  color: WARM_BROWN,
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
                {isSaving ? "Ekleniyor..." : "Kaydet"}
              </Text>
            </Pressable>

            <Pressable
              onPress={closeTemplateModal}
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
