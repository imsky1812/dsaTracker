import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, radius, shadow, type } from '../theme/tokens';

// ---------- Card ----------
export function Card({ children, style, raised }: any) {
  return (
    <View style={[styles.card, raised ? shadow.raised : shadow.card, style]}>{children}</View>
  );
}

// ---------- Pill ----------
export function Pill({ label, color = colors.textMuted, filled, small }: any) {
  return (
    <View
      style={[
        styles.pill,
        small && { paddingVertical: 2, paddingHorizontal: 8 },
        filled ? { backgroundColor: color + '22' } : { backgroundColor: colors.surface2 },
      ]}
    >
      <Text style={[styles.pillText, small && { fontSize: 10 }, { color: filled ? color : colors.textMuted }]}>
        {label}
      </Text>
    </View>
  );
}

// ---------- Eyebrow (small uppercase mono label) ----------
export function Eyebrow({ children, color = colors.accent }: any) {
  return <Text style={[styles.eyebrow, { color }]}>{children}</Text>;
}

// ---------- Lightweight markdown ----------
// Handles: paragraphs, **bold**, `code`, and | tables |. Purpose-built for the
// authored content — not a full markdown engine, just what the content uses.
function InlineText({ text, style }: { text: string; style?: any }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return (
    <Text style={[styles.p, style]}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <Text key={i} style={styles.bold}>{part.slice(2, -2)}</Text>;
        if (part.startsWith('`') && part.endsWith('`'))
          return <Text key={i} style={styles.inlineCode}>{part.slice(1, -1)}</Text>;
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}

export function Markdown({ text }: { text: string }) {
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    // table detection
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:\-|]+\|?\s*$/.test(lines[i + 1])) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].includes('|')) { rows.push(lines[i]); i++; }
      const header = rows[0].split('|').map((c) => c.trim()).filter(Boolean);
      const body = rows.slice(2).map((r) => r.split('|').map((c) => c.trim()).filter(Boolean));
      blocks.push(
        <ScrollView key={key++} horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: spacing.sm }}>
          <View style={styles.table}>
            <View style={[styles.tr, styles.trHead]}>
              {header.map((h, hi) => (
                <View key={hi} style={styles.td}><Text style={styles.thText}><InlineText text={h} /></Text></View>
              ))}
            </View>
            {body.map((cells, ri) => (
              <View key={ri} style={styles.tr}>
                {cells.map((c, ci) => (
                  <View key={ci} style={styles.td}><InlineText text={c} style={styles.tdText} /></View>
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
  return (
    <View style={{ marginVertical: spacing.sm }}>
      {label ? <Text style={styles.codeLabel}>// {label}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.codeWrap}>
        <Text style={styles.code}>{code}</Text>
      </ScrollView>
    </View>
  );
}

// ---------- Progress ring (pure View, no deps) ----------
export function ProgressRing({ pct, size = 84, label }: { pct: number; size?: number; label?: string }) {
  // simple conic-free ring using two half overlays is complex in RN;
  // use a clean arc-substitute: a thick bordered circle + a filled progress bar beneath the number.
  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          width: size, height: size, borderRadius: size / 2,
          borderWidth: 6, borderColor: colors.surface2,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <View
          style={{
            position: 'absolute', width: size, height: size, borderRadius: size / 2,
            borderWidth: 6, borderColor: 'transparent', borderTopColor: colors.accent,
            borderRightColor: pct > 25 ? colors.accent : 'transparent',
            borderBottomColor: pct > 50 ? colors.accent : 'transparent',
            borderLeftColor: pct > 75 ? colors.accent : 'transparent',
            transform: [{ rotate: '45deg' }],
          }}
        />
        <Text style={styles.ringPct}>{Math.round(pct)}%</Text>
      </View>
      {label ? <Text style={styles.ringLabel}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg,
  },
  pill: { borderRadius: radius.sm, paddingVertical: 4, paddingHorizontal: 10, alignSelf: 'flex-start' },
  pillText: { fontFamily: type.mono, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  eyebrow: { fontFamily: type.mono, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: spacing.sm },
  p: { color: colors.textMuted, fontFamily: type.body, fontSize: 15, lineHeight: 23, marginBottom: spacing.sm },
  bold: { color: colors.text, fontFamily: type.heading },
  inlineCode: { fontFamily: type.mono, fontSize: 13, color: '#F0B3B3', backgroundColor: colors.surface2 },
  table: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  trHead: { backgroundColor: colors.surface2 },
  td: { paddingVertical: 8, paddingHorizontal: 12, minWidth: 110 },
  thText: { color: colors.accent, fontFamily: type.mono, fontSize: 11, textTransform: 'uppercase' },
  tdText: { color: colors.textMuted, fontSize: 13, marginBottom: 0 },
  codeLabel: { fontFamily: type.mono, fontSize: 12, color: colors.medium, marginBottom: 6 },
  codeWrap: {
    backgroundColor: '#0A0A0C', borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md,
  },
  code: { fontFamily: type.mono, fontSize: 12.5, color: '#D6E9C8', lineHeight: 20 },
  ringPct: { fontFamily: type.display, fontSize: 22, color: colors.text },
  ringLabel: { fontFamily: type.mono, fontSize: 11, color: colors.textFaint, marginTop: 6, textTransform: 'uppercase' },
});
