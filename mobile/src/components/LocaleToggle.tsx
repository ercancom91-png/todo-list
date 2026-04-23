import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "../theme";
import { useI18n, Locale } from "../i18n";

export function LocaleToggle() {
  const { locale, setLocale } = useI18n();
  return (
    <View style={styles.wrap}>
      {(["tr", "en"] as Locale[]).map((l, idx) => {
        const active = locale === l;
        return (
          <React.Fragment key={l}>
            {idx > 0 ? <View style={styles.divider} /> : null}
            <Pressable
              onPress={() => setLocale(l)}
              hitSlop={4}
              style={styles.btn}
              accessibilityRole="button"
              accessibilityLabel={`Switch to ${l.toUpperCase()}`}
            >
              <Text style={[styles.label, active && styles.labelActive]}>{l.toUpperCase()}</Text>
            </Pressable>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 2,
  },
  btn: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1] + 2,
    minWidth: 32,
    alignItems: "center",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: colors.textSubtle,
  },
  labelActive: {
    color: colors.text,
  },
  divider: {
    width: 1,
    height: 14,
    backgroundColor: colors.border,
  },
});
