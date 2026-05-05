import { Tabs } from "expo-router";
import { Platform, Text, View } from "react-native";

const SCREEN_BG = "#fcedd9";
const TAB_BG = "#FFF9F0";
const TEXT_MUTED = "#9A6B3D";
const PRIMARY_BLUE = "#2563EB";
const WARM_BROWN = "#92400E";
const SOFT_YELLOW = "#FDE68A";

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <View
      style={{
        width: 34,
        height: 30,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: focused ? "#DBEAFE" : "transparent",
        borderWidth: focused ? 1 : 0,
        borderColor: focused ? "#BFDBFE" : "transparent",
      }}
    >
      <Text
        style={{
          fontSize: 20,
          opacity: focused ? 1 : 0.58,
        }}
      >
        {icon}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
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

        tabBarActiveTintColor: PRIMARY_BLUE,
        tabBarInactiveTintColor: TEXT_MUTED,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "900",
          marginTop: 2,
        },
        tabBarStyle: {
          height: Platform.OS === "ios" ? 82 : 68,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 22 : 10,
          backgroundColor: TAB_BG,
          borderTopWidth: 1,
          borderTopColor: SOFT_YELLOW,
          shadowColor: WARM_BROWN,
          shadowOpacity: 0.08,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: -6 },
          elevation: 8,
        },
        sceneStyle: {
          backgroundColor: SCREEN_BG,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Ana Sayfa",
          tabBarLabel: "Ana Sayfa",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={focused ? "🏝️" : "🏠"} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="add"
        options={{
          title: "Ekle",
          tabBarLabel: "Ekle",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={focused ? "🌺" : "➕"} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="expenses"
        options={{
          title: "Harcamalar",
          tabBarLabel: "Harcamalar",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={focused ? "🧾" : "📋"} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="templates"
        options={{
          title: "Hazır",
          tabBarLabel: "Hazır",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={focused ? "🧺" : "🐚"} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Ayarlar",
          tabBarLabel: "Ayarlar",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={focused ? "🌴" : "⚙️"} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
