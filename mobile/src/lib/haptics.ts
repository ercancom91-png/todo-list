import * as Haptics from "expo-haptics";

export function selectionTap(): void {
  Haptics.selectionAsync().catch(() => {});
}

export function successTap(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function errorTap(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}
