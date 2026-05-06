import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { guardActiveHousehold } from "@/lib/household";
import { AppScreen } from "../components/AppScreen";
import { supabase } from "../src/lib/supabase";

const SCREEN_BG = "#fcedd9";
const PRIMARY_BLUE = "#2563EB";

export default function IndexScreen() {
  useEffect(() => {
    async function bootstrap() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/(auth)/welcome");
        return;
      }

      const membership = await guardActiveHousehold();

      if (membership) {
        router.replace("/(tabs)/home");
        return;
      }

      router.replace("/(onboarding)");
    }

    bootstrap();
  }, []);

  return (
    <AppScreen backgroundColor={SCREEN_BG}>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={PRIMARY_BLUE} />
      </View>
    </AppScreen>
  );
}
