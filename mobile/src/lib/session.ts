import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "../types";

const KEY = "bahcem.session.v1";

export async function saveSession(s: Session | null): Promise<void> {
  if (s) await AsyncStorage.setItem(KEY, JSON.stringify(s));
  else await AsyncStorage.removeItem(KEY);
}

export async function loadSession(): Promise<Session | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (s.expires_at && s.expires_at * 1000 < Date.now()) return null;
    return s;
  } catch {
    return null;
  }
}
