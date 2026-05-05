import { Link, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
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

import { supabase } from "../../src/lib/supabase";

const appIcon = require("../../assets/images/icon.png");

const SCREEN_BG = "#fcedd9";
const TEXT_DARK = "#3B2414";
const TEXT_MUTED = "#7C5A3A";
const PRIMARY_BLUE = "#2563EB";
const WARM_BROWN = "#92400E";
const CARD_BG = "#FFF9F0";

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
              onPress={() => router.replace("/(auth)/welcome")}
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
                width: 200,
                height: 200,
                borderRadius: 36,
                backgroundColor: SCREEN_BG,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
                overflow: "hidden",
                shadowColor: WARM_BROWN,
                shadowOpacity: 0.14,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 10 },
              }}
            >
              <Image
                source={appIcon}
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
              Tekrar hoş geldin
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
              Ortak bütçenize devam etmek için giriş yap.
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
                E-posta
              </Text>

              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="ornek@mail.com"
                placeholderTextColor="#B08A63"
                autoCapitalize="none"
                keyboardType="email-address"
                style={{
                  height: 54,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: "#FCD34D",
                  backgroundColor: "#FFFFFF",
                  paddingHorizontal: 16,
                  fontSize: 16,
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
                Şifre
              </Text>

              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Şifren"
                placeholderTextColor="#B08A63"
                secureTextEntry
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
                onPress={handleLogin}
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

          <View style={{ alignItems: "center" }}>
            <Text
              style={{
                color: TEXT_MUTED,
                marginBottom: 8,
                fontWeight: "700",
              }}
            >
              Henüz hesabın yok mu?
            </Text>

            <Link href="/(auth)/register">
              <Text
                style={{
                  color: WARM_BROWN,
                  fontWeight: "900",
                  fontSize: 16,
                }}
              >
                Hesap Oluştur
              </Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
