import type { TextStyle } from "react-native";

export const colors = {
  background: "#f5f5f4",
  surface: "#ffffff",
  surfaceAlt: "#fafaf9",
  surfaceHover: "#f5f5f4",

  text: "#1c1917",
  textMuted: "#78716c",
  textSubtle: "#a8a29e",

  border: "#e7e5e4",
  borderStrong: "#d6d3d1",

  primary: "#0f766e",
  primaryHover: "#115e59",
  primarySoft: "#ccfbf1",
  primaryFaint: "#f0fdfa",

  accent: "#b45309",
  accentSoft: "#fef3c7",

  success: "#15803d",
  successSoft: "#dcfce7",
  danger: "#b91c1c",
  dangerSoft: "#fee2e2",

  white: "#ffffff",
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
} as const;

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
} as const;

export const typography: Record<string, TextStyle> = {
  title: { fontSize: 22, fontWeight: "700", color: colors.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, fontWeight: "400", color: colors.textMuted },
  body: { fontSize: 15, fontWeight: "400", color: colors.text },
  bodyMuted: { fontSize: 15, fontWeight: "400", color: colors.textMuted },
  label: { fontSize: 12, fontWeight: "600", letterSpacing: 0.4, color: colors.textMuted },
  caption: { fontSize: 12, fontWeight: "400", color: colors.textSubtle },
  button: { fontSize: 15, fontWeight: "600", color: colors.white },
  link: { fontSize: 14, fontWeight: "600", color: colors.primary },
};
