import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, Text, View } from "react-native";

import { supabase } from "../src/lib/supabase";

type AppState = "loading" | "unauthenticated" | "needs-onboarding" | "ready";

export default function IndexScreen() {
  const [appState, setAppState] = useState<AppState>("loading");

  useEffect(() => {
    async function checkAppState() {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        setAppState("unauthenticated");
        return;
      }

      const { data: membership, error: membershipError } = await supabase
        .from("household_members")
        .select("id, household_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (membershipError) {
        setAppState("needs-onboarding");
        return;
      }

      if (!membership) {
        setAppState("needs-onboarding");
        return;
      }

      setAppState("ready");
    }

    checkAppState();
  }, []);

  if (appState === "loading") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F7" }}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <ActivityIndicator />
          <Text style={{ color: "#6B7280" }}>Oturum kontrol ediliyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (appState === "unauthenticated") {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (appState === "needs-onboarding") {
    return <Redirect href="/(onboarding)" />;
  }

  return <Redirect href="/(tabs)/home" />;
}
