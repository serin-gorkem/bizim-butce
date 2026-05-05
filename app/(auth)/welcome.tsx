import { AppScreen } from "@/components/AppScreen";
import { router } from "expo-router";
import { Image, Pressable, ScrollView, Text, View } from "react-native";

const mascotImage = require("../../assets/images/welcome-mascot.png");

const SCREEN_BG = "#fcedd9";
const TEXT_DARK = "#3B2414";
const TEXT_MUTED = "#7C5A3A";
const PRIMARY_BLUE = "#2563EB";
const WARM_BROWN = "#92400E";
const CARD_BG = "#FFF9F0";
const SOFT_YELLOW = "#FDE68A";

export default function WelcomeScreen() {
  return (
    <AppScreen backgroundColor={SCREEN_BG}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: 22,
          paddingBottom: 24,
          justifyContent: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: "center" }}>
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: "#FFE8B8",
              marginBottom: 10,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "900",
                color: WARM_BROWN,
                textAlign: "center",
              }}
            >
              Sadece ikiniz için küçük bir bütçe adası
            </Text>
          </View>

          <View
            style={{
              width: "100%",
              maxWidth: 330,
              height: 260,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 10,
              overflow: "hidden",
            }}
          >
            <Image
              source={mascotImage}
              style={{
                width: "100%",
                height: "100%",
              }}
              resizeMode="contain"
            />
          </View>

          <Text
            style={{
              fontSize: 40,
              fontWeight: "900",
              color: TEXT_DARK,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            BizimBütçe
          </Text>

          <Text
            style={{
              fontSize: 16,
              lineHeight: 23,
              color: TEXT_MUTED,
              textAlign: "center",
              maxWidth: 330,
              marginBottom: 16,
              fontWeight: "600",
            }}
          >
            Harcamalarınızı birlikte görün, küçük giderleri kaçırmayın ve ay
            sonunda paranızın nereye gittiğini net anlayın.
          </Text>

          <View
            style={{
              flexDirection: "row",
              gap: 10,
              marginBottom: 20,
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
                Ortak takip
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
                Az uğraş
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
              borderColor: SOFT_YELLOW,
              shadowColor: WARM_BROWN,
              shadowOpacity: 0.08,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 8 },
            }}
          >
            <Pressable
              onPress={() => router.push("/(auth)/login")}
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
                Giriş Yap
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/(auth)/register")}
              style={{
                height: 58,
                borderRadius: 22,
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
                Hesap Oluştur
              </Text>
            </Pressable>

            <Text
              style={{
                marginTop: 14,
                fontSize: 13,
                lineHeight: 19,
                color: "#9A6B3D",
                textAlign: "center",
                fontWeight: "600",
              }}
            >
              Hazır harcamalar, ortak liste ve aylık toplamlar tek yerde.
            </Text>
          </View>
        </View>
      </ScrollView>
    </AppScreen>
  );
}
