import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { getCurrentUserHousehold } from "../../src/lib/household";
import { supabase } from "../../src/lib/supabase";
import { formatCurrency } from "../../src/utils/formatters";
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

type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
};

type ExpenseTemplateRaw = {
  id: string;
  household_id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  template_type: string;
  default_unit_price: number | string;
  is_active: boolean;
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
};

type ExpenseTemplate = {
  id: string;
  household_id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  template_type: string;
  default_unit_price: number;
  is_active: boolean;
  categories: {
    name: string;
    slug: string;
  } | null;
};

function normalizeTemplate(raw: ExpenseTemplateRaw): ExpenseTemplate {
  return {
    id: raw.id,
    household_id: raw.household_id,
    category_id: raw.category_id,
    name: raw.name,
    slug: raw.slug,
    description: raw.description,
    template_type: raw.template_type,
    default_unit_price: Number(raw.default_unit_price),
    is_active: raw.is_active,
    categories: firstOrNull(raw.categories),
  };
}

function createSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function TemplatesScreen() {
  const [templates, setTemplates] = useState<ExpenseTemplate[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [selectedTemplate, setSelectedTemplate] =
    useState<ExpenseTemplate | null>(null);

  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadTemplates() {
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
        .from("expense_templates")
        .select(
          `
          id,
          household_id,
          category_id,
          name,
          slug,
          description,
          template_type,
          default_unit_price,
          is_active,
          categories (
            name,
            slug
          )
        `,
        )
        .eq("household_id", membership.household_id)
        .order("created_at", { ascending: true });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      const normalizedTemplates = ((data ?? []) as ExpenseTemplateRaw[]).map(
        normalizeTemplate,
      );

      setTemplates(normalizedTemplates);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Hazır harcamalar yüklenemedi.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadTemplates();
    }, []),
  );

  function resetForm() {
    setSelectedTemplate(null);
    setName("");
    setDescription("");
    setUnitPrice("");
    setCategoryId("");
  }

  function openCreateModal() {
    resetForm();
    setIsCreateModalVisible(true);
  }

  function openEditModal(template: ExpenseTemplate) {
    setSelectedTemplate(template);
    setName(template.name);
    setDescription(template.description ?? "");
    setUnitPrice(String(template.default_unit_price));
    setCategoryId(template.category_id);
    setIsCreateModalVisible(false);
  }

  function closeModal() {
    setIsCreateModalVisible(false);
    resetForm();
  }

  async function handleCreateTemplate() {
    const cleanedName = name.trim();
    const cleanedDescription = description.trim();
    const parsedUnitPrice = parsePositiveNumber(unitPrice);

    if (!cleanedName) {
      Alert.alert("Eksik bilgi", "Hazır harcama adı boş olamaz.");
      return;
    }

    if (!categoryId) {
      Alert.alert("Kategori seçilmedi", "Lütfen bir kategori seç.");
      return;
    }

    if (!parsedUnitPrice) {
      Alert.alert("Geçersiz fiyat", "Lütfen geçerli bir birim fiyat gir.");
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

      const slugBase = createSlug(cleanedName) || "hazir-harcama";

      const { error } = await supabase.from("expense_templates").insert({
        household_id: membership.household_id,
        category_id: categoryId,
        name: cleanedName,
        slug: `${slugBase}-${Date.now()}`,
        description: cleanedDescription || null,
        template_type: "quantity",
        default_unit_price: parsedUnitPrice,
        is_active: true,
      });

      if (error) {
        Alert.alert("Hazır harcama oluşturulamadı", error.message);
        return;
      }

      closeModal();
      await loadTemplates();

      Alert.alert("Oluşturuldu", "Hazır harcama başarıyla oluşturuldu.");
    } catch (error) {
      Alert.alert(
        "Beklenmeyen hata",
        error instanceof Error
          ? error.message
          : "Hazır harcama oluşturulurken hata oluştu.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateTemplate() {
    if (!selectedTemplate) {
      Alert.alert("Hazır harcama seçilmedi", "Düzenlenecek kayıt bulunamadı.");
      return;
    }

    const cleanedName = name.trim();
    const cleanedDescription = description.trim();
    const parsedUnitPrice = parsePositiveNumber(unitPrice);

    if (!cleanedName) {
      Alert.alert("Eksik bilgi", "Hazır harcama adı boş olamaz.");
      return;
    }

    if (!categoryId) {
      Alert.alert("Kategori seçilmedi", "Lütfen bir kategori seç.");
      return;
    }

    if (!parsedUnitPrice) {
      Alert.alert("Geçersiz fiyat", "Lütfen geçerli bir birim fiyat gir.");
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("expense_templates")
        .update({
          name: cleanedName,
          description: cleanedDescription || null,
          category_id: categoryId,
          default_unit_price: parsedUnitPrice,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedTemplate.id);

      if (error) {
        Alert.alert("Hazır harcama güncellenemedi", error.message);
        return;
      }

      closeModal();
      await loadTemplates();

      Alert.alert("Güncellendi", "Hazır harcama başarıyla güncellendi.");
    } catch (error) {
      Alert.alert(
        "Beklenmeyen hata",
        error instanceof Error
          ? error.message
          : "Hazır harcama güncellenirken hata oluştu.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const isModalVisible = isCreateModalVisible || !!selectedTemplate;
  const isEditing = !!selectedTemplate;

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
            Hazır harcamalar yükleniyor...
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
      <View style={{ flex: 1, padding: 24 }}>
        <View
          style={{
            padding: 20,
            borderRadius: 28,
            backgroundColor: CARD_BG,
            borderWidth: 1,
            borderColor: SOFT_YELLOW,
            marginBottom: 18,
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
              <Text style={{ fontSize: 34 }}>🧺</Text>
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
                Hazır Harcamalar
              </Text>

              <Text
                style={{
                  fontSize: 15,
                  lineHeight: 21,
                  color: TEXT_MUTED,
                  fontWeight: "600",
                }}
              >
                Sık kullanılan harcamaları oluştur, düzenle ve tek dokunuşla
                ekle.
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          onPress={openCreateModal}
          style={{
            height: 56,
            borderRadius: 20,
            backgroundColor: PRIMARY_BLUE,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 18,
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
            Yeni Hazır Harcama Oluştur
          </Text>
        </Pressable>

        <FlatList
          data={templates}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
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
                Henüz hazır harcama yok.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
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

                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "900",
                      color: TEXT_DARK,
                    }}
                  >
                    {item.name}
                  </Text>

                  {item.description && (
                    <Text
                      style={{
                        marginTop: 4,
                        fontSize: 14,
                        color: TEXT_MUTED,
                        fontWeight: "600",
                      }}
                    >
                      {item.description}
                    </Text>
                  )}
                </View>

                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "900",
                    color: WARM_BROWN,
                  }}
                >
                  {formatCurrency(item.default_unit_price)}
                </Text>
              </View>
            </Pressable>
          )}
        />
      </View>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isSaving) {
            closeModal();
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
          <KeyboardAvoidingView
            style={{ width: "100%" }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 0}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
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
                  <Text style={{ fontSize: 36 }}>
                    {isEditing ? "✏️" : "🐚"}
                  </Text>
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
                  {isEditing
                    ? "Hazır Harcama Düzenle"
                    : "Hazır Harcama Oluştur"}
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
                  Ad, açıklama, kategori ve birim fiyat belirle.
                </Text>

                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "900",
                    color: TEXT_DARK,
                    marginBottom: 8,
                  }}
                >
                  Ad
                </Text>

                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Örn: Sigara"
                  placeholderTextColor="#B08A63"
                  style={{
                    height: 54,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: INPUT_BORDER,
                    backgroundColor: "#FFFFFF",
                    paddingHorizontal: 16,
                    fontSize: 16,
                    fontWeight: "700",
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
                  Açıklama
                </Text>

                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Örn: Marlboro Touch Blue"
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
                    marginBottom: 16,
                  }}
                >
                  {categories.map((category) => {
                    const isSelected = categoryId === category.id;

                    return (
                      <Pressable
                        key={category.id}
                        onPress={() => setCategoryId(category.id)}
                        disabled={isSaving}
                        style={{
                          paddingHorizontal: 12,
                          height: 40,
                          borderRadius: 14,
                          backgroundColor: isSelected
                            ? PRIMARY_BLUE
                            : "#FFFFFF",
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

                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "900",
                    color: TEXT_DARK,
                    marginBottom: 8,
                  }}
                >
                  Birim fiyat
                </Text>

                <TextInput
                  value={unitPrice}
                  onChangeText={setUnitPrice}
                  placeholder="Örn: 80"
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
                    marginBottom: 24,
                  }}
                />

                <Pressable
                  onPress={
                    isEditing ? handleUpdateTemplate : handleCreateTemplate
                  }
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
                    {isSaving
                      ? "Kaydediliyor..."
                      : isEditing
                        ? "Kaydet"
                        : "Oluştur"}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={closeModal}
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
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
