import { Link, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from "react-native";

import { supabase } from "../../src/lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin() {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password.trim()) {
      Alert.alert("Eksik bilgi", "E-posta ve şifre alanlarını doldur.");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        Alert.alert("Giriş başarısız", error.message);
        return;
      }

      router.replace("/");
    } catch (error) {
      Alert.alert(
        "Beklenmeyen hata",
        error instanceof Error
          ? error.message
          : "Giriş yapılırken hata oluştu.",
      );
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
              onPress={() => router.replace("/(auth)/welcome")}
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
                width: 120,
                height: 120,
                borderRadius: 36,
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
                  width: 76,
                  height: 76,
                  borderRadius: 38,
                  backgroundColor: "#2563EB",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 26,
                    fontWeight: "900",
                  }}
                >
                  BB
                </Text>
              </View>

              <View
                style={{
                  position: "absolute",
                  right: 16,
                  bottom: 12,
                  width: 34,
                  height: 34,
                  borderRadius: 12,
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
                    fontSize: 16,
                    fontWeight: "900",
                  }}
                >
                  ₺
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
              Tekrar hoş geldin
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
              Ortak bütçenize devam etmek için giriş yap.
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
                E-posta
              </Text>

              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="ornek@mail.com"
                autoCapitalize="none"
                keyboardType="email-address"
                style={{
                  height: 54,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "#D1D5DB",
                  backgroundColor: "#F9FAFB",
                  paddingHorizontal: 16,
                  fontSize: 16,
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
                Şifre
              </Text>

              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Şifren"
                secureTextEntry
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
                onPress={handleLogin}
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
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 16,
                      fontWeight: "900",
                    }}
                  >
                    Giriş Yap
                  </Text>
                )}
              </Pressable>
            </View>
          </View>

          <View
            style={{
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#6B7280", marginBottom: 8 }}>
              Henüz hesabın yok mu?
            </Text>

            <Link href="/(auth)/register">
              <Text
                style={{
                  color: "#5B21B6",
                  fontWeight: "900",
                  fontSize: 16,
                }}
              >
                Hesap Oluştur
              </Text>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
