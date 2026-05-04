import { router } from "expo-router";
import { Image, Pressable, SafeAreaView, Text, View } from "react-native";

const mascotImage = require("../../assets/images/welcome-mascot.png");

export default function WelcomeScreen() {
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
            Sadece ikiniz için ortak bütçe alanı
          </Text>
        </View>

        <View style={{ alignItems: "center" }}>
          <View
            style={{
              width: 230,
              height: 230,
              borderRadius: 48,
              backgroundColor: "#DBEAFE",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 30,
              borderWidth: 8,
              borderColor: "#FFFFFF",
              shadowColor: "#1E3A8A",
              shadowOpacity: 0.16,
              shadowRadius: 22,
              shadowOffset: { width: 0, height: 12 },
            }}
          >
            <View
              style={{
                position: "absolute",
                width: 170,
                height: 170,
                borderRadius: 85,
                backgroundColor: "#BFDBFE",
              }}
            />

            <View
              style={{
                position: "absolute",
                top: 24,
                left: 26,
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: "#60A5FA",
                transform: [{ rotate: "-18deg" }],
              }}
            />

            <View
              style={{
                position: "absolute",
                top: 24,
                right: 26,
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: "#60A5FA",
                transform: [{ rotate: "18deg" }],
              }}
            />

            <View
              style={{
                width: 132,
                height: 132,
                borderRadius: 66,
                backgroundColor: "#2563EB",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {mascotImage ? (
                <Image
                  source={mascotImage}
                  style={{
                    width: "100%",
                    height: "100%",
                  }}
                  resizeMode="cover"
                />
              ) : (
                <View style={{ alignItems: "center" }}>
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 18,
                      marginBottom: 14,
                    }}
                  >
                    <View
                      style={{
                        width: 18,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: "#FFFFFF",
                      }}
                    />
                    <View
                      style={{
                        width: 18,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: "#FFFFFF",
                      }}
                    />
                  </View>

                  <View
                    style={{
                      width: 46,
                      height: 18,
                      borderBottomLeftRadius: 24,
                      borderBottomRightRadius: 24,
                      backgroundColor: "#93C5FD",
                    }}
                  />

                  <Text
                    style={{
                      marginTop: 12,
                      color: "#FFFFFF",
                      fontSize: 15,
                      fontWeight: "900",
                    }}
                  >
                    BB
                  </Text>
                </View>
              )}
            </View>

            <View
              style={{
                position: "absolute",
                right: 28,
                bottom: 28,
                width: 54,
                height: 54,
                borderRadius: 18,
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
                  fontSize: 24,
                  fontWeight: "900",
                }}
              >
                ₺
              </Text>
            </View>
          </View>

          <Text
            style={{
              fontSize: 40,
              fontWeight: "900",
              color: "#111827",
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            BizimBütçe
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
            Harcamalarınızı birlikte görün, küçük giderleri kaçırmayın ve ay
            sonunda paranızın nereye gittiğini net anlayın.
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
                Ortak takip
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
                Az uğraş
              </Text>
            </View>
          </View>
        </View>

        <View>
          <Pressable
            onPress={() => router.push("/(auth)/login")}
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
              Giriş Yap
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(auth)/register")}
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
              Hesap Oluştur
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
            Hazır harcamalar, ortak liste ve aylık toplamlar tek yerde.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
