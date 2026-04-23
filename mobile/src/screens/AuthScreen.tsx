import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors, radii, spacing, typography } from "../theme";
import {
  authErrorKey,
  recoverPassword,
  sessionFromTokenResponse,
  signIn,
  signUp,
} from "../lib/supabase";
import { saveSession } from "../lib/session";
import type { Session } from "../types";
import { Toast, ToastKind } from "../components/Toast";
import { LocaleToggle } from "../components/LocaleToggle";
import { useI18n } from "../i18n";

type Mode = "signin" | "signup" | "recover";

interface Props {
  onSignedIn: (session: Session) => void;
}

export function AuthScreen({ onSignedIn }: Props) {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; kind: ToastKind; token: number } | null>(null);

  const showToast = (message: string, kind: ToastKind) =>
    setToast({ message, kind, token: Date.now() });

  const clearToast = () => setToast(null);

  const switchMode = (next: Mode) => {
    clearToast();
    setMode(next);
  };

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      showToast(t("auth.error.emptyEmail"), "error");
      return;
    }
    if (mode !== "recover" && !password) {
      showToast(t("auth.error.emptyFields"), "error");
      return;
    }
    setSubmitting(true);
    clearToast();
    try {
      if (mode === "signup") {
        const data = await signUp(trimmedEmail, password);
        if (data?.session && (data.session as Session).access_token) {
          const sess = sessionFromTokenResponse(data.session as any);
          await saveSession(sess);
          onSignedIn(sess);
          return;
        }
        showToast(t("auth.success.signUp", { email: trimmedEmail }), "success");
        setMode("signin");
        setPassword("");
      } else if (mode === "signin") {
        const sess = await signIn(trimmedEmail, password);
        await saveSession(sess);
        onSignedIn(sess);
      } else {
        await recoverPassword(trimmedEmail);
        showToast(t("auth.success.recover", { email: trimmedEmail }), "success");
        setMode("signin");
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const key = authErrorKey(raw);
      showToast(key ? t(key) : raw, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const titleKey =
    mode === "signup" ? "auth.signUp.title" : mode === "recover" ? "auth.recover.title" : "auth.signIn.title";
  const subtitleKey =
    mode === "signup" ? "auth.signUp.subtitle" : mode === "recover" ? "auth.recover.subtitle" : "auth.signIn.subtitle";
  const submitKey =
    mode === "signup" ? "auth.submit.signUp" : mode === "recover" ? "auth.submit.recover" : "auth.submit.signIn";

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="dark" />
      <View style={styles.topBar}>
        <LocaleToggle />
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.title}>{t(titleKey)}</Text>
          <Text style={styles.subtitle}>{t(subtitleKey)}</Text>

          <View style={styles.field}>
            <Text style={styles.label}>{t("auth.emailLabel")}</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              placeholder={t("auth.emailPlaceholder")}
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              selectionColor={colors.primary}
              editable={!submitting}
            />
          </View>

          {mode !== "recover" ? (
            <View style={styles.field}>
              <Text style={styles.label}>{t("auth.passwordLabel")}</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder={t("auth.passwordPlaceholder")}
                placeholderTextColor={colors.textSubtle}
                style={styles.input}
                selectionColor={colors.primary}
                editable={!submitting}
              />
              {mode === "signin" ? (
                <Pressable onPress={() => switchMode("recover")} hitSlop={6} style={styles.forgotBtn}>
                  <Text style={styles.forgotText}>{t("auth.forgot")}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {toast ? (
            <View style={{ marginTop: spacing[1] }}>
              <Toast message={toast.message} kind={toast.kind} token={toast.token} />
            </View>
          ) : null}

          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={({ pressed }) => [
              styles.submit,
              submitting && styles.submitDisabled,
              pressed && !submitting && styles.submitPressed,
            ]}
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitText}>{t(submitKey)}</Text>
            )}
          </Pressable>

          {mode === "signin" ? (
            <View style={styles.switchRow}>
              <Text style={styles.switchText}>{t("auth.switch.toSignUp.q")}</Text>
              <Pressable onPress={() => switchMode("signup")} hitSlop={6}>
                <Text style={styles.switchLink}>{t("auth.switch.toSignUp.a")}</Text>
              </Pressable>
            </View>
          ) : mode === "signup" ? (
            <View style={styles.switchRow}>
              <Text style={styles.switchText}>{t("auth.switch.toSignIn.q")}</Text>
              <Pressable onPress={() => switchMode("signin")} hitSlop={6}>
                <Text style={styles.switchLink}>{t("auth.switch.toSignIn.a")}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.switchRow}>
              <Pressable onPress={() => switchMode("signin")} hitSlop={6}>
                <Text style={styles.switchLink}>{t("auth.backToSignIn")}</Text>
              </Pressable>
            </View>
          )}
        </View>

        <Text style={styles.footer}>{t("auth.footer")}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: spacing[5],
    paddingTop: Platform.OS === "ios" ? 60 : 40,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[5],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[6],
    gap: spacing[3],
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  title: {
    ...typography.title,
    fontSize: 24,
    marginBottom: spacing[1],
  },
  subtitle: {
    ...typography.subtitle,
    marginBottom: spacing[2],
  },
  field: {
    gap: spacing[1] + 2,
  },
  label: {
    ...typography.label,
  },
  input: {
    ...typography.body,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing[3] + 2,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    minHeight: 44,
    color: colors.text,
  },
  forgotBtn: {
    alignSelf: "flex-end",
    paddingVertical: spacing[1],
  },
  forgotText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
    fontSize: 12,
  },
  submit: {
    marginTop: spacing[2],
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  submitPressed: {
    backgroundColor: colors.primaryHover,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    ...typography.button,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing[1] + 2,
    marginTop: spacing[2],
  },
  switchText: {
    ...typography.subtitle,
  },
  switchLink: {
    ...typography.link,
  },
  footer: {
    ...typography.caption,
    textAlign: "center",
    marginTop: spacing[5],
  },
});
