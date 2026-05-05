import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { DEFAULT_CATEGORIES } from "../../src/constants/categories";
import { supabase } from "../../src/lib/supabase";
import { generateInviteCode } from "../../src/utils/inviteCode";

const householdIcon = require("../../assets/images/Ortak-Alan.png");

const SCREEN_BG = "#fcedd9";
const TEXT_DARK = "#3B2414";
const TEXT_MUTED = "#7C5A3A";
const PRIMARY_BLUE = "#2563EB";
const WARM_BROWN = "#92400E";
const CARD_BG = "#FFF9F0";

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
    <SafeAreaView style={{ flex: 1, backgroundColor: SCREEN_BG }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 22,
            paddingBottom: 24,
            justifyContent: "space-between",
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View>
            <Pressable
              onPress={() => router.back()}
              disabled={isLoading}
              style={{
                alignSelf: "flex-start",
                paddingHorizontal: 15,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: "#FFE8B8",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "900",
                  color: WARM_BROWN,
                }}
              >
                Geri
              </Text>
            </Pressable>
          </View>

          <View style={{ paddingVertical: 18 }}>
            <View
              style={{
                alignSelf: "center",
                width: 168,
                height: 148,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
                shadowColor: WARM_BROWN,
                shadowOpacity: 0.12,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 10 },
              }}
            >
              <Image
                source={householdIcon}
                style={{
                  width: "200%",
                  height: "200%",
                }}
                resizeMode="contain"
              />
            </View>

            <Text
              style={{
                fontSize: 36,
                fontWeight: "900",
                color: TEXT_DARK,
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              Ortak Alan Oluştur
            </Text>

            <Text
              style={{
                fontSize: 16,
                lineHeight: 23,
                color: TEXT_MUTED,
                textAlign: "center",
                marginBottom: 26,
              }}
            >
              Bu alan senin ve eşinin ortak harcama takibi için kullanılacak.
            </Text>

            <View
              style={{
                padding: 20,
                borderRadius: 26,
                backgroundColor: CARD_BG,
                borderWidth: 1,
                borderColor: "#FDE68A",
                shadowColor: WARM_BROWN,
                shadowOpacity: 0.08,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 8 },
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "900",
                  color: TEXT_DARK,
                  marginBottom: 8,
                }}
              >
                Ortak alan adı
              </Text>

              <TextInput
                value={householdName}
                onChangeText={setHouseholdName}
                placeholder="Bizim Ev"
                placeholderTextColor="#B08A63"
                returnKeyType="done"
                style={{
                  height: 54,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: "#FCD34D",
                  backgroundColor: "#FFFFFF",
                  paddingHorizontal: 16,
                  fontSize: 16,
                  color: TEXT_DARK,
                  marginBottom: 20,
                }}
              />

              <Pressable
                onPress={handleCreateHousehold}
                disabled={isLoading}
                style={{
                  height: 56,
                  borderRadius: 20,
                  backgroundColor: isLoading ? "#93C5FD" : PRIMARY_BLUE,
                  alignItems: "center",
                  justifyContent: "center",
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
                  {isLoading ? "Oluşturuluyor..." : "Oluştur"}
                </Text>
              </Pressable>
            </View>
          </View>

          <Text
            style={{
              fontSize: 13,
              lineHeight: 19,
              color: "#9A6B3D",
              textAlign: "center",
            }}
          >
            Oluşturduktan sonra davet kodunu Ayarlar ekranından görebilirsin.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
