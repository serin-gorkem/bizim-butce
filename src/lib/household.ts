import { router } from "expo-router";
import { showAlert } from "../utils/appAlert";
import { supabase } from "./supabase";

export async function getCurrentUserHousehold() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Kullanıcı bilgisi alınamadı.");
  }

  const { data, error } = await supabase
    .from("household_members")
    .select(
      `
      household_id,
      role,
      households (
        id,
        name,
        invite_code
      )
    `,
    )
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }
  return data;
}

export async function guardActiveHousehold() {
  const membership = await getCurrentUserHousehold();
  if (!membership) {
    showAlert(
      "Ortak alan bulunamadı",
      "Ortak alan silinmiş veya artık bu ortak alanda değilsin.",
    );
    router.replace("/(onboarding)");
    return null;
  }

  const { data: household, error } = await supabase
    .from("households")
    .select("id")
    .eq("id", membership.household_id)
    .maybeSingle();
  if (error || !household) {
    showAlert(
      "Ortak alan silinmiş",
      "Bu ortak alan artık mevcut değil. Yeni bir ortak alan oluşturabilir veya davet koduyla katılabilirsin.",
    );
    router.replace("/(onboarding)");
    return null;
  }
  return membership;
}
