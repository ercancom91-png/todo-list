import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "../theme";
import type { FilterMode } from "../types";

interface Props {
  value: FilterMode;
  onChange: (v: FilterMode) => void;
}

const OPTIONS: { value: FilterMode; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "active", label: "Filizlenenler" },
  { value: "completed", label: "Çiçeklenenler" },
];

export function Filters({ value, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.btn, active && styles.btnActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 3,
    gap: 2,
  },
  btn: {
    flex: 1,
    paddingVertical: spacing[2],
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  btnActive: {
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  label: {
    ...typography.label,
    color: colors.textMuted,
  },
  labelActive: {
    color: colors.text,
  },
});
