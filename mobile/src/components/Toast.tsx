import React, { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withDelay } from "react-native-reanimated";
import { colors, radii, spacing, typography } from "../theme";

export type ToastKind = "success" | "error" | "info";

interface Props {
  message: string | null;
  kind?: ToastKind;
  token?: number; // force re-animate when new message arrives
}

export function Toast({ message, kind = "info", token = 0 }: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  useEffect(() => {
    if (!message) return;
    opacity.value = 0;
    translateY.value = 8;
    opacity.value = withSequence(
      withTiming(1, { duration: 180 }),
      withDelay(2200, withTiming(0, { duration: 260 }))
    );
    translateY.value = withTiming(0, { duration: 180 });
  }, [message, token, opacity, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!message) return null;
  const palette = KIND_STYLES[kind];

  return (
    <Animated.View style={[styles.wrap, { backgroundColor: palette.bg, borderColor: palette.border }, animStyle]}>
      <Text style={[styles.text, { color: palette.text }]} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
}

const KIND_STYLES = {
  success: { bg: colors.successSoft, border: "#bbf7d0", text: colors.success },
  error: { bg: colors.dangerSoft, border: "#fecaca", text: colors.danger },
  info: { bg: colors.primaryFaint, border: colors.primarySoft, text: colors.primary },
} as const;

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radii.md,
    borderWidth: 1,
  },
  text: {
    ...typography.body,
    fontSize: 13,
    fontWeight: "500",
  },
});
