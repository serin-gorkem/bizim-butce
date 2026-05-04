import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack>
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

      <StatusBar style="auto" />
    </GestureHandlerRootView>
  );
}
