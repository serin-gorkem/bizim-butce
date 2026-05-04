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

import { getCurrentUserHousehold } from "../../src/lib/household";
import { supabase } from "../../src/lib/supabase";
import { formatCurrency } from "../../src/utils/formatters";
import { parsePositiveNumber } from "../../src/utils/parsers";
import { firstOrNull } from "../../src/utils/relations";

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

export default function TemplatesScreen() {
  const [templates, setTemplates] = useState<ExpenseTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] =
    useState<ExpenseTemplate | null>(null);

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editUnitPrice, setEditUnitPrice] = useState("");

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
          : "Template listesi yüklenemedi.",
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

  function openEditModal(template: ExpenseTemplate) {
    setSelectedTemplate(template);
    setEditName(template.name);
    setEditDescription(template.description ?? "");
    setEditUnitPrice(String(template.default_unit_price));
  }

  function closeEditModal() {
    setSelectedTemplate(null);
    setEditName("");
    setEditDescription("");
    setEditUnitPrice("");
  }

  async function handleUpdateTemplate() {
    if (!selectedTemplate) {
      Alert.alert("Template seçilmedi", "Düzenlenecek template bulunamadı.");
      return;
    }

    const cleanedName = editName.trim();
    const cleanedDescription = editDescription.trim();
    const parsedUnitPrice = parsePositiveNumber(editUnitPrice);

    if (!cleanedName) {
      Alert.alert("Eksik bilgi", "Template adı boş olamaz.");
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
          default_unit_price: parsedUnitPrice,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedTemplate.id);

      if (error) {
        Alert.alert("Template güncellenemedi", error.message);
        return;
      }

      closeEditModal();
      await loadTemplates();

      Alert.alert("Güncellendi", "Template başarıyla güncellendi.");
    } catch (error) {
      Alert.alert(
        "Beklenmeyen hata",
        error instanceof Error
          ? error.message
          : "Template güncellenirken hata oluştu.",
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
            Template listesi yükleniyor...
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
        data={templates}
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
                      fontSize: 27,
                      fontWeight: "900",
                    }}
                  >
                    ⚡
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
                    Templates
                  </Text>

                  <Text
                    style={{
                      fontSize: 15,
                      lineHeight: 21,
                      color: "#4B5563",
                    }}
                  >
                    Hazır harcamaların adını, açıklamasını ve birim fiyatını
                    düzenle.
                  </Text>
                </View>
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
              Hazır Harcamalar
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
              Henüz template yok.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
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

                <Text
                  style={{
                    fontSize: 17,
                    fontWeight: "900",
                    color: "#111827",
                  }}
                >
                  {item.name}
                </Text>

                {item.description && (
                  <Text
                    style={{
                      marginTop: 4,
                      fontSize: 14,
                      color: "#4B5563",
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
                  color: "#1E3A8A",
                }}
              >
                {formatCurrency(item.default_unit_price)}
              </Text>
            </View>
          </Pressable>
        )}
      />

      <Modal
        visible={!!selectedTemplate}
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
                ⚡
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
              Template Düzenle
            </Text>

            <Text
              style={{
                fontSize: 15,
                color: "#6B7280",
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              Bu değerler hazır harcama eklerken otomatik kullanılacak.
            </Text>

            <Text
              style={{
                fontSize: 14,
                fontWeight: "800",
                color: "#111827",
                marginBottom: 8,
              }}
            >
              Ad
            </Text>

            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Örn: Sigara"
              style={{
                height: 54,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: "#D1D5DB",
                backgroundColor: "#F9FAFB",
                paddingHorizontal: 16,
                fontSize: 16,
                fontWeight: "600",
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
              Açıklama
            </Text>

            <TextInput
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Örn: Marlboro Touch Blue"
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
              Birim fiyat
            </Text>

            <TextInput
              value={editUnitPrice}
              onChangeText={setEditUnitPrice}
              placeholder="Örn: 80"
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
                marginBottom: 24,
              }}
            />

            <Pressable
              onPress={handleUpdateTemplate}
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
