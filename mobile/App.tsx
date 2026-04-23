import "react-native-reanimated";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import * as Linking from "expo-linking";
import { StatusBar } from "expo-status-bar";

import { AuthScreen } from "./src/screens/AuthScreen";
import { AppScreen } from "./src/screens/AppScreen";
import { loadSession, saveSession } from "./src/lib/session";
import { fetchUserFromToken } from "./src/lib/supabase";
import { colors } from "./src/theme";
import type { Session } from "./src/types";

function parseHash(url: string): Record<string, string> | null {
  const hashIdx = url.indexOf("#");
  if (hashIdx === -1) return null;
  const fragment = url.slice(hashIdx + 1);
  if (!fragment) return null;
  const params: Record<string, string> = {};
  for (const pair of fragment.split("&")) {
    const [key, value = ""] = pair.split("=");
    if (!key) continue;
    params[decodeURIComponent(key)] = decodeURIComponent(value);
  }
  return params;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);

  const applyCallbackUrl = useCallback(async (url: string): Promise<boolean> => {
    const params = parseHash(url);
    if (!params) return false;
    if (params.error) return false;
    if (!params.access_token) return false;

    const access_token = params.access_token;
    const refresh_token = params.refresh_token ?? "";
    const expires_in = parseInt(params.expires_in || "3600", 10);

    const user = await fetchUserFromToken(access_token);
    const newSession: Session = {
      access_token,
      refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + expires_in,
      user,
    };
    await saveSession(newSession);
    setSession(newSession);
    return true;
  }, []);

  useEffect(() => {
    let unsubscribed = false;

    const boot = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          const handled = await applyCallbackUrl(initialUrl);
          if (handled) {
            if (!unsubscribed) setBooting(false);
            return;
          }
        }

        const saved = await loadSession();
        if (!unsubscribed && saved) {
          setSession(saved);
        }
      } finally {
        if (!unsubscribed) setBooting(false);
      }
    };

    boot();

    const sub = Linking.addEventListener("url", (event) => {
      applyCallbackUrl(event.url);
    });

    return () => {
      unsubscribed = true;
      sub.remove();
    };
  }, [applyCallbackUrl]);

  if (booting) {
    return (
      <View style={styles.boot}>
        <StatusBar style="dark" />
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return <AuthScreen onSignedIn={setSession} />;
  }

  return <AppScreen session={session} onSignedOut={() => setSession(null)} />;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});
