import React, { useEffect, useState, useRef } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Pencil, Sprout, Trash2, Check } from "lucide-react-native";
import { colors, radii, spacing, typography } from "../theme";
import { selectionTap } from "../lib/haptics";
import type { Task } from "../types";

interface Props {
  task: Task;
  justAdded?: boolean;
  onToggle: (id: string) => void;
  onRequestDelete: (id: string) => Promise<void> | void;
  onUpdate: (id: string, text: string) => void;
}

export function TaskItem({ task, justAdded, onToggle, onRequestDelete, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.text);
  const editInputRef = useRef<TextInput>(null);
  const submittedRef = useRef(false);

  const opacity = useSharedValue(justAdded ? 0 : 1);
  const translateY = useSharedValue(justAdded ? 8 : 0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);

  // Mount sprout animation
  useEffect(() => {
    if (justAdded) {
      opacity.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.ease) });
      translateY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.ease) });
    }
  }, [justAdded, opacity, translateY]);

  // Bloom pulse when completion state changes to true
  const prevCompletedRef = useRef(task.completed);
  useEffect(() => {
    if (task.completed && !prevCompletedRef.current) {
      scale.value = withSequence(
        withTiming(1.06, { duration: 120, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 180, easing: Easing.inOut(Easing.quad) })
      );
    }
    prevCompletedRef.current = task.completed;
  }, [task.completed, scale]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleToggle = () => {
    if (task._pending) return;
    selectionTap();
    onToggle(task.id);
  };

  const handleDeletePress = () => {
    if (task._pending) return;
    Alert.alert(
      "Niyeti sil",
      "Bu niyeti silmek istediğine emin misin?",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: () => {
            // wilt animation then call parent
            opacity.value = withTiming(0, { duration: 220, easing: Easing.in(Easing.ease) });
            translateX.value = withTiming(20, { duration: 220, easing: Easing.in(Easing.ease) }, () => {
              runOnJS(triggerDelete)();
            });
          },
        },
      ],
      { cancelable: true }
    );
  };

  const triggerDelete = () => {
    onRequestDelete(task.id);
  };

  const beginEdit = () => {
    if (task._pending) return;
    submittedRef.current = false;
    setDraft(task.text);
    setEditing(true);
    setTimeout(() => editInputRef.current?.focus(), 20);
  };

  const commitEdit = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== task.text) onUpdate(task.id, trimmed);
    else if (!trimmed) onUpdate(task.id, "");
  };

  const cancelEdit = () => {
    submittedRef.current = true;
    setDraft(task.text);
    setEditing(false);
  };

  const containerStyle = [
    styles.container,
    task.completed && styles.containerCompleted,
    task._pending && styles.containerPending,
  ];

  return (
    <Animated.View style={[containerStyle, animStyle]}>
      <Pressable
        onPress={handleToggle}
        style={[styles.plantBtn, task.completed && styles.plantBtnDone]}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={task.completed ? "Tohuma geri döndür" : "Çiçeklendir"}
      >
        {task.completed ? (
          <Check size={18} color={colors.white} strokeWidth={3} />
        ) : (
          <Sprout size={20} color={colors.primary} strokeWidth={1.8} />
        )}
      </Pressable>

      {editing ? (
        <TextInput
          ref={editInputRef}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={commitEdit}
          onBlur={commitEdit}
          blurOnSubmit
          returnKeyType="done"
          maxLength={120}
          style={styles.editInput}
          selectionColor={colors.primary}
        />
      ) : (
        <Pressable style={styles.textWrap} onLongPress={beginEdit}>
          <Text
            style={[styles.text, task.completed && styles.textCompleted]}
            numberOfLines={3}
          >
            {task.text}
          </Text>
        </Pressable>
      )}

      {!editing ? (
        <View style={styles.actions}>
          <Pressable
            onPress={beginEdit}
            style={styles.iconBtn}
            hitSlop={6}
            accessibilityLabel="Düzenle"
            disabled={!!task._pending}
          >
            <Pencil size={16} color={colors.textMuted} strokeWidth={1.8} />
          </Pressable>
          <Pressable
            onPress={handleDeletePress}
            style={styles.iconBtn}
            hitSlop={6}
            accessibilityLabel="Sil"
            disabled={!!task._pending}
          >
            <Trash2 size={16} color={colors.textMuted} strokeWidth={1.8} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.actions}>
          <Pressable onPress={cancelEdit} style={styles.iconBtn} hitSlop={6}>
            <Text style={styles.cancelText}>Vazgeç</Text>
          </Pressable>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3] + 2,
    marginBottom: spacing[2] + 2,
  },
  containerCompleted: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
  },
  containerPending: {
    opacity: 0.6,
  },
  plantBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryFaint,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  plantBtnDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  textWrap: {
    flex: 1,
  },
  text: {
    ...typography.body,
    lineHeight: 20,
  },
  textCompleted: {
    color: colors.textMuted,
    textDecorationLine: "line-through",
    textDecorationColor: colors.textSubtle,
  },
  editInput: {
    flex: 1,
    ...typography.body,
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  actions: {
    flexDirection: "row",
    gap: spacing[1],
    alignItems: "center",
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: "600",
    paddingHorizontal: spacing[1],
  },
});
