import { router } from "expo-router";
import { Pressable, SafeAreaView, Text, View } from "react-native";

export default function OnboardingScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5FBFF" }}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingTop: 28,
          paddingBottom: 24,
          justifyContent: "space-between",
        }}
      >
        <View
          style={{
            alignSelf: "center",
            paddingHorizontal: 16,
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
            Birlikte başlamak için küçük bir adım
          </Text>
        </View>

        <View style={{ alignItems: "center" }}>
          <View
            style={{
              width: 170,
              height: 170,
              borderRadius: 44,
              backgroundColor: "#DBEAFE",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 30,
              borderWidth: 8,
              borderColor: "#FFFFFF",
              shadowColor: "#1E3A8A",
              shadowOpacity: 0.14,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 10 },
            }}
          >
            <View
              style={{
                position: "absolute",
                top: 22,
                left: 26,
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: "#60A5FA",
                transform: [{ rotate: "-18deg" }],
              }}
            />

            <View
              style={{
                position: "absolute",
                top: 22,
                right: 26,
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: "#60A5FA",
                transform: [{ rotate: "18deg" }],
              }}
            />

            <View
              style={{
                width: 104,
                height: 104,
                borderRadius: 52,
                backgroundColor: "#2563EB",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 30,
                  fontWeight: "900",
                }}
              >
                BB
              </Text>
            </View>

            <View
              style={{
                position: "absolute",
                right: 22,
                bottom: 20,
                width: 42,
                height: 42,
                borderRadius: 14,
                backgroundColor: "#7C3AED",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 4,
                borderColor: "#FFFFFF",
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 20,
                  fontWeight: "900",
                }}
              >
                +
              </Text>
            </View>
          </View>

          <Text
            style={{
              fontSize: 38,
              fontWeight: "900",
              color: "#111827",
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            Ortak Alan
          </Text>

          <Text
            style={{
              fontSize: 17,
              lineHeight: 25,
              color: "#6B7280",
              textAlign: "center",
              maxWidth: 330,
            }}
          >
            Harcamaları birlikte takip etmek için bir ortak alan oluştur veya
            davet koduyla mevcut alana katıl.
          </Text>

          <View
            style={{
              flexDirection: "row",
              gap: 10,
              marginTop: 24,
            }}
          >
            <View
              style={{
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 999,
                backgroundColor: "#DBEAFE",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "800",
                  color: "#1E40AF",
                }}
              >
                Ortak liste
              </Text>
            </View>

            <View
              style={{
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 999,
                backgroundColor: "#EDE9FE",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "800",
                  color: "#5B21B6",
                }}
              >
                Tek bütçe
              </Text>
            </View>
          </View>
        </View>

        <View>
          <Pressable
            onPress={() => router.push("/(onboarding)/create-household")}
            style={{
              height: 58,
              borderRadius: 20,
              backgroundColor: "#2563EB",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
              shadowColor: "#2563EB",
              shadowOpacity: 0.24,
              shadowRadius: 14,
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
              borderRadius: 20,
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
              Davet Koduyla Katıl
            </Text>
          </Pressable>

          <Text
            style={{
              marginTop: 18,
              fontSize: 13,
              lineHeight: 19,
              color: "#6B7280",
              textAlign: "center",
            }}
          >
            Biriniz alanı oluşturur, diğeriniz davet koduyla katılır.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
