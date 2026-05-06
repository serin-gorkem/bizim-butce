import { Link, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
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

const registerIcon = require("../../assets/images/android-icon-foreground.png");

const SCREEN_BG = "#fcedd9";
const TEXT_DARK = "#3B2414";
const TEXT_MUTED = "#7C5A3A";
const PRIMARY_BLUE = "#2563EB";
const WARM_BROWN = "#92400E";
const CARD_BG = "#FFF9F0";
const SOFT_YELLOW = "#FDE68A";
const INPUT_BORDER = "#FCD34D";

export default function RegisterScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  async function handleRegister() {
    const trimmedFullName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedFullName || !trimmedEmail || !password.trim()) {
      showAlert("Eksik bilgi", "Ad, e-posta ve şifre alanlarını doldur.");
      return;
    }

    if (password.length < 6) {
      showAlert("Zayıf şifre", "Şifre en az 6 karakter olmalı.");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            full_name: trimmedFullName,
          },
        },
      });

      if (error) {
        showAlert("Kayıt başarısız", error.message);
        return;
      }

      if (data.user) {
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: data.user.id,
          full_name: trimmedFullName,
        });

        if (profileError) {
          showAlert("Profil oluşturulamadı", profileError.message);
          return;
        }
      }

      setFullName("");
      setEmail("");
      setPassword("");

      showAlert("Kayıt oluşturuldu", "Şimdi giriş yaparak devam edebilirsin.");

      setTimeout(() => {
        router.replace("/(auth)/login");
      }, 450);
    } catch (error) {
      showAlert(
        "Beklenmeyen hata",
        error instanceof Error ? error.message : "Kayıt sırasında hata oluştu.",
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
                width: 188,
                height: 188,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 22,
                overflow: "hidden",
              }}
            >
              <Image
                source={registerIcon}
                style={{
                  width: "100%",
                  height: "100%",
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
              Hesap oluştur
            </Text>

            <Text
              style={{
                fontSize: 16,
                lineHeight: 23,
                color: TEXT_MUTED,
                textAlign: "center",
                marginBottom: 26,
                fontWeight: "600",
              }}
            >
              Ortak bütçe alanını kullanmak için hesabını oluştur.
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
                Ad Soyad
              </Text>

              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Görkem Serin"
                placeholderTextColor="#B08A63"
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                style={{
                  height: 54,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: INPUT_BORDER,
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
                E-posta
              </Text>

              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="ornek@mail.com"
                placeholderTextColor="#B08A63"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                style={{
                  height: 54,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: INPUT_BORDER,
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

              <View
                style={{
                  height: 54,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: INPUT_BORDER,
                  backgroundColor: "#FFFFFF",
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="En az 6 karakter"
                  placeholderTextColor="#B08A63"
                  secureTextEntry={!isPasswordVisible}
                  style={{
                    flex: 1,
                    height: "100%",
                    paddingHorizontal: 16,
                    fontSize: 16,
                    color: TEXT_DARK,
                    borderTopLeftRadius: 16,
                    borderBottomLeftRadius: 16,
                  }}
                />

                <Pressable
                  onPress={() => setIsPasswordVisible((current) => !current)}
                  style={{
                    width: 54,
                    height: "100%",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 20 }}>
                    {isPasswordVisible ? "🙈" : "👁️"}
                  </Text>
                </Pressable>
              </View>

              <Pressable
                onPress={handleRegister}
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
                    Hesap Oluştur
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
              Zaten hesabın var mı?
            </Text>

            <Link href="/(auth)/login">
              <Text
                style={{
                  color: WARM_BROWN,
                  fontWeight: "900",
                  fontSize: 16,
                }}
              >
                Giriş Yap
              </Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}
