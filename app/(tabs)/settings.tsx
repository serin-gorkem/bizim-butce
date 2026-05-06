import * as Clipboard from "expo-clipboard";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";

import { guardActiveHousehold } from "@/lib/household";
import { AppScreen } from "../../components/AppScreen";
import { supabase } from "../../src/lib/supabase";
import { showAlert } from "../../src/utils/appAlert";

const SCREEN_BG = "#fcedd9";
const TEXT_DARK = "#3B2414";
const TEXT_MUTED = "#7C5A3A";
const PRIMARY_BLUE = "#2563EB";
const WARM_BROWN = "#92400E";
const CARD_BG = "#FFF9F0";
const SOFT_YELLOW = "#FDE68A";
const INPUT_BORDER = "#FCD34D";
const DANGER_RED = "#DC2626";

type Profile = {
  id: string;
  full_name: string | null;
};

type HouseholdInfo = {
  id: string;
  name: string;
  invite_code: string;
};

type HouseholdMember = {
  id: string;
  user_id: string;
  role: string;
  profiles:
    | {
        full_name: string | null;
      }
    | {
        full_name: string | null;
      }[]
    | null;
};

function getRoleLabel(role: string) {
  if (role === "owner") return "Kurucu";
  if (role === "member") return "Üye";
  return role || "Bilinmiyor";
}

function getMemberFullName(member: HouseholdMember) {
  const profile = Array.isArray(member.profiles)
    ? member.profiles[0]
    : member.profiles;

  return profile?.full_name ?? "İsimsiz kullanıcı";
}

