import { router } from "expo-router";
import { useState } from "react";
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { AppScreen } from "../../components/AppScreen";

import { supabase } from "../../src/lib/supabase";
import { showAlert } from "../../src/utils/appAlert";

const joinHouseholdIcon = require("../../assets/images/ortak-alan-katil.png");

const SCREEN_BG = "#fcedd9";
const TEXT_DARK = "#3B2414";
const TEXT_MUTED = "#7C5A3A";
const PRIMARY_BLUE = "#2563EB";
const WARM_BROWN = "#92400E";
const CARD_BG = "#FFF9F0";
const SOFT_YELLOW = "#FDE68A";
const INPUT_BORDER = "#FCD34D";

export default function JoinHouseholdScreen() {
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleJoinHousehold() {
    const normalizedCode = inviteCode.trim().toUpperCase();

    if (!normalizedCode) {
      showAlert("Eksik bilgi", "Davet kodunu gir.");
      return;
    }

    setIsLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        showAlert("Oturum hatası", "Kullanıcı bilgisi alınamadı.");
        return;
      }

      const { data: household, error: householdError } = await supabase
        .from("households")
        .select("id, name, invite_code")
        .eq("invite_code", normalizedCode)
        .maybeSingle();

      if (householdError) {
        showAlert("Ortak alan bulunamadı", householdError.message);
        return;
      }

      if (!household) {
        showAlert("Kod geçersiz", "Bu davet koduna ait ortak alan bulunamadı.");
        return;
      }

      const { data: existingMember, error: existingMemberError } =
        await supabase
          .from("household_members")
          .select("id")
          .eq("household_id", household.id)
          .eq("user_id", user.id)
          .maybeSingle();

      if (existingMemberError) {
        showAlert("Katılım kontrol edilemedi", existingMemberError.message);
        return;
      }

      if (!existingMember) {
        const { error: memberError } = await supabase
          .from("household_members")
          .insert({
            household_id: household.id,
            user_id: user.id,
            role: "member",
          });

        if (memberError) {
          showAlert("Katılım başarısız", memberError.message);
          return;
        }
      }

      router.replace("/(tabs)/home");
    } catch (error) {
      showAlert(
        "Beklenmeyen hata",
        error instanceof Error
          ? error.message
          : "Ortak alana katılırken hata oluştu.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AppScreen backgroundColor={SCREEN_BG}>
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
          <View style={{ zIndex: 10 }}>
            <Pressable
              onPress={() => router.back()}
              disabled={isLoading}
              style={{
                alignSelf: "flex-start",

                paddingHorizontal: 15,

                paddingVertical: 8,

                borderRadius: 999,

                backgroundColor: "#FFE8B8",

                zIndex: 10,
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

          <View style={{ paddingVertical: 0 }}>
            <View
              pointerEvents="none"
              style={{
                alignSelf: "center",
                width: 336,
                height: 296,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
                overflow: "hidden",
              }}
            >
              <Image
                source={joinHouseholdIcon}
                style={{
                  width: "150%",
                  height: "150%",
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
              Davet Koduyla Katıl
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
              Eşinin oluşturduğu ortak alanın davet kodunu gir.
            </Text>

            <View
              style={{
                padding: 20,
                borderRadius: 26,
                backgroundColor: CARD_BG,
                borderWidth: 1,
                borderColor: SOFT_YELLOW,
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
                Davet kodu
              </Text>

              <TextInput
                value={inviteCode}
                onChangeText={setInviteCode}
                placeholder="Örn: RTSKYK"
                placeholderTextColor="#B08A63"
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                style={{
                  height: 54,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: INPUT_BORDER,
                  backgroundColor: "#FFFFFF",
                  paddingHorizontal: 16,
                  fontSize: 18,
                  letterSpacing: 2,
                  fontWeight: "900",
                  color: TEXT_DARK,
                  marginBottom: 20,
                }}
              />

              <Pressable
                onPress={handleJoinHousehold}
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
                  {isLoading ? "Katılınıyor..." : "Katıl"}
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
            Davet kodunu büyük/küçük harf fark etmeksizin girebilirsin.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}
