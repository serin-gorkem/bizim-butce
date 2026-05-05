import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { getCurrentUserHousehold } from "../../src/lib/household";
import { supabase } from "../../src/lib/supabase";

const SCREEN_BG = "#fcedd9";
const TEXT_DARK = "#3B2414";
const TEXT_MUTED = "#7C5A3A";
const PRIMARY_BLUE = "#2563EB";
const WARM_BROWN = "#92400E";
const CARD_BG = "#FFF9F0";
const SOFT_YELLOW = "#FDE68A";
const INPUT_BORDER = "#FCD34D";

type Profile = {
  id: string;
  full_name: string | null;
};

type HouseholdInfo = {
  id: string;
  name: string;
  invite_code: string;
};

function getRoleLabel(role: string) {
  if (role === "owner") {
    return "Kurucu";
  }

  if (role === "member") {
    return "Üye";
  }

  return role || "Bilinmiyor";
}

export default function SettingsScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [household, setHousehold] = useState<HouseholdInfo | null>(null);
  const [role, setRole] = useState("");

  const [isEditNameModalVisible, setIsEditNameModalVisible] = useState(false);
  const [editedFullName, setEditedFullName] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingName, setIsSavingName] = useState(false);
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

  function openEditNameModal() {
    setEditedFullName(profile?.full_name ?? "");
    setIsEditNameModalVisible(true);
  }

  function closeEditNameModal() {
    setIsEditNameModalVisible(false);
    setEditedFullName("");
  }

  async function handleUpdateFullName() {
    const cleanedFullName = editedFullName.trim();

    if (!cleanedFullName) {
      Alert.alert("Eksik bilgi", "İsim soyisim boş olamaz.");
      return;
    }

    setIsSavingName(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert("Oturum hatası", "Kullanıcı bilgisi alınamadı.");
        return;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: cleanedFullName,
        })
        .eq("id", user.id);

      if (profileError) {
        Alert.alert("İsim güncellenemedi", profileError.message);
        return;
      }

      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: cleanedFullName,
        },
      });

      if (authError) {
        Alert.alert(
          "Profil güncellendi",
          "İsim kaydedildi ancak oturum verisi güncellenemedi.",
        );
      }

      closeEditNameModal();
      await loadSettingsData();

      Alert.alert("Güncellendi", "İsim soyisim başarıyla güncellendi.");
    } catch (error) {
      Alert.alert(
        "Beklenmeyen hata",
        error instanceof Error
          ? error.message
          : "İsim güncellenirken hata oluştu.",
      );
    } finally {
      setIsSavingName(false);
    }
  }

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
      <SafeAreaView style={{ flex: 1, backgroundColor: SCREEN_BG }}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <ActivityIndicator color={PRIMARY_BLUE} />
          <Text style={{ color: TEXT_MUTED, fontWeight: "800" }}>
            Ayarlar yükleniyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: SCREEN_BG }}>
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
              backgroundColor: CARD_BG,
              borderWidth: 1,
              borderColor: "#FCA5A5",
            }}
          >
            <Text
              style={{
                color: "#DC2626",
                textAlign: "center",
                fontWeight: "900",
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
    <SafeAreaView style={{ flex: 1, backgroundColor: SCREEN_BG }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 24,
          paddingBottom: 48,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            padding: 20,
            borderRadius: 28,
            backgroundColor: CARD_BG,
            borderWidth: 1,
            borderColor: SOFT_YELLOW,
            marginBottom: 24,
            shadowColor: WARM_BROWN,
            shadowOpacity: 0.1,
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
                backgroundColor: "#FFE8B8",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: SOFT_YELLOW,
              }}
            >
              <Text style={{ fontSize: 34 }}>🌴</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: "900",
                  color: TEXT_DARK,
                  marginBottom: 4,
                }}
              >
                Ayarlar
              </Text>

              <Text
                style={{
                  fontSize: 15,
                  lineHeight: 21,
                  color: TEXT_MUTED,
                  fontWeight: "600",
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
            borderRadius: 26,
            backgroundColor: CARD_BG,
            borderWidth: 1,
            borderColor: SOFT_YELLOW,
            marginBottom: 16,
          }}
        >
          <View
            style={{
              alignSelf: "flex-start",
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 999,
              backgroundColor: "#FFE8B8",
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "900",
                color: WARM_BROWN,
              }}
            >
              Kullanıcı
            </Text>
          </View>

          <Text
            style={{
              fontSize: 22,
              fontWeight: "900",
              color: TEXT_DARK,
              marginBottom: 14,
            }}
          >
            {profile?.full_name ?? "İsimsiz kullanıcı"}
          </Text>

          <Pressable
            onPress={openEditNameModal}
            style={{
              height: 48,
              borderRadius: 18,
              backgroundColor: "#FFFFFF",
              borderWidth: 1,
              borderColor: INPUT_BORDER,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: WARM_BROWN,
                fontSize: 15,
                fontWeight: "900",
              }}
            >
              İsim Soyisim Değiştir
            </Text>
          </Pressable>
        </View>

        <View
          style={{
            padding: 20,
            borderRadius: 26,
            backgroundColor: CARD_BG,
            borderWidth: 1,
            borderColor: SOFT_YELLOW,
            marginBottom: 16,
          }}
        >
          <View
            style={{
              alignSelf: "flex-start",
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 999,
              backgroundColor: "#FFE8B8",
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "900",
                color: WARM_BROWN,
              }}
            >
              Ortak Alan
            </Text>
          </View>

          <Text
            style={{
              fontSize: 22,
              fontWeight: "900",
              color: TEXT_DARK,
              marginBottom: 12,
            }}
          >
            {household?.name ?? "Ortak alan yok"}
          </Text>

          {household?.invite_code && (
            <View
              style={{
                padding: 16,
                borderRadius: 20,
                backgroundColor: "#FFFFFF",
                borderWidth: 1,
                borderColor: INPUT_BORDER,
                marginBottom: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: TEXT_MUTED,
                  fontWeight: "800",
                  marginBottom: 4,
                }}
              >
                Davet kodu
              </Text>

              <Text
                style={{
                  fontSize: 22,
                  color: WARM_BROWN,
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
                backgroundColor: "#FFE8B8",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: WARM_BROWN,
                  fontWeight: "900",
                }}
              >
                Rol: {getRoleLabel(role)}
              </Text>
            </View>
          )}
        </View>

        <View
          style={{
            marginTop: 8,
            padding: 18,
            borderRadius: 26,
            backgroundColor: CARD_BG,
            borderWidth: 1,
            borderColor: SOFT_YELLOW,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              lineHeight: 20,
              color: TEXT_MUTED,
              textAlign: "center",
              marginBottom: 14,
              fontWeight: "600",
            }}
          >
            Çıkış yaptıktan sonra tekrar giriş ekranına yönlendirilirsin.
          </Text>

          <Pressable
            onPress={handleLogout}
            disabled={isLoggingOut}
            style={{
              height: 56,
              borderRadius: 20,
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

      <Modal
        visible={isEditNameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isSavingName) {
            closeEditNameModal();
          }
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(59,36,20,0.45)",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <KeyboardAvoidingView
            style={{ width: "100%" }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 0}
          >
            <View
              style={{
                width: "100%",
                borderRadius: 28,
                backgroundColor: CARD_BG,
                padding: 24,
                borderWidth: 1,
                borderColor: SOFT_YELLOW,
              }}
            >
              <View
                style={{
                  alignSelf: "center",
                  width: 76,
                  height: 76,
                  borderRadius: 28,
                  backgroundColor: "#FFE8B8",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 18,
                  borderWidth: 1,
                  borderColor: SOFT_YELLOW,
                }}
              >
                <Text style={{ fontSize: 34 }}>✏️</Text>
              </View>

              <Text
                style={{
                  fontSize: 26,
                  fontWeight: "900",
                  color: TEXT_DARK,
                  textAlign: "center",
                  marginBottom: 8,
                }}
              >
                İsim Soyisim
              </Text>

              <Text
                style={{
                  fontSize: 15,
                  color: TEXT_MUTED,
                  textAlign: "center",
                  marginBottom: 20,
                  fontWeight: "600",
                }}
              >
                Uygulamada görünecek adını buradan değiştirebilirsin.
              </Text>

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
                value={editedFullName}
                onChangeText={setEditedFullName}
                placeholder="Ad Soyad"
                placeholderTextColor="#B08A63"
                autoCapitalize="words"
                style={{
                  height: 54,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: INPUT_BORDER,
                  backgroundColor: "#FFFFFF",
                  paddingHorizontal: 16,
                  fontSize: 16,
                  fontWeight: "700",
                  color: TEXT_DARK,
                  marginBottom: 20,
                }}
              />

              <Pressable
                onPress={handleUpdateFullName}
                disabled={isSavingName}
                style={{
                  height: 54,
                  borderRadius: 20,
                  backgroundColor: isSavingName ? "#93C5FD" : PRIMARY_BLUE,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 16,
                    fontWeight: "900",
                  }}
                >
                  {isSavingName ? "Kaydediliyor..." : "Kaydet"}
                </Text>
              </Pressable>

              <Pressable
                onPress={closeEditNameModal}
                disabled={isSavingName}
                style={{
                  height: 54,
                  borderRadius: 20,
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: INPUT_BORDER,
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
                  Vazgeç
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
