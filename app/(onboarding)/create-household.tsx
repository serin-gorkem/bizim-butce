import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from "react-native";

import { DEFAULT_CATEGORIES } from "../../src/constants/categories";
import { supabase } from "../../src/lib/supabase";
import { generateInviteCode } from "../../src/utils/inviteCode";

export default function CreateHouseholdScreen() {
  const [householdName, setHouseholdName] = useState("Bizim Ev");
  const [isLoading, setIsLoading] = useState(false);

  async function handleCreateHousehold() {
    const trimmedName = householdName.trim();

    if (!trimmedName) {
      Alert.alert("Eksik bilgi", "Ortak alan adı boş olamaz.");
      return;
    }

    setIsLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert("Oturum hatası", "Kullanıcı bilgisi alınamadı.");
        return;
      }

      const inviteCode = generateInviteCode();

      const { data: household, error: householdError } = await supabase
        .from("households")
        .insert({
          name: trimmedName,
          invite_code: inviteCode,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (householdError || !household) {
        Alert.alert(
          "Ortak alan oluşturulamadı",
          householdError?.message ?? "Bilinmeyen hata",
        );
        return;
      }

      const { error: memberError } = await supabase
        .from("household_members")
        .insert({
          household_id: household.id,
          user_id: user.id,
          role: "owner",
        });

      if (memberError) {
        Alert.alert("Üyelik oluşturulamadı", memberError.message);
        return;
      }

      const categoriesPayload = DEFAULT_CATEGORIES.map((category) => ({
        household_id: household.id,
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        sort_order: category.sort_order,
      }));

      const { error: categoriesError } = await supabase
        .from("categories")
        .insert(categoriesPayload);

      if (categoriesError) {
        Alert.alert("Kategoriler oluşturulamadı", categoriesError.message);
        return;
      }

      router.replace("/(tabs)/home");
    } catch (error) {
      Alert.alert("Beklenmeyen hata", "Ortak alan oluşturulurken hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5FBFF" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={{
            flex: 1,
            paddingHorizontal: 24,
            paddingVertical: 28,
            justifyContent: "space-between",
          }}
        >
          <View>
            <Pressable
              onPress={() => router.back()}
              disabled={isLoading}
              style={{
                alignSelf: "flex-start",
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: "#EDE9FE",
                borderWidth: 1,
                borderColor: "#DDD6FE",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "800",
                  color: "#5B21B6",
                }}
              >
                Geri
              </Text>
            </Pressable>
          </View>

          <View>
            <View
              style={{
                alignSelf: "center",
                width: 130,
                height: 130,
                borderRadius: 38,
                backgroundColor: "#DBEAFE",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 28,
                borderWidth: 6,
                borderColor: "#FFFFFF",
                shadowColor: "#1E3A8A",
                shadowOpacity: 0.14,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 10 },
              }}
            >
              <View
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: 42,
                  backgroundColor: "#2563EB",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 32,
                    fontWeight: "900",
                  }}
                >
                  Ev
                </Text>
              </View>

              <View
                style={{
                  position: "absolute",
                  right: 14,
                  bottom: 12,
                  width: 38,
                  height: 38,
                  borderRadius: 14,
                  backgroundColor: "#7C3AED",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 3,
                  borderColor: "#FFFFFF",
                }}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 18,
                    fontWeight: "900",
                  }}
                >
                  +
                </Text>
              </View>
            </View>

            <Text
              style={{
                fontSize: 36,
                fontWeight: "900",
                color: "#111827",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              Ortak Alan Oluştur
            </Text>

            <Text
              style={{
                fontSize: 16,
                lineHeight: 24,
                color: "#6B7280",
                textAlign: "center",
                marginBottom: 32,
              }}
            >
              Bu alan senin ve eşinin ortak harcama takibi için kullanılacak.
            </Text>

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
                  fontSize: 14,
                  fontWeight: "800",
                  color: "#111827",
                  marginBottom: 8,
                }}
              >
                Ortak alan adı
              </Text>

              <TextInput
                value={householdName}
                onChangeText={setHouseholdName}
                placeholder="Bizim Ev"
                style={{
                  height: 54,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "#D1D5DB",
                  backgroundColor: "#F9FAFB",
                  paddingHorizontal: 16,
                  fontSize: 16,
                  marginBottom: 20,
                }}
              />

              <Pressable
                onPress={handleCreateHousehold}
                disabled={isLoading}
                style={{
                  height: 56,
                  borderRadius: 18,
                  backgroundColor: isLoading ? "#93C5FD" : "#2563EB",
                  alignItems: "center",
                  justifyContent: "center",
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
                  {isLoading ? "Oluşturuluyor..." : "Oluştur"}
                </Text>
              </Pressable>
            </View>
          </View>

          <Text
            style={{
              fontSize: 13,
              lineHeight: 19,
              color: "#6B7280",
              textAlign: "center",
            }}
          >
            Oluşturduktan sonra davet kodunu Ayarlar ekranından görebilirsin.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
