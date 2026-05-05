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

const registerIcon = require("../../assets/images/android-icon-foreground.png");

const SCREEN_BG = "#fcedd9";
const TEXT_DARK = "#3B2414";
const TEXT_MUTED = "#7C5A3A";
const PRIMARY_BLUE = "#2563EB";
const WARM_BROWN = "#92400E";
const CARD_BG = "#FFF9F0";

export default function RegisterScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  async function handleRegister() {
    const trimmedFullName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedFullName || !trimmedEmail || !password.trim()) {
      Alert.alert("Eksik bilgi", "Ad, e-posta ve şifre alanlarını doldur.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Zayıf şifre", "Şifre en az 6 karakter olmalı.");
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
        Alert.alert("Kayıt başarısız", error.message);
        return;
      }

      if (data.user) {
        const { error: profileError } = await supabase.from("profiles").insert({
          id: data.user.id,
          full_name: trimmedFullName,
        });

        if (profileError) {
          Alert.alert("Profil oluşturulamadı", profileError.message);
          return;
        }
      }

      Alert.alert(
        "Kayıt oluşturuldu",
        "Şimdi giriş yaparak devam edebilirsin.",
        [
          {
            text: "Tamam",
            onPress: () => router.replace("/(auth)/login"),
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        "Beklenmeyen hata",
        error instanceof Error ? error.message : "Kayıt sırasında hata oluştu.",
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
                source={registerIcon}
                style={{
                  width: "130%",
                  height: "130%",
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
                Ad Soyad
              </Text>

              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Görkem Serin"
                placeholderTextColor="#B08A63"
                autoCapitalize="words"
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
                placeholder="En az 6 karakter"
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
    </SafeAreaView>
  );
}
