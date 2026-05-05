// src/utils/appAlert.ts
import { Alert, Platform } from "react-native";

type AlertButton = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
};

export function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
) {
  if (Platform.OS !== "web") {
    Alert.alert(title, message, buttons);
    return;
  }

  const fullMessage = message ? `${title}\n\n${message}` : title;

  if (!buttons || buttons.length === 0) {
    window.alert(fullMessage);
    return;
  }

  const destructiveButton = buttons.find(
    (button) => button.style === "destructive",
  );

  const normalButton =
    buttons.find((button) => button.style !== "cancel") ?? buttons[0];

  if (destructiveButton) {
    const confirmed = window.confirm(fullMessage);

    if (confirmed) {
      destructiveButton.onPress?.();
    }

    return;
  }

  window.alert(fullMessage);
  normalButton?.onPress?.();
}
