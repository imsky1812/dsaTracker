// Shared building blocks for the (auth) screens. Kept here so sign-in, sign-up
// and reset stay visually identical and no screen hardcodes a color.

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  TextInputProps,
} from 'react-native';
import { colors, spacing, radius, type } from '../theme/tokens';

export function AuthField({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: boolean }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textFaint}
        selectionColor={colors.accent}
        {...props}
        style={[styles.input, error && { borderColor: colors.accentDim }]}
      />
    </View>
  );
}

export function AuthButton({
  label,
  onPress,
  busy,
  disabled,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  const off = busy || disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.button,
        pressed && !off && { opacity: 0.85 },
        off && { opacity: 0.5 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.buttonText}>{label}</Text>
      )}
    </Pressable>
  );
}

/** Low-emphasis text action — "Create account", "Forgot password?". */
export function AuthLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={12}>
      {({ pressed }) => (
        <Text style={[styles.link, pressed && { opacity: 0.6 }]}>{label}</Text>
      )}
    </Pressable>
  );
}

/** Inline error or confirmation. Reserves no space when empty. */
export function AuthNotice({ message, tone = 'error' }: { message?: string | null; tone?: 'error' | 'ok' }) {
  if (!message) return null;
  return (
    <View style={[styles.notice, tone === 'ok' && { borderColor: colors.easy, backgroundColor: 'rgba(74,157,106,0.10)' }]}>
      <Text style={[styles.noticeText, tone === 'ok' && { color: colors.easy }]}>{message}</Text>
    </View>
  );
}

/** The wordmark at the top of every auth screen. */
export function AuthMark({ caption }: { caption: string }) {
  return (
    <View style={{ marginBottom: spacing.xxl }}>
      <Text style={styles.mark}>DSA</Text>
      <Text style={styles.markAccent}>MASTERY</Text>
      <Text style={styles.caption}>{caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: type.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.textFaint,
    marginBottom: spacing.sm,
  },
  input: {
    color: colors.text,
    fontFamily: type.body,
    fontSize: 16,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: spacing.sm,
  },
  buttonText: {
    fontFamily: type.heading,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  link: {
    fontFamily: type.mono,
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 0.5,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  notice: {
    borderWidth: 1,
    borderColor: colors.accentDim,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  noticeText: {
    fontFamily: type.body,
    fontSize: 13,
    color: colors.accent,
    lineHeight: 19,
  },
  mark: {
    fontFamily: type.display,
    fontSize: 40,
    color: colors.text,
    letterSpacing: -1,
    lineHeight: 42,
  },
  markAccent: {
    fontFamily: type.display,
    fontSize: 40,
    color: colors.accent,
    letterSpacing: -1,
    lineHeight: 42,
  },
  caption: {
    fontFamily: type.mono,
    fontSize: 12,
    color: colors.textFaint,
    marginTop: spacing.md,
    letterSpacing: 0.5,
  },
});
