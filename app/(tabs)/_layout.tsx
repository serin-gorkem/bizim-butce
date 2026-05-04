import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

type TabIconName =
  | "home"
  | "home-outline"
  | "add-circle"
  | "add-circle-outline"
  | "receipt"
  | "receipt-outline"
  | "flash"
  | "flash-outline"
  | "settings"
  | "settings-outline";

function getTabIcon(routeName: string, focused: boolean): TabIconName {
  if (routeName === "home") {
    return focused ? "home" : "home-outline";
  }

  if (routeName === "add") {
    return focused ? "add-circle" : "add-circle-outline";
  }

  if (routeName === "expenses") {
    return focused ? "receipt" : "receipt-outline";
  }

  if (routeName === "templates") {
    return focused ? "flash" : "flash-outline";
  }

  if (routeName === "settings") {
    return focused ? "settings" : "settings-outline";
  }

  return focused ? "home" : "home-outline";
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: true,
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          height: 76,
          paddingTop: 8,
          paddingBottom: 12,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#DBEAFE",
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "800",
        },
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons
            name={getTabIcon(route.name, focused)}
            size={size + 2}
            color={color}
          />
        ),
      })}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Ana Sayfa",
        }}
      />

      <Tabs.Screen
        name="add"
        options={{
          title: "Ekle",
        }}
      />

      <Tabs.Screen
        name="expenses"
        options={{
          title: "Harcamalar",
        }}
      />

      <Tabs.Screen
        name="templates"
        options={{
          title: "Templates",
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Ayarlar",
        }}
      />
    </Tabs>
  );
}
