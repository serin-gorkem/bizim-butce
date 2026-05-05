import { Platform, Pressable, Text, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";

type ExpenseSwipeActionsProps = {
  children: React.ReactNode;
  onDelete: () => void;
};

export function ExpenseSwipeActions({
  children,
  onDelete,
}: ExpenseSwipeActionsProps) {
  if (Platform.OS === "web") {
    return (
      <View style={{ marginBottom: 12 }}>
        {children}

        <Pressable
          onPress={onDelete}
          style={{
            height: 44,
            borderRadius: 16,
            backgroundColor: "#DC2626",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 8,
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 14,
              fontWeight: "900",
            }}
          >
            Sil
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Swipeable
      renderRightActions={() => (
        <Pressable
          onPress={onDelete}
          style={{
            width: 88,
            minHeight: 74,
            backgroundColor: "#DC2626",
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 14,
              fontWeight: "900",
            }}
          >
            Sil
          </Text>
        </Pressable>
      )}
    >
      {children}
    </Swipeable>
  );
}
