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
import { friendlyAuthError, sessionFromTokenResponse, signIn, signUp } from "../lib/supabase";
import { saveSession } from "../lib/session";
import type { Session } from "../types";
import { Toast, ToastKind } from "../components/Toast";

type Mode = "signin" | "signup";

interface Props {
  onSignedIn: (session: Session) => void;
}

export function AuthScreen({ onSignedIn }: Props) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; kind: ToastKind; token: number } | null>(null);

  const copy = mode === "signin" ? SIGNIN_COPY : SIGNUP_COPY;

  const showToast = (message: string, kind: ToastKind) =>
    setToast({ message, kind, token: Date.now() });

  const toggleMode = () => {
    setToast(null);
    setMode((m) => (m === "signin" ? "signup" : "signin"));
  };

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      showToast("E-posta ve şifre gerekli.", "error");
      return;
    }
    setSubmitting(true);
    setToast(null);
    try {
      if (mode === "signup") {
        const data = await signUp(trimmedEmail, password);
        if (data?.session && (data.session as Session).access_token) {
          const sess = sessionFromTokenResponse(data.session as any);
          await saveSession(sess);
          onSignedIn(sess);
          return;
        }
        showToast(
          `${trimmedEmail} adresine bir onay e-postası gönderildi. Gelen kutunu kontrol et; bağlantıya tıkla, sonra buradan giriş yap.`,
          "success"
        );
        setMode("signin");
        setPassword("");
      } else {
        const sess = await signIn(trimmedEmail, password);
        await saveSession(sess);
        onSignedIn(sess);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(friendlyAuthError(msg), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>

          <View style={styles.field}>
            <Text style={styles.label}>E-POSTA</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              placeholder="ornek@mail.com"
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              selectionColor={colors.primary}
              editable={!submitting}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>ŞİFRE</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder="En az 6 karakter"
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              selectionColor={colors.primary}
              editable={!submitting}
            />
          </View>

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
              <Text style={styles.submitText}>{copy.submit}</Text>
            )}
          </Pressable>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>{copy.switchQuestion}</Text>
            <Pressable onPress={toggleMode} hitSlop={6}>
              <Text style={styles.switchLink}>{copy.switchAction}</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.footer}>Bahçem · Niyet yönetim uygulaması</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const SIGNIN_COPY = {
  title: "Bahçene Gir",
  subtitle: "Niyetlerini kaydet ve takip et.",
  submit: "Giriş Yap",
  switchQuestion: "Henüz hesabın yok mu?",
  switchAction: "Hesap oluştur",
};

const SIGNUP_COPY = {
  title: "Bahçeni Oluştur",
  subtitle: "Kendi niyet koleksiyonunu kurmaya başla.",
  submit: "Hesap Oluştur",
  switchQuestion: "Zaten hesabın var mı?",
  switchAction: "Giriş yap",
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[8],
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
