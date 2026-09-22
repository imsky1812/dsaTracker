import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Palette, spacing, radius, type } from '../theme/tokens';
import { useColors, useThemedStyles } from '../theme/theme';

// A bottom sheet of large, tappable tiles — the replacement for long horizontal
// chip strips. A strip of 13 company names scrolled off-screen, was hard to hit
// with a thumb, and gave no sense of how big each set was. A grid shows every
// option at once, and each tile carries its own count and progress.

export interface TileOption {
  value: string;
  label: string;
  /** Small line under the label, e.g. "24 problems · 3 solved". */
  sub?: string;
  /** 0-100; draws a thin progress bar along the tile's foot. */
  pct?: number;
  /** Colour dot before the label, e.g. difficulty. */
  dot?: string;
}

export function TilePicker({
  visible,
  title,
  options,
  value,
  onSelect,
  onClose,
  allLabel = 'All',
}: {
  visible: boolean;
  title: string;
  options: TileOption[];
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  /** Label for the full-width "no filter" tile at the top. */
  allLabel?: string;
}) {
  const c = useColors();
  const s = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();

  const pick = (v: string) => {
    onSelect(v);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.root}>
        {/* Tapping the dimmed area above the sheet dismisses it. */}
        <Pressable style={s.scrim} onPress={onClose} accessibilityLabel="Close" />

        <View style={[s.sheet, { paddingBottom: spacing.xl + insets.bottom }]}>
          <View style={s.grabber} />
          <View style={s.headRow}>
            <Text style={s.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} style={s.closeBtn} accessibilityLabel="Close">
              <Feather name="x" size={18} color={c.textMuted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.grid}>
            <Tile
              option={{ value: 'all', label: allLabel }}
              selected={value === 'all'}
              onPress={() => pick('all')}
              wide
            />
            {options.map((o) => (
              <Tile key={o.value} option={o} selected={value === o.value} onPress={() => pick(o.value)} />
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Tile({
  option,
  selected,
  onPress,
  wide,
}: {
  option: TileOption;
  selected: boolean;
  onPress: () => void;
  wide?: boolean;
}) {
  const c = useColors();
  const s = useThemedStyles(makeStyles);
  const ink = selected ? c.onAccent : c.text;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        s.tile,
        wide && s.tileWide,
        selected && s.tileSelected,
        pressed && { transform: [{ scale: 0.97 }] },
      ]}
    >
      <View style={s.tileTop}>
        {option.dot ? <View style={[s.dot, { backgroundColor: selected ? c.onAccent : option.dot }]} /> : null}
        <Text style={[s.tileLabel, { color: ink }]} numberOfLines={2}>
          {option.label}
        </Text>
        {selected && <Feather name="check" size={16} color={c.onAccent} />}
      </View>
      {option.sub ? (
        <Text style={[s.tileSub, selected && { color: c.onAccent, opacity: 0.85 }]}>{option.sub}</Text>
      ) : null}
      {option.pct !== undefined && (
        <View style={[s.track, selected && { backgroundColor: c.onAccent + '40' }]}>
          <View
            style={[
              s.fill,
              { width: `${Math.max(0, Math.min(100, option.pct))}%` },
              selected && { backgroundColor: c.onAccent },
            ]}
          />
        </View>
      )}
    </Pressable>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: c.scrim },
  sheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: spacing.lg,
    maxHeight: '82%',
    // On a phone this is full width; on the web app it stops a desktop window
    // from stretching two tiles across 1500px.
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: c.cardBorder,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.surface3,
    marginTop: spacing.md,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: 4,
  },
  title: { fontFamily: type.display, fontSize: 22, color: c.text, letterSpacing: -0.4 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: c.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.sm },
  tile: {
    width: '48.8%',
    minHeight: 76,
    backgroundColor: c.surface2,
    borderRadius: radius.lg,
    padding: spacing.md + 2,
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tileWide: { width: '100%', minHeight: 0 },
  tileSelected: { backgroundColor: c.accent, borderColor: c.accent },
  tileTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  tileLabel: { flex: 1, fontFamily: type.heading, fontSize: 15 },
  tileSub: { fontFamily: type.mono, fontSize: 10.5, color: c.textFaint, marginTop: 6 },
  track: { height: 3, borderRadius: 2, backgroundColor: c.surface3, marginTop: spacing.sm, overflow: 'hidden' },
  fill: { height: 3, borderRadius: 2, backgroundColor: c.accent },
});
