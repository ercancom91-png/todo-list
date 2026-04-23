import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Leaf } from "lucide-react-native";
import { colors, spacing, typography } from "../theme";

interface Props {
  title: string;
  hint?: string;
}

export function Empty({ title, hint }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Leaf size={28} color={colors.textSubtle} strokeWidth={1.4} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[5],
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[3],
  },
  title: {
    ...typography.body,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing[1],
  },
  hint: {
    ...typography.caption,
    textAlign: "center",
  },
});
