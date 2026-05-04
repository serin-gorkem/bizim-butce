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
