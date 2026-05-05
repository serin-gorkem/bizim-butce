import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from "react-native";

import { supabase } from "../../src/lib/supabase";
import { showAlert } from "../../src/utils/appAlert";

const onboardingIcon = require("../../assets/images/android-icon-foreground.png");

const SCREEN_BG = "#fcedd9";
const TEXT_DARK = "#3B2414";
const TEXT_MUTED = "#7C5A3A";
const PRIMARY_BLUE = "#2563EB";
const WARM_BROWN = "#92400E";
const CARD_BG = "#FFF9F0";

export default function OnboardingScreen() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        showAlert("Çıkış yapılamadı", error.message);
        return;
      }

      router.replace("/(auth)/welcome");
    } catch (error) {
      showAlert(
        "Beklenmeyen hata",
        error instanceof Error
          ? error.message
          : "Çıkış yapılırken hata oluştu.",
      );
    } finally {
      setIsLoggingOut(false);
    }
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: SCREEN_BG }}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingTop: 22,
          paddingBottom: 24,
          justifyContent: "center",
        }}
      >
        <View style={{ alignItems: "center" }}>
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: "#FFE8B8",
              marginBottom: 18,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "900",
                color: WARM_BROWN,
              }}
            >
              Birlikte başlamak için küçük bir adım
            </Text>
          </View>

          <View
            style={{
              width: 178,
              height: 154,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 22,
            }}
          >
            <Image
              source={onboardingIcon}
              style={{
                width: "100%",
                height: "100%",
              }}
              resizeMode="contain"
            />
          </View>

          <Text
            style={{
              fontSize: 38,
              fontWeight: "900",
              color: TEXT_DARK,
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            Ortak Alan
          </Text>

          <Text
            style={{
              fontSize: 16,
              lineHeight: 23,
              color: TEXT_MUTED,
              textAlign: "center",
              maxWidth: 335,
              marginBottom: 20,
            }}
          >
            Harcamaları birlikte takip etmek için bir ortak alan oluştur veya
            davet koduyla mevcut alana katıl.
          </Text>

          <View
            style={{
              flexDirection: "row",
              gap: 10,
              marginBottom: 26,
            }}
          >
            <View
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: "#DBEAFE",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "900",
                  color: "#1E40AF",
                }}
              >
                Ortak liste
              </Text>
            </View>

            <View
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: "#FCE7F3",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "900",
                  color: "#BE185D",
                }}
              >
                Tek bütçe
              </Text>
            </View>
          </View>

          <View
            style={{
              width: "100%",
              padding: 18,
              borderRadius: 28,
              backgroundColor: CARD_BG,
              borderWidth: 1,
              borderColor: "#FDE68A",
              shadowColor: WARM_BROWN,
              shadowOpacity: 0.08,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 8 },
            }}
          >
            <Pressable
              onPress={() => router.push("/(onboarding)/create-household")}
              style={{
                height: 58,
                borderRadius: 22,
                backgroundColor: PRIMARY_BLUE,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
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
                Ortak Alan Oluştur
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/(onboarding)/join-household")}
              style={{
                height: 58,
                borderRadius: 22,
                backgroundColor: "#FFFFFF",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 14,
              }}
            >
              <Text
                style={{
                  color: WARM_BROWN,
                  fontSize: 16,
                  fontWeight: "900",
                }}
              >
                Davet Koduyla Katıl
              </Text>
            </Pressable>

            <Text
              style={{
                fontSize: 13,
                lineHeight: 19,
                color: "#9A6B3D",
                textAlign: "center",
              }}
            >
              Biriniz alanı oluşturur, diğeriniz davet koduyla katılır.
            </Text>
            <Pressable
              onPress={handleLogout}
              disabled={isLoggingOut}
              style={{
                height: 48,
                borderRadius: 18,
                backgroundColor: "#FFF9F0",
                borderWidth: 1,
                borderColor: "#FCD34D",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 14,
              }}
            >
              {isLoggingOut ? (
                <ActivityIndicator color={WARM_BROWN} />
              ) : (
                <Text
                  style={{
                    color: WARM_BROWN,
                    fontSize: 15,
                    fontWeight: "900",
                  }}
                >
                  Çıkış Yap
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
