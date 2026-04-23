import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LogOut, Plus } from "lucide-react-native";
import { colors, radii, spacing, typography } from "../theme";
import type { FilterMode, Session, Task } from "../types";
import {
  fetchTasks,
  insertTask,
  patchTask,
  removeCompleted,
  removeTask,
  signOutRemote,
} from "../lib/supabase";
import { saveSession } from "../lib/session";
import { Filters } from "../components/Filters";
import { TaskItem } from "../components/TaskItem";
import { Empty } from "../components/Empty";
import { Toast, ToastKind } from "../components/Toast";
import { LocaleToggle } from "../components/LocaleToggle";
import { useI18n } from "../i18n";

interface Props {
  session: Session;
  onSignedOut: () => void;
}

export function AppScreen({ session, onSignedOut }: Props) {
  const { t } = useI18n();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [input, setInput] = useState("");
  const [toast, setToast] = useState<{ message: string; kind: ToastKind; token: number } | null>(null);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const unauthorizedRef = useRef(false);

  const handleUnauthorized = useCallback(() => {
    if (unauthorizedRef.current) return;
    unauthorizedRef.current = true;
    onSignedOut();
  }, [onSignedOut]);

  const showToast = (message: string, kind: ToastKind) =>
    setToast({ message, kind, token: Date.now() });

  const loadTasks = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const data = await fetchTasks(session, handleUnauthorized);
        setTasks(data || []);
      } catch (e) {
        if (!(e instanceof Error && e.message === "unauthorized")) {
          console.warn("fetchTasks failed", e);
          showToast(t("app.error.loadFailed"), "error");
        }
      } finally {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
      }
    },
    [session, handleUnauthorized, t]
  );

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleAdd = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");

    const tempId = `temp-${Date.now()}`;
    const optimistic: Task = {
      id: tempId,
      text,
      completed: false,
      created_at: new Date().toISOString(),
      _pending: true,
    };
    setTasks((prev) => [optimistic, ...prev]);
    setJustAddedId(tempId);

    try {
      const saved = await insertTask(session, text, handleUnauthorized);
      setTasks((prev) => prev.map((it) => (it.id === tempId ? saved : it)));
      setJustAddedId(saved.id);
    } catch (e) {
      if (e instanceof Error && e.message === "unauthorized") return;
      setTasks((prev) => prev.filter((it) => it.id !== tempId));
      showToast(t("app.error.addFailed"), "error");
    }
  };

  const handleToggle = async (id: string) => {
    const target = tasks.find((it) => it.id === id);
    if (!target) return;
    const nextCompleted = !target.completed;
    setTasks((prev) => prev.map((it) => (it.id === id ? { ...it, completed: nextCompleted } : it)));

    try {
      await patchTask(session, id, { completed: nextCompleted }, handleUnauthorized);
    } catch (e) {
      if (e instanceof Error && e.message === "unauthorized") return;
      setTasks((prev) => prev.map((it) => (it.id === id ? { ...it, completed: !nextCompleted } : it)));
      showToast(t("app.error.updateFailed"), "error");
    }
  };

  const handleDelete = async (id: string) => {
    const backup = tasks;
    const target = tasks.find((it) => it.id === id);
    if (!target) return;
    setTasks((prev) => prev.filter((it) => it.id !== id));

    try {
      await removeTask(session, id, handleUnauthorized);
    } catch (e) {
      if (e instanceof Error && e.message === "unauthorized") return;
      setTasks(backup);
      showToast(t("app.error.deleteFailed"), "error");
    }
  };

  const handleUpdate = async (id: string, newText: string) => {
    const target = tasks.find((it) => it.id === id);
    if (!target) return;
    if (!newText) {
      Alert.alert(t("app.editEmpty.title"), t("app.editEmpty.body"), [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("common.delete"), style: "destructive", onPress: () => handleDelete(id) },
      ]);
      return;
    }
    if (newText === target.text) return;
    const prev = target.text;
    setTasks((ts) => ts.map((it) => (it.id === id ? { ...it, text: newText } : it)));
    try {
      await patchTask(session, id, { text: newText }, handleUnauthorized);
    } catch (e) {
      if (e instanceof Error && e.message === "unauthorized") return;
      setTasks((ts) => ts.map((it) => (it.id === id ? { ...it, text: prev } : it)));
      showToast(t("app.error.updateFailed"), "error");
    }
  };

  const handleClearCompleted = async () => {
    const done = tasks.filter((it) => it.completed);
    if (done.length === 0) return;
    Alert.alert(
      t("app.clearConfirm.title"),
      t("app.clearConfirm.body", { count: done.length }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("app.clearConfirm.yes"),
          style: "destructive",
          onPress: async () => {
            const backup = tasks;
            setTasks((prev) => prev.filter((it) => !it.completed));
            try {
              await removeCompleted(session, handleUnauthorized);
            } catch (e) {
              if (e instanceof Error && e.message === "unauthorized") return;
              setTasks(backup);
              showToast(t("app.error.clearFailed"), "error");
            }
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(t("app.signOutConfirm.title"), t("app.signOutConfirm.body"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("app.signOutConfirm.yes"),
        style: "destructive",
        onPress: async () => {
          await signOutRemote(session);
          await saveSession(null);
          onSignedOut();
        },
      },
    ]);
  };

  const filtered = useMemo(() => {
    if (filter === "active") return tasks.filter((it) => !it.completed);
    if (filter === "completed") return tasks.filter((it) => it.completed);
    return tasks;
  }, [tasks, filter]);

  const remaining = tasks.filter((it) => !it.completed).length;
  const bloomed = tasks.filter((it) => it.completed).length;

  const footerText =
    remaining === 0
      ? t("app.footer.allDone")
      : bloomed === 0
        ? t("app.footer.onlyGrowing", { remaining })
        : t("app.footer.mixed", { remaining, bloomed });

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t("common.appName")}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {session.user?.email ?? t("app.defaultSubtitle")}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <LocaleToggle />
            <Pressable onPress={handleSignOut} style={styles.signOutBtn} hitSlop={8}>
              <LogOut size={16} color={colors.textMuted} strokeWidth={1.8} />
              <Text style={styles.signOutText}>{t("app.signOut")}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.addCard}>
        <TextInput
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleAdd}
          placeholder={t("app.addPlaceholder")}
          placeholderTextColor={colors.textSubtle}
          style={styles.addInput}
          maxLength={120}
          returnKeyType="send"
          selectionColor={colors.primary}
        />
        <Pressable
          onPress={handleAdd}
          style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
          accessibilityLabel={t("app.addAction")}
        >
          <Plus size={20} color={colors.white} strokeWidth={2.4} />
        </Pressable>
      </View>

      <View style={styles.filtersWrap}>
        <Filters value={filter} onChange={setFilter} />
      </View>

      {toast ? (
        <View style={styles.toastWrap}>
          <Toast message={toast.message} kind={toast.kind} token={toast.token} />
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TaskItem
              task={item}
              justAdded={item.id === justAddedId}
              onToggle={handleToggle}
              onRequestDelete={handleDelete}
              onUpdate={handleUpdate}
            />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            tasks.length === 0 ? (
              <Empty title={t("app.empty.noTasks.title")} hint={t("app.empty.noTasks.hint")} />
            ) : (
              <Empty title={t("app.empty.noMatch.title")} hint={t("app.empty.noMatch.hint")} />
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadTasks(true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          keyboardShouldPersistTaps="handled"
        />
      )}

      {tasks.length > 0 ? (
        <View style={styles.footer}>
          <Text style={styles.footerText}>{footerText}</Text>
          {bloomed > 0 ? (
            <Pressable onPress={handleClearCompleted} hitSlop={6}>
              <Text style={styles.clearText}>{t("app.footer.clearCompleted")}</Text>
            </Pressable>
          ) : (
            <Text />
          )}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing[5],
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: spacing[3],
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  title: {
    ...typography.title,
    fontSize: 22,
  },
  subtitle: {
    ...typography.subtitle,
    marginTop: 2,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1] + 2,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  signOutText: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "600",
  },
  addCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginHorizontal: spacing[5],
    padding: 6,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addInput: {
    flex: 1,
    ...typography.body,
    paddingHorizontal: spacing[3],
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    minHeight: 40,
    color: colors.text,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnPressed: {
    backgroundColor: colors.primaryHover,
  },
  filtersWrap: {
    marginHorizontal: spacing[5],
    marginTop: spacing[3],
    marginBottom: spacing[3],
  },
  toastWrap: {
    marginHorizontal: spacing[5],
    marginBottom: spacing[2],
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[5],
    flexGrow: 1,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  footerText: {
    ...typography.subtitle,
    fontSize: 13,
  },
  clearText: {
    ...typography.subtitle,
    fontSize: 13,
    color: colors.danger,
    fontWeight: "600",
  },
});
