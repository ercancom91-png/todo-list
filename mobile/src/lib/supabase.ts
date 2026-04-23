import * as Linking from "expo-linking";
import type { Session, Task } from "../types";
import { saveSession } from "./session";

export const SUPABASE_URL = "https://neprqaxvdpqtjrxrvwka.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lcHJxYXh2ZHBxdGpyeHJ2d2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjEyNjYsImV4cCI6MjA5MjMzNzI2Nn0.vlMZPyJhhz1EJeZFKfjZl3DQ8KHMh5g7LWsovVoUiVI";

const TABLE = "tasks";
const REST = `${SUPABASE_URL}/rest/v1/${TABLE}`;
const AUTH = `${SUPABASE_URL}/auth/v1`;

// Email confirmation lands here. In dev and until deep-link scheme is
// whitelisted in Supabase uri_allow_list, use the web site which is
// already allow-listed. The user can confirm in the browser, then
// sign in on mobile with the same credentials.
const WEB_URL = "https://ercancom91-png.github.io/todo-list/";

export function redirectUrl(): string {
  if (__DEV__) return WEB_URL;
  // Standalone build: bahcem:// — requires uri_allow_list entry.
  return Linking.createURL("/");
}

function extractErrorMessage(data: unknown, status: number): string {
  const d = data as { msg?: string; error_description?: string; message?: string } | undefined;
  return d?.msg || d?.error_description || d?.message || `Hata (${status})`;
}

export async function signUp(email: string, password: string): Promise<{ session?: Session | null; user?: unknown }> {
  const url = `${AUTH}/signup?redirect_to=${encodeURIComponent(redirectUrl())}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractErrorMessage(data, res.status));
  return data;
}

export async function signIn(email: string, password: string): Promise<Session> {
  const res = await fetch(`${AUTH}/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractErrorMessage(data, res.status));
  return sessionFromTokenResponse(data);
}

export async function recoverPassword(email: string): Promise<void> {
  const url = `${AUTH}/recover?redirect_to=${encodeURIComponent(redirectUrl())}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(data, res.status));
  }
}

export async function signOutRemote(session: Session): Promise<void> {
  try {
    await fetch(`${AUTH}/logout`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
    });
  } catch {
    /* ignore */
  }
}

export function sessionFromTokenResponse(data: any): Session {
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
    user: data.user ? { id: data.user.id, email: data.user.email } : null,
  };
}

export async function fetchUserFromToken(access_token: string): Promise<Session["user"]> {
  try {
    const res = await fetch(`${AUTH}/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${access_token}` },
    });
    if (!res.ok) return null;
    const u = await res.json();
    return { id: u.id, email: u.email };
  } catch {
    return null;
  }
}

class UnauthorizedError extends Error {
  constructor() {
    super("unauthorized");
  }
}

export async function api<T = unknown>(
  session: Session,
  path: string,
  options: RequestInit = {},
  onUnauthorized?: () => void
): Promise<T | null> {
  const res = await fetch(`${REST}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    await saveSession(null);
    onUnauthorized?.();
    throw new UnauthorizedError();
  }
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`${res.status} ${t}`);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : null;
}

export const fetchTasks = (session: Session, onUnauthorized?: () => void) =>
  api<Task[]>(session, "?select=*&order=created_at.desc", {}, onUnauthorized);

export const insertTask = async (session: Session, text: string, onUnauthorized?: () => void): Promise<Task> => {
  const result = await api<Task[]>(
    session,
    "",
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ text }),
    },
    onUnauthorized
  );
  return (result as Task[])[0];
};

export const patchTask = async (
  session: Session,
  id: string,
  patch: Partial<Pick<Task, "text" | "completed">>,
  onUnauthorized?: () => void
): Promise<Task> => {
  const result = await api<Task[]>(
    session,
    `?id=eq.${id}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(patch),
    },
    onUnauthorized
  );
  return (result as Task[])[0];
};

export const removeTask = (session: Session, id: string, onUnauthorized?: () => void) =>
  api(session, `?id=eq.${id}`, { method: "DELETE" }, onUnauthorized);

export const removeCompleted = (session: Session, onUnauthorized?: () => void) =>
  api(session, `?completed=eq.true`, { method: "DELETE" }, onUnauthorized);

export type AuthErrorKey =
  | "auth.error.emailNotConfirmed"
  | "auth.error.invalidCredentials"
  | "auth.error.alreadyRegistered"
  | "auth.error.passwordTooShort"
  | "auth.error.rateLimit";

export function authErrorKey(raw: string): AuthErrorKey | null {
  if (/Email not confirmed/i.test(raw)) return "auth.error.emailNotConfirmed";
  if (/Invalid login credentials/i.test(raw)) return "auth.error.invalidCredentials";
  if (/User already registered/i.test(raw)) return "auth.error.alreadyRegistered";
  if (/Password should be at least/i.test(raw)) return "auth.error.passwordTooShort";
  if (/rate limit|for security purposes|over email send rate/i.test(raw))
    return "auth.error.rateLimit";
  return null;
}
