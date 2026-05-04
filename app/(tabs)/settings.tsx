import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";

import { getCurrentUserHousehold } from "../../src/lib/household";
import { supabase } from "../../src/lib/supabase";

type Profile = {
  id: string;
  full_name: string | null;
};

type HouseholdInfo = {
  id: string;
  name: string;
  invite_code: string;
};

export default function SettingsScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [household, setHousehold] = useState<HouseholdInfo | null>(null);
  const [role, setRole] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadSettingsData() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMessage("Kullanıcı bilgisi alınamadı.");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        setErrorMessage(profileError.message);
        return;
      }

      setProfile(profileData);

      const membership = await getCurrentUserHousehold();

      if (!membership) {
        setHousehold(null);
        setRole("");
        return;
      }

      setRole(membership.role ?? "");

      const householdData = Array.isArray(membership.households)
        ? membership.households[0]
        : membership.households;

      if (householdData) {
        setHousehold({
          id: householdData.id,
          name: householdData.name,
          invite_code: householdData.invite_code,
        });
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Ayarlar yüklenemedi.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadSettingsData();
    }, []),
  );

  async function handleLogout() {
    Alert.alert("Çıkış yap", "Hesabından çıkış yapmak istiyor musun?", [
      {
        text: "Vazgeç",
        style: "cancel",
      },
      {
        text: "Çıkış Yap",
        style: "destructive",
        onPress: async () => {
          setIsLoggingOut(true);

          const { error } = await supabase.auth.signOut();

          setIsLoggingOut(false);

          if (error) {
            Alert.alert("Çıkış yapılamadı", error.message);
            return;
          }

          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F5FBFF" }}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <ActivityIndicator color="#2563EB" />
          <Text style={{ color: "#6B7280", fontWeight: "700" }}>
            Ayarlar yükleniyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F5FBFF" }}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              width: "100%",
              padding: 20,
              borderRadius: 24,
              backgroundColor: "#FFFFFF",
              borderWidth: 1,
              borderColor: "#FCA5A5",
            }}
          >
            <Text
              style={{
                color: "#DC2626",
                textAlign: "center",
                fontWeight: "800",
              }}
            >
              {errorMessage}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5FBFF" }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 24,
          paddingBottom: 48,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            padding: 20,
            borderRadius: 28,
            backgroundColor: "#DBEAFE",
            borderWidth: 6,
            borderColor: "#FFFFFF",
            marginBottom: 24,
            shadowColor: "#1E3A8A",
            shadowOpacity: 0.12,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
            }}
          >
            <View
              style={{
                width: 66,
                height: 66,
                borderRadius: 24,
                backgroundColor: "#2563EB",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 28,
                  fontWeight: "900",
                }}
              >
                ⚙︎
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: "900",
                  color: "#111827",
                  marginBottom: 4,
                }}
              >
                Ayarlar
              </Text>

              <Text
                style={{
                  fontSize: 15,
                  lineHeight: 21,
                  color: "#4B5563",
                }}
              >
                Hesap ve ortak alan bilgilerin.
              </Text>
            </View>
          </View>
        </View>

        <View
          style={{
            padding: 20,
            borderRadius: 24,
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            borderColor: "#BFDBFE",
            marginBottom: 16,
          }}
        >
          <View
            style={{
              alignSelf: "flex-start",
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 999,
              backgroundColor: "#DBEAFE",
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "900",
                color: "#1E40AF",
              }}
            >
              Kullanıcı
            </Text>
          </View>

          <Text
            style={{
              fontSize: 22,
              fontWeight: "900",
              color: "#111827",
            }}
          >
            {profile?.full_name ?? "İsimsiz kullanıcı"}
          </Text>
        </View>

        <View
          style={{
            padding: 20,
            borderRadius: 24,
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            borderColor: "#BFDBFE",
            marginBottom: 16,
          }}
        >
          <View
            style={{
              alignSelf: "flex-start",
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 999,
              backgroundColor: "#EDE9FE",
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "900",
                color: "#5B21B6",
              }}
            >
              Ortak Alan
            </Text>
          </View>

          <Text
            style={{
              fontSize: 22,
              fontWeight: "900",
              color: "#111827",
              marginBottom: 12,
            }}
          >
            {household?.name ?? "Ortak alan yok"}
          </Text>

          {household?.invite_code && (
            <View
              style={{
                padding: 16,
                borderRadius: 18,
                backgroundColor: "#F5FBFF",
                borderWidth: 1,
                borderColor: "#DBEAFE",
                marginBottom: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: "#6B7280",
                  fontWeight: "700",
                  marginBottom: 4,
                }}
              >
                Davet kodu
              </Text>

              <Text
                style={{
                  fontSize: 22,
                  color: "#1E3A8A",
                  fontWeight: "900",
                  letterSpacing: 2,
                }}
              >
                {household.invite_code}
              </Text>
            </View>
          )}

          {role && (
            <View
              style={{
                alignSelf: "flex-start",
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 999,
                backgroundColor: "#DBEAFE",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: "#1E40AF",
                  fontWeight: "900",
                }}
              >
                Rol: {role}
              </Text>
            </View>
          )}
        </View>

        <View
          style={{
            marginTop: 8,
            padding: 18,
            borderRadius: 24,
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            borderColor: "#BFDBFE",
          }}
        >
          <Text
            style={{
              fontSize: 14,
              lineHeight: 20,
              color: "#6B7280",
              textAlign: "center",
              marginBottom: 14,
            }}
          >
            Çıkış yaptıktan sonra tekrar giriş ekranına yönlendirilirsin.
          </Text>

          <Pressable
            onPress={handleLogout}
            disabled={isLoggingOut}
            style={{
              height: 56,
              borderRadius: 18,
              backgroundColor: isLoggingOut ? "#FCA5A5" : "#DC2626",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 16,
                fontWeight: "900",
              }}
            >
              {isLoggingOut ? "Çıkış yapılıyor..." : "Çıkış Yap"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
