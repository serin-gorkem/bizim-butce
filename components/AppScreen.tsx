import { Platform, SafeAreaView, View } from "react-native";

type AppScreenProps = {
  children: React.ReactNode;
  backgroundColor?: string;
};

export function AppScreen({
  children,
  backgroundColor = "#fcedd9",
}: AppScreenProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>
      <View
        style={{
          flex: 1,
          width: "100%",
          maxWidth: Platform.OS === "web" ? 430 : undefined,
          alignSelf: "center",
          backgroundColor,
          overflow: "hidden",
        }}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}
