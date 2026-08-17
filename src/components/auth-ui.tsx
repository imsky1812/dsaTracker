// Shared building blocks for the (auth) screens, so sign-in, sign-up and reset
// stay identical and no screen hardcodes a colour.

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
import { Palette, spacing, radius, type } from '../theme/tokens';
import { useColors, useThemedStyles } from '../theme/theme';

export function AuthField({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: boolean }) {
  const c = useColors();
  const s = useThemedStyles(makeStyles);
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        placeholderTextColor={c.textFaint}
        selectionColor={c.accent}
        {...props}
        style={[s.input, error && { borderColor: c.accentDim }]}
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
  const c = useColors();
  const s = useThemedStyles(makeStyles);
  const off = busy || disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [s.button, pressed && !off && { opacity: 0.88 }, off && { opacity: 0.5 }]}
    >
      {busy ? <ActivityIndicator color={c.onAccent} /> : <Text style={s.buttonText}>{label}</Text>}
    </Pressable>
  );
}

export function AuthLink({ label, onPress }: { label: string; onPress: () => void }) {
  const s = useThemedStyles(makeStyles);
  return (
    <Pressable onPress={onPress} hitSlop={12}>
      {({ pressed }) => <Text style={[s.link, pressed && { opacity: 0.6 }]}>{label}</Text>}
    </Pressable>
  );
}

export function AuthNotice({ message, tone = 'error' }: { message?: string | null; tone?: 'error' | 'ok' }) {
  const c = useColors();
  const s = useThemedStyles(makeStyles);
  if (!message) return null;
  const ok = tone === 'ok';
  return (
    <View style={[s.notice, ok && { borderColor: c.easy, backgroundColor: c.easy + '14' }]}>
      <Text style={[s.noticeText, ok && { color: c.easy }]}>{message}</Text>
    </View>
  );
}

export function AuthMark({ caption }: { caption: string }) {
  const s = useThemedStyles(makeStyles);
  return (
    <View style={{ marginBottom: spacing.xxl }}>
      <Text style={s.mark}>DSA</Text>
      <Text style={s.markAccent}>MASTERY</Text>
      <Text style={s.caption}>{caption}</Text>
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  label: {
    fontFamily: type.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: c.textFaint,
    marginBottom: spacing.sm,
  },
  input: {
    color: c.text,
    fontFamily: type.body,
    fontSize: 16,
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: c.border,
  },
  button: {
    backgroundColor: c.accent,
    borderRadius: radius.pill,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    marginTop: spacing.sm,
  },
  buttonText: { fontFamily: type.heading, fontSize: 15, color: c.onAccent, letterSpacing: 0.2 },
  link: {
    fontFamily: type.mono,
    fontSize: 12,
    color: c.textMuted,
    letterSpacing: 0.4,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  notice: {
    borderWidth: 1.5,
    borderColor: c.accentDim,
    backgroundColor: c.accentSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  noticeText: { fontFamily: type.body, fontSize: 13.5, color: c.accent, lineHeight: 20 },
  mark: { fontFamily: type.display, fontSize: 42, color: c.text, letterSpacing: -1.5, lineHeight: 44 },
  markAccent: { fontFamily: type.display, fontSize: 42, color: c.accent, letterSpacing: -1.5, lineHeight: 44 },
  caption: { fontFamily: type.body, fontSize: 14, color: c.textMuted, marginTop: spacing.lg, lineHeight: 21 },
});
