import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ViewStyle, StyleProp } from 'react-native';
import { Palette, spacing, radius, circle, type, shadows } from '../theme/tokens';
import { useColors, useThemedStyles } from '../theme/theme';

// ---------- Card ----------
export function Card({
  children,
  style,
  raised,
  flat,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  raised?: boolean;
  /** No shadow and no border — for cards sitting inside another card. */
  flat?: boolean;
}) {
  const c = useColors();
  const s = useThemedStyles(makeStyles);
  const shadow = flat ? null : shadows(c)[raised ? 'raised' : 'card'];
  return <View style={[s.card, shadow, flat && s.cardFlat, style]}>{children}</View>;
}

// ---------- Pill ----------
export function Pill({
  label,
  color,
  filled,
  small,
}: {
  label: string;
  color?: string;
  filled?: boolean;
  small?: boolean;
}) {
  const c = useColors();
  const s = useThemedStyles(makeStyles);
  const tint = color ?? c.textMuted;
  return (
    <View
      style={[
        s.pill,
        small && { paddingVertical: 3, paddingHorizontal: 10 },
        filled ? { backgroundColor: tint + '1F' } : { backgroundColor: c.surface2 },
      ]}
    >
      <Text style={[s.pillText, small && { fontSize: 10 }, { color: filled ? tint : c.textMuted }]}>
        {label}
      </Text>
    </View>
  );
}

// ---------- Eyebrow ----------
export function Eyebrow({ children, color }: { children: React.ReactNode; color?: string }) {
  const c = useColors();
  const s = useThemedStyles(makeStyles);
  return <Text style={[s.eyebrow, { color: color ?? c.accent }]}>{children}</Text>;
}

// ---------- Circular button ----------
// The signature control of the new design: every discrete action is a circle.
export function CircleButton({
  glyph,
  onPress,
  size = 'md',
  active,
  tint,
  label,
  disabled,
}: {
  glyph: string;
  onPress?: () => void;
  size?: keyof typeof circle;
  active?: boolean;
  tint?: string;
  /** Optional caption rendered under the circle. */
  label?: string;
  disabled?: boolean;
}) {
  const c = useColors();
  const s = useThemedStyles(makeStyles);
  const d = circle[size];
  const colour = tint ?? c.accent;

  return (
    <View style={{ alignItems: 'center' }}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        hitSlop={8}
        style={({ pressed }) => [
          s.circleBtn,
          { width: d, height: d, borderRadius: d / 2 },
          active && { backgroundColor: colour, borderColor: colour },
          pressed && !disabled && { transform: [{ scale: 0.94 }] },
          disabled && { opacity: 0.4 },
        ]}
      >
        <Text
          style={[
            s.circleGlyph,
            { fontSize: d * 0.4 },
            { color: active ? c.onAccent : colour },
          ]}
        >
          {glyph}
        </Text>
      </Pressable>
      {label ? <Text style={s.circleLabel}>{label}</Text> : null}
    </View>
  );
}

// ---------- Primary / secondary buttons ----------
export function PrimaryButton({
  label,
  onPress,
  disabled,
  style,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const s = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.primaryBtn,
        pressed && !disabled && { opacity: 0.88 },
        disabled && { opacity: 0.45 },
        style,
      ]}
    >
      <Text style={s.primaryBtnText}>{label}</Text>
    </Pressable>
  );
}

export function GhostButton({
  label,
  onPress,
  style,
  tone = 'neutral',
}: {
  label: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  tone?: 'neutral' | 'accent';
}) {
  const c = useColors();
  const s = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.ghostBtn,
        tone === 'accent' && { borderColor: c.accentDim },
        pressed && { opacity: 0.65 },
        style,
      ]}
    >
      <Text style={[s.ghostBtnText, tone === 'accent' && { color: c.accent }]}>{label}</Text>
    </Pressable>
  );
}