export default function SettingsScreen() {
  const [currentUserId, setCurrentUserId] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [household, setHousehold] = useState<HouseholdInfo | null>(null);
  const [role, setRole] = useState("");
  const [members, setMembers] = useState<HouseholdMember[]>([]);

  const [isEditNameModalVisible, setIsEditNameModalVisible] = useState(false);
  const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);
  const [editedFullName, setEditedFullName] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isHouseholdActionLoading, setIsHouseholdActionLoading] =
    useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isOwner = role === "owner";
  const otherMembers = members.filter(
    (member) => member.user_id !== currentUserId,
  );

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

      setCurrentUserId(user.id);

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

      const membership = await guardActiveHousehold();

      if (!membership) {
        setHousehold(null);
        setRole("");
        setMembers([]);
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

      const { data: membersData, error: membersError } = await supabase
        .from("household_members")
        .select(
          `
          id,
          user_id,
          role,
          profiles (
            full_name
          )
        `,
        )
        .eq("household_id", membership.household_id);

      if (membersError) {
        setErrorMessage(membersError.message);
        return;
      }

      setMembers((membersData ?? []) as HouseholdMember[]);
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
      showAlert("Eksik bilgi", "İsim soyisim boş olamaz.");
      return;
    }

    setIsSavingName(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        showAlert("Oturum hatası", "Kullanıcı bilgisi alınamadı.");
        return;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: cleanedFullName })
        .eq("id", user.id);

      if (profileError) {
        showAlert("İsim güncellenemedi", profileError.message);
        return;
      }

      await supabase.auth.updateUser({
        data: { full_name: cleanedFullName },
      });

      closeEditNameModal();
      await loadSettingsData();

      showAlert("Güncellendi", "İsim soyisim başarıyla güncellendi.");
    } catch (error) {
      showAlert(
        "Beklenmeyen hata",
        error instanceof Error
          ? error.message
          : "İsim güncellenirken hata oluştu.",
      );
    } finally {
      setIsSavingName(false);
    }
  }

  async function handleCopyInviteCode() {
    if (!household?.invite_code) return;

    await Clipboard.setStringAsync(household.invite_code);
    showAlert("Kopyalandı", "Davet kodu panoya kopyalandı.");
  }

  async function handleShareInviteCode() {
    if (!household?.invite_code) return;

    try {
      await Share.share({
        message: `BizimBütçe ortak alan davet kodu: ${household.invite_code}`,
      });
    } catch (error) {
      showAlert(
        "Paylaşılamadı",
        error instanceof Error ? error.message : "Davet kodu paylaşılamadı.",
      );
    }
  }

  async function handleLeaveHousehold() {
    if (!household) {
      showAlert("Ortak alan yok", "İşlem yapılacak ortak alan bulunamadı.");
      return;
    }

    if (isOwner && otherMembers.length > 0) {
      showAlert(
        "Kuruculuk devredilmeli",
        "Ortak alandan çıkmadan önce kuruculuğu başka bir üyeye devretmelisin.",
        [
          { text: "Vazgeç", style: "cancel" },
          {
            text: "Devret",
            onPress: () => setIsTransferModalVisible(true),
          },
        ],
      );
      return;
    }

    if (isOwner && otherMembers.length === 0) {
      showAlert(
        "Ortak alanı sil",
        "Bu ortak alanda senden başka kimse yok. Çıkarsan ortak alan tamamen silinir.",
        [
          { text: "Vazgeç", style: "cancel" },
          {
            text: "Sil",
            style: "destructive",
            onPress: handleDeleteHousehold,
          },
        ],
      );
      return;
    }

    showAlert(
      "Ortak alandan çık",
      "Bu ortak alandan çıkmak istediğine emin misin?",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Çık",
          style: "destructive",
          onPress: async () => {
            setIsHouseholdActionLoading(true);

            try {
              const { error } = await supabase.rpc("leave_household", {
                target_household_id: household.id,
              });

              if (error) {
                showAlert("Çıkılamadı", error.message);
                return;
              }

              await supabase.auth.refreshSession();

              router.replace("/(onboarding)");
            } finally {
              setIsHouseholdActionLoading(false);
            }
          },
        },
      ],
    );
  }

  async function handleDeleteHousehold() {
    if (!household) return;

    showAlert(
      "Ortak alanı sil",
      "Bu işlem tüm harcamaları, kategorileri, hazır harcamaları ve üyelikleri kalıcı olarak siler. Emin misin?",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Kalıcı Olarak Sil",
          style: "destructive",
          onPress: async () => {
            setIsHouseholdActionLoading(true);

            try {
              const { error } = await supabase.rpc(
                "delete_household_as_owner",
                {
                  target_household_id: household.id,
                },
              );

              if (error) {
                showAlert("Silinemedi", error.message);
                return;
              }

              router.replace("/(onboarding)");
            } catch (error) {
              showAlert(
                "Beklenmeyen hata",
                error instanceof Error
                  ? error.message
                  : "Ortak alan silinirken hata oluştu.",
              );
            } finally {
              setIsHouseholdActionLoading(false);
            }
          },
        },
      ],
    );
  }

  async function handleTransferOwnership(targetUserId: string) {
    if (!household || !currentUserId) return;

    showAlert(
      "Kuruculuğu devret",
      "Kuruculuğu bu üyeye devredip ortak alandan çıkmak istiyor musun?",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Devret ve Çık",
          style: "destructive",
          onPress: async () => {
            setIsHouseholdActionLoading(true);

            try {
              const { error } = await supabase.rpc(
                "transfer_ownership_and_leave",
                {
                  target_household_id: household.id,

                  new_owner_user_id: targetUserId,
                },
              );

              if (error) {
                showAlert("Devredilemedi", error.message);

                return;
              }

              setIsTransferModalVisible(false);

              router.replace("/(onboarding)");
            } finally {
              setIsHouseholdActionLoading(false);
            }
          },
        },
      ],
    );
  }

  async function handleLogout() {
    showAlert("Çıkış yap", "Hesabından çıkış yapmak istiyor musun?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Çıkış Yap",
        style: "destructive",
        onPress: async () => {
          setIsLoggingOut(true);

          const { error } = await supabase.auth.signOut();

          setIsLoggingOut(false);

          if (error) {
            showAlert("Çıkış yapılamadı", error.message);
            return;
          }

          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  if (isLoading) {
    return (
      <AppScreen backgroundColor={SCREEN_BG}>
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
      </AppScreen>
    );
  }

  if (errorMessage) {
    return (
      <AppScreen backgroundColor={SCREEN_BG}>
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
                color: DANGER_RED,
                textAlign: "center",
                fontWeight: "900",
              }}
            >
              {errorMessage}
            </Text>
          </View>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen backgroundColor={SCREEN_BG}>
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
                position: "relative",
              }}
            >
              <Pressable
                onPress={handleCopyInviteCode}
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  width: 34,
                  height: 34,
                  borderRadius: 12,
                  backgroundColor: "#FFE8B8",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: SOFT_YELLOW,
                  zIndex: 2,
                }}
              >
                <Text style={{ fontSize: 17 }}>📋</Text>
              </Pressable>

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
                  paddingRight: 42,
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
                marginBottom: 12,
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

          <Pressable
            onPress={handleShareInviteCode}
            style={{
              height: 46,
              borderRadius: 16,
              backgroundColor: PRIMARY_BLUE,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "900" }}>
              Davet Kodunu Paylaş
            </Text>
          </Pressable>
        </View>

        <View
          style={{
            padding: 18,
            borderRadius: 26,
            backgroundColor: CARD_BG,
            borderWidth: 1,
            borderColor: SOFT_YELLOW,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              color: TEXT_DARK,
              fontWeight: "900",
              marginBottom: 6,
            }}
          >
            Ortak Alan İşlemleri
          </Text>

          <Text
            style={{
              fontSize: 13,
              lineHeight: 19,
              color: TEXT_MUTED,
              fontWeight: "600",
              marginBottom: 14,
            }}
          >
            {isOwner
              ? "Kurucu olduğun için çıkmadan önce sahipliği devredebilir veya ortak alanı silebilirsin."
              : "Bu ortak alandan ayrılabilirsin. Harcamalar silinmez."}
          </Text>

          <Pressable
            onPress={handleLeaveHousehold}
            disabled={isHouseholdActionLoading}
            style={{
              height: 48,
              borderRadius: 18,
              backgroundColor: "#FFFFFF",
              borderWidth: 1,
              borderColor: "#FCA5A5",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: isOwner ? 10 : 0,
            }}
          >
            <Text
              style={{
                color: DANGER_RED,
                fontSize: 14,
                fontWeight: "900",
              }}
            >
              {isOwner ? "Devrederek Çık" : "Ortak Alandan Çık"}
            </Text>
          </Pressable>

          {isOwner && (
            <Pressable
              onPress={handleDeleteHousehold}
              disabled={isHouseholdActionLoading}
              style={{
                height: 48,
                borderRadius: 18,
                backgroundColor: DANGER_RED,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 14,
                  fontWeight: "900",
                }}
              >
                Ortak Alanı Sil
              </Text>
            </Pressable>
          )}
        </View>

        <View
          style={{
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
              backgroundColor: isLoggingOut ? "#FCA5A5" : DANGER_RED,
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
          if (!isSavingName) closeEditNameModal();
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
            style={{
              width: "100%",
              maxWidth: 390,
            }}
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
                alignSelf: "center",
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

      <Modal
        visible={isTransferModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isHouseholdActionLoading) setIsTransferModalVisible(false);
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
          <View
            style={{
              width: "100%",
              maxWidth: 390,
              borderRadius: 28,
              backgroundColor: CARD_BG,
              padding: 24,
              borderWidth: 1,
              borderColor: SOFT_YELLOW,
            }}
          >
            <Text
              style={{
                fontSize: 24,
                fontWeight: "900",
                color: TEXT_DARK,
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              Kuruculuğu Devret
            </Text>

            <Text
              style={{
                fontSize: 15,
                color: TEXT_MUTED,
                textAlign: "center",
                marginBottom: 18,
                fontWeight: "600",
              }}
            >
              Ortak alandan çıkmadan önce yeni kurucuyu seç.
            </Text>

            {otherMembers.length === 0 ? (
              <Text
                style={{
                  color: TEXT_MUTED,
                  textAlign: "center",
                  fontWeight: "800",
                  marginBottom: 12,
                }}
              >
                Devredilecek başka üye yok.
              </Text>
            ) : (
              otherMembers.map((member) => (
                <Pressable
                  key={member.id}
                  onPress={() => handleTransferOwnership(member.user_id)}
                  disabled={isHouseholdActionLoading}
                  style={{
                    padding: 14,
                    borderRadius: 18,
                    backgroundColor: "#FFFFFF",
                    borderWidth: 1,
                    borderColor: INPUT_BORDER,
                    marginBottom: 10,
                  }}
                >
                  <Text
                    style={{
                      color: TEXT_DARK,
                      fontWeight: "900",
                      fontSize: 15,
                    }}
                  >
                    {getMemberFullName(member)}
                  </Text>

                  <Text
                    style={{
                      color: TEXT_MUTED,
                      fontWeight: "700",
                      fontSize: 13,
                      marginTop: 2,
                    }}
                  >
                    Yeni kurucu olarak seç
                  </Text>
                </Pressable>
              ))
            )}

            <Pressable
              onPress={() => setIsTransferModalVisible(false)}
              disabled={isHouseholdActionLoading}
              style={{
                height: 54,
                borderRadius: 20,
                backgroundColor: "#FFFFFF",
                borderWidth: 1,
                borderColor: INPUT_BORDER,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 8,
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
        </View>
      </Modal>
    </AppScreen>
  );
}
