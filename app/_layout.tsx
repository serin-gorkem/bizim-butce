import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const SCREEN_BG = "#fcedd9";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: SCREEN_BG }}>
      <Stack
        screenOptions={{
          contentStyle: {
            backgroundColor: SCREEN_BG,
          },
          headerStyle: {
            backgroundColor: SCREEN_BG,
          },
          headerShadowVisible: false,
          headerTitleAlign: "center",
          headerTintColor: "#3B2414",
          headerTitleStyle: {
            color: "#3B2414",
            fontSize: 16,
            fontWeight: "900",
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="(auth)/welcome"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="(auth)/login"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="(auth)/register"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="(onboarding)"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
      </Stack>

      <StatusBar style="dark" backgroundColor={SCREEN_BG} />
    </GestureHandlerRootView>
  );
}