// ---------- Progress bar ----------
export function Bar({ pct, color, height = 8 }: { pct: number; color?: string; height?: number }) {
  const c = useColors();
  return (
    <View
      style={{
        flex: 1,
        height,
        backgroundColor: c.surface2,
        borderRadius: height / 2,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          height,
          width: `${Math.max(0, Math.min(100, pct))}%`,
          backgroundColor: color ?? c.accent,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
}

// ---------- Lightweight markdown ----------
// Handles paragraphs, **bold**, `code`, and | tables |. Purpose-built for the
// authored content — not a full markdown engine, just what the content uses.
function InlineText({ text, style }: { text: string; style?: any }) {
  const s = useThemedStyles(makeStyles);
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return (
    <Text style={[s.p, style]}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <Text key={i} style={s.bold}>{part.slice(2, -2)}</Text>;
        if (part.startsWith('`') && part.endsWith('`'))
          return <Text key={i} style={s.inlineCode}>{part.slice(1, -1)}</Text>;
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}

export function Markdown({ text }: { text: string }) {
  const s = useThemedStyles(makeStyles);
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:\-|]+\|?\s*$/.test(lines[i + 1])) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].includes('|')) { rows.push(lines[i]); i++; }
      const header = rows[0].split('|').map((c) => c.trim()).filter(Boolean);
      const body = rows.slice(2).map((r) => r.split('|').map((c) => c.trim()).filter(Boolean));
      blocks.push(
        <ScrollView key={key++} horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: spacing.sm }}>
          <View style={s.table}>
            <View style={[s.tr, s.trHead]}>
              {header.map((h, hi) => (
                <View key={hi} style={s.td}><Text style={s.thText}>{h.replace(/\*\*/g, '')}</Text></View>
              ))}
            </View>
            {body.map((cells, ri) => (
              <View key={ri} style={s.tr}>
                {cells.map((cell, ci) => (
                  <View key={ci} style={s.td}><InlineText text={cell} style={s.tdText} /></View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      );
      continue;
    }
    if (line.trim()) blocks.push(<InlineText key={key++} text={line} />);
    i++;
  }
  return <View>{blocks}</View>;
}

// ---------- Code block ----------
export function CodeBlock({ label, code }: { label?: string; code: string }) {
  const s = useThemedStyles(makeStyles);
  return (
    <View style={{ marginVertical: spacing.sm }}>
      {label ? <Text style={s.codeLabel}>{label}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.codeWrap}>
        <Text style={s.code}>{code}</Text>
      </ScrollView>
    </View>
  );
}

// ---------- Progress ring ----------
export function ProgressRing({ pct, size = 84, label }: { pct: number; size?: number; label?: string }) {
  const c = useColors();
  const s = useThemedStyles(makeStyles);
  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          width: size, height: size, borderRadius: size / 2,
          borderWidth: 6, borderColor: c.surface2,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <View
          style={{
            position: 'absolute', width: size, height: size, borderRadius: size / 2,
            borderWidth: 6, borderColor: 'transparent', borderTopColor: c.accent,
            borderRightColor: pct > 25 ? c.accent : 'transparent',
            borderBottomColor: pct > 50 ? c.accent : 'transparent',
            borderLeftColor: pct > 75 ? c.accent : 'transparent',
            transform: [{ rotate: '45deg' }],
          }}
        />
        <Text style={s.ringPct}>{Math.round(pct)}%</Text>
      </View>
      {label ? <Text style={s.ringLabel}>{label}</Text> : null}
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  cardFlat: { backgroundColor: c.surface2, borderRadius: radius.lg, padding: spacing.lg },

  pill: { borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 12, alignSelf: 'flex-start' },
  pillText: { fontFamily: type.mono, fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase' },

  eyebrow: { fontFamily: type.mono, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: spacing.sm },

  circleBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surface2,
    borderWidth: 1.5,
    borderColor: c.border,
  },
  circleGlyph: { fontFamily: type.heading, includeFontPadding: false, textAlign: 'center' },
  circleLabel: { fontFamily: type.mono, fontSize: 10, color: c.textFaint, marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.5 },

  primaryBtn: {
    backgroundColor: c.accent,
    borderRadius: radius.pill,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { fontFamily: type.heading, fontSize: 15, color: c.onAccent, letterSpacing: 0.2 },

  ghostBtn: {
    borderRadius: radius.pill,
    paddingVertical: 15,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: c.border,
  },
  ghostBtnText: { fontFamily: type.heading, fontSize: 14, color: c.text },

  p: { color: c.textMuted, fontFamily: type.body, fontSize: 15, lineHeight: 24, marginBottom: spacing.md },
  bold: { color: c.text, fontFamily: type.heading },
  inlineCode: { fontFamily: type.mono, fontSize: 13, color: c.accent, backgroundColor: c.accentSoft },

  table: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: c.surface2 },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: c.borderSoft },
  trHead: { backgroundColor: c.surface3 },
  td: { paddingVertical: 10, paddingHorizontal: 14, minWidth: 110 },
  thText: { color: c.accent, fontFamily: type.mono, fontSize: 11, textTransform: 'uppercase' },
  tdText: { color: c.textMuted, fontSize: 13, marginBottom: 0 },

  codeLabel: { fontFamily: type.mono, fontSize: 12, color: c.textFaint, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  codeWrap: { backgroundColor: c.surface2, borderRadius: radius.lg, padding: spacing.lg },
  code: { fontFamily: type.mono, fontSize: 12.5, color: c.text, lineHeight: 21 },

  ringPct: { fontFamily: type.display, fontSize: 22, color: c.text },
  ringLabel: { fontFamily: type.mono, fontSize: 11, color: c.textFaint, marginTop: 6, textTransform: 'uppercase' },
});
