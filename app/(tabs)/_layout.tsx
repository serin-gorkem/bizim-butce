import { Tabs } from "expo-router";
import {
  House,
  PlusCircle,
  ReceiptText,
  Settings,
  ShoppingBasket,
} from "lucide-react-native";

const SCREEN_BG = "#fcedd9";
const TEXT_DARK = "#3B2414";
const TEXT_MUTED = "#9A7A5A";
const PRIMARY_BLUE = "#2563EB";
const CARD_BG = "#FFF9F0";
const SOFT_YELLOW = "#FDE68A";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: SCREEN_BG,
        },
        headerShadowVisible: false,
        headerTitleAlign: "center",
        headerTintColor: TEXT_DARK,
        headerTitleStyle: {
          color: TEXT_DARK,
          fontSize: 16,
          fontWeight: "900",
        },

        tabBarActiveTintColor: PRIMARY_BLUE,
        tabBarInactiveTintColor: TEXT_MUTED,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "900",
          marginTop: 2,
        },
        tabBarStyle: {
          height: 76,
          paddingTop: 8,
          paddingBottom: 12,
          backgroundColor: CARD_BG,
          borderTopWidth: 1,
          borderTopColor: SOFT_YELLOW,
        },
        tabBarItemStyle: {
          borderRadius: 18,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Ana Sayfa",
          tabBarIcon: ({ color, size, focused }) => (
            <House
              color={color}
              size={focused ? size + 2 : size}
              strokeWidth={focused ? 3 : 2.3}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="add"
        options={{
          title: "Ekle",
          tabBarIcon: ({ color, size, focused }) => (
            <PlusCircle
              color={color}
              size={focused ? size + 2 : size}
              strokeWidth={focused ? 3 : 2.3}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="expenses"
        options={{
          title: "Harcamalar",
          tabBarLabel: "Harcamalar",
          tabBarIcon: ({ color, size, focused }) => (
            <ReceiptText
              color={color}
              size={focused ? size + 2 : size}
              strokeWidth={focused ? 3 : 2.3}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="templates"
        options={{
          title: "Hazır",
          tabBarLabel: "Hazır",
          tabBarIcon: ({ color, size, focused }) => (
            <ShoppingBasket
              color={color}
              size={focused ? size + 2 : size}
              strokeWidth={focused ? 3 : 2.3}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Ayarlar",
          tabBarIcon: ({ color, size, focused }) => (
            <Settings
              color={color}
              size={focused ? size + 2 : size}
              strokeWidth={focused ? 3 : 2.3}
            />
          ),
        }}
      />
    </Tabs>
  );
}
