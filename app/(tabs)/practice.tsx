import React, { useState, useMemo, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
  TextInput,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Palette, spacing, radius, type, tabInset, difficultyColor } from '../../src/theme/tokens';
import { useColors, useThemedStyles } from '../../src/theme/theme';
import { Card, Pill, PrimaryButton } from '../../src/components/ui';
import { TilePicker, TileOption } from '../../src/components/TilePicker';
import { Feather } from '@expo/vector-icons';
import { plan, allProblems, ProblemStatus, problemVideoUrl } from '../../src/lib/content';
import { useProgress } from '../../src/store/progress';
import { notify } from '../../src/lib/dialog';

type StatusFilter = 'all' | ProblemStatus;
type Picker = 'company' | 'topic' | 'level' | null;
type PracticeProblem = ReturnType<typeof allProblems>[number];

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unsolved', label: 'To do' },
  { value: 'solved', label: 'Solved' },
  { value: 'revisit', label: 'Revisit' },
];

const topicTitle = (slug: string) => plan.topics.find((t) => t.slug === slug)?.title ?? slug;

// openURL rejects when no browser can handle the link; unhandled, that is an
// unexplained crash-looking failure on a tap.
async function openLink(url: string, name: string) {
  try {
    await Linking.openURL(url);
  } catch {
    notify('Couldn’t open the link', `${name}\n\n${url}`);
  }
}

export default function Practice() {
  const c = useColors();
  const s = useThemedStyles(makeStyles);
  // Narrow selectors: this screen renders ~180 rows, so re-rendering on every
  // sync-queue change (which the whole-store read did) made taps feel laggy.
  const problemStatus = useProgress((st) => st.problemStatus);
  const problemNotes = useProgress((st) => st.problemNotes);
  const cycleProblemStatus = useProgress((st) => st.cycleProblemStatus);
  const setNote = useProgress((st) => st.setNote);
  const all = useMemo(() => allProblems(), []);

  const [status, setStatus] = useState<StatusFilter>('all');
  const [diff, setDiff] = useState<string>('all');
  const [company, setCompany] = useState<string>('all');
  const [topic, setTopic] = useState<string>('all');
  const [picker, setPicker] = useState<Picker>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  // Progress -> "By company" deep-links here with ?company=Amazon&t=<nonce>.
  // The nonce matters: without it, tapping the same company twice (after
  // changing the filter in between) left the params unchanged, so the effect
  // never re-ran and the tap appeared to do nothing.
  const params = useLocalSearchParams<{ company?: string; t?: string }>();
  useEffect(() => {
    if (params.company && plan.companies.includes(params.company)) {
      setCompany(params.company);
      setStatus('all');
    }
  }, [params.company, params.t]);

  const filtered = useMemo(
    () =>
      all.filter((p) => {
        const st = problemStatus[p.id] ?? 'unsolved';
        if (status !== 'all' && st !== status) return false;
        if (diff !== 'all' && p.difficulty !== diff) return false;
        if (company !== 'all' && !p.companies.includes(company)) return false;
        if (topic !== 'all' && p.topicSlug !== topic) return false;
        return true;
      }),
    [all, problemStatus, status, diff, company, topic]
  );

  // Counts for the status switch, within the other active filters — so "Solved 4"
  // means four of the problems you are currently looking at.
  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = { all: 0, unsolved: 0, solved: 0, revisit: 0 };
    for (const p of all) {
      if (diff !== 'all' && p.difficulty !== diff) continue;
      if (company !== 'all' && !p.companies.includes(company)) continue;
      if (topic !== 'all' && p.topicSlug !== topic) continue;
      counts.all++;
      counts[problemStatus[p.id] ?? 'unsolved']++;
    }
    return counts;
  }, [all, problemStatus, diff, company, topic]);

  const tileStats = useCallback(
    (items: PracticeProblem[]) => {
      const done = items.filter((p) => problemStatus[p.id] === 'solved').length;
      return {
        sub: `${items.length} problem${items.length === 1 ? '' : 's'} · ${done} solved`,
        pct: items.length ? (done / items.length) * 100 : 0,
      };
    },
    [problemStatus]
  );

  // Alphabetical: with every option on screen at once, A-Z is the fastest way
  // to find a name.
  const companyOptions: TileOption[] = useMemo(
    () =>
      [...plan.companies]
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({ name, items: all.filter((p) => p.companies.includes(name)) }))
        .filter(({ items }) => items.length > 0)
        .map(({ name, items }) => ({ value: name, label: name, ...tileStats(items) })),
    [all, tileStats]
  );

  const topicOptions: TileOption[] = useMemo(
    () =>
      plan.topics.map((t) => ({
        value: t.slug,
        label: t.title,
        ...tileStats(all.filter((p) => p.topicSlug === t.slug)),
      })),
    [all, tileStats]
  );

  const levelOptions: TileOption[] = useMemo(
    () =>
      (['Easy', 'Medium', 'Hard'] as const).map((d) => ({
        value: d,
        label: d,
        dot: difficultyColor(c, d),
        ...tileStats(all.filter((p) => p.difficulty === d)),
      })),
    [all, tileStats, c]
  );

  const openNote = useCallback((id: string) => {
    setNoteFor(id);
    setDraft(useProgress.getState().problemNotes[id] ?? '');
  }, []);
  const saveNote = () => {
    if (noteFor) setNote(noteFor, draft);
    setNoteFor(null);
  };

  const anyFilter = status !== 'all' || diff !== 'all' || company !== 'all' || topic !== 'all';
  const clearAll = () => {
    setStatus('all');
    setDiff('all');
    setCompany('all');
    setTopic('all');
  };

  const header = (
    <View>
      <View style={s.statusTrack}>
        {STATUS_TABS.map((t) => {
          const active = status === t.value;
          return (
            <Pressable key={t.value} onPress={() => setStatus(t.value)} style={[s.statusTab, active && s.statusTabActive]}>
              <Text style={[s.statusTabText, active && s.statusTabTextActive]}>{t.label}</Text>
              <Text style={[s.statusTabCount, active && s.statusTabTextActive]}>{statusCounts[t.value]}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={s.filterRow}>
        <FilterButton label="Company" value={company === 'all' ? 'Any' : company} active={company !== 'all'} onPress={() => setPicker('company')} />
        <FilterButton label="Topic" value={topic === 'all' ? 'Any' : topicTitle(topic)} active={topic !== 'all'} onPress={() => setPicker('topic')} />
        <FilterButton label="Level" value={diff === 'all' ? 'Any' : diff} active={diff !== 'all'} onPress={() => setPicker('level')} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.head}>
        <Text style={s.kicker}>Solve</Text>
        <View style={s.titleRow}>
          <Text style={s.h1}>Practice</Text>
          {anyFilter && (
            <Pressable onPress={clearAll} style={s.clearBtn} hitSlop={8}>
              <Feather name="x" size={12} color={c.textMuted} />
              <Text style={s.clearText}>Clear</Text>
            </Pressable>
          )}
        </View>
        <Text style={s.count}>
          {filtered.length} of {all.length} problems
        </Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={header}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        windowSize={7}
        renderItem={({ item }) => (
          <ProblemRow
            p={item}
            st={problemStatus[item.id]}
            hasNote={Boolean(problemNotes[item.id])}
            onCycle={cycleProblemStatus}
            onNote={openNote}
          />
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <Feather name="search" size={22} color={c.textFaint} />
            </View>
            <Text style={s.emptyTitle}>Nothing matches</Text>
            <Text style={s.emptyBody}>Loosen a filter to see more problems.</Text>
            <Pressable onPress={clearAll} style={s.emptyBtn}>
              <Text style={s.emptyBtnText}>Clear filters</Text>
            </Pressable>
          </View>
        }
      />

      <TilePicker
        visible={picker === 'company'}
        title="Company"
        allLabel="Any company"
        options={companyOptions}
        value={company}
        onSelect={setCompany}
        onClose={() => setPicker(null)}
      />
      <TilePicker
        visible={picker === 'topic'}
        title="Topic"
        allLabel="Any topic"
        options={topicOptions}
        value={topic}
        onSelect={setTopic}
        onClose={() => setPicker(null)}
      />
      <TilePicker
        visible={picker === 'level'}
        title="Level"
        allLabel="Any level"
        options={levelOptions}
        value={diff}
        onSelect={setDiff}
        onClose={() => setPicker(null)}
      />

      {/* Note editor. KeyboardAvoidingView keeps Save above the keyboard —
          without it the keyboard covered the bottom sheet on Android. */}
      <Modal visible={noteFor !== null} transparent animationType="fade" onRequestClose={() => setNoteFor(null)} statusBarTranslucent>
        <KeyboardAvoidingView style={s.modalBg} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setNoteFor(null)} />
          <View style={s.modal}>
            <Text style={s.modalTitle}>Note</Text>
            <TextInput
              style={s.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="Approach, gotchas, complexity…"
              placeholderTextColor={c.textFaint}
              selectionColor={c.accent}
              multiline
              autoFocus
            />
            <PrimaryButton label="Save" onPress={saveNote} style={{ marginTop: spacing.lg }} />
            <Pressable onPress={() => setNoteFor(null)} style={{ paddingVertical: spacing.md }}>
              <Text style={s.cancel}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function FilterButton({ label, value, active, onPress }: { label: string; value: string; active: boolean; onPress: () => void }) {
  const c = useColors();
  const s = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => [s.filterBtn, active && s.filterBtnActive, pressed && { opacity: 0.75 }]}
    >
      <Text style={[s.filterLabel, active && { color: c.accent }]}>{label}</Text>
      <View style={s.filterValueRow}>
        <Text style={[s.filterValue, active && { color: c.accent }]} numberOfLines={1}>
          {value}
        </Text>
        <Feather name="chevron-down" size={14} color={active ? c.accent : c.textFaint} />
      </View>
    </Pressable>
  );
}

/**
 * One problem. Memoised on its own status and note flag, so marking one
 * problem solved re-renders one row rather than the whole list.
 */
const ProblemRow = memo(function ProblemRow({
  p,
  st,
  hasNote,
  onCycle,
  onNote,
}: {
  p: PracticeProblem;
  st: ProblemStatus | undefined;
  hasNote: boolean;
  onCycle: (id: string) => void;
  onNote: (id: string) => void;
}) {
  const c = useColors();
  const s = useThemedStyles(makeStyles);
  const tint = st === 'solved' ? c.easy : st === 'revisit' ? c.medium : c.textFaint;
  const glyph = st === 'solved' ? 'check' : st === 'revisit' ? 'rotate-ccw' : null;
  const filledIn = st && st !== 'unsolved';

  return (
    <Card style={s.row}>
      <Pressable
        onPress={() => onCycle(p.id)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`${p.name}: ${st ?? 'unsolved'}. Tap to change.`}
        style={({ pressed }) => [
          s.statusCircle,
          { borderColor: tint },
          filledIn && { backgroundColor: tint, borderColor: tint },
          pressed && { transform: [{ scale: 0.9 }] },
        ]}
      >
        {glyph && <Feather name={glyph} size={16} color={c.onAccent} />}
      </Pressable>

      <Pressable style={{ flex: 1 }} onPress={() => void openLink(p.url, p.name)}>
        <Text style={[s.name, st === 'solved' && s.nameSolved]}>{p.name}</Text>
        <Text style={s.meta} numberOfLines={1}>
          {topicTitle(p.topicSlug)}
          {p.companies.length ? `  ·  ${p.companies.slice(0, 2).join(', ')}` : ''}
          {p.companies.length > 2 ? ` +${p.companies.length - 2}` : ''}
        </Text>
      </Pressable>

      <View style={s.rightCol}>
        <Pill label={p.difficulty} filled color={difficultyColor(c, p.difficulty)} small />
        <View style={s.actionRow}>
          {/* Stuck? Go straight to an explanation. */}
          <Pressable
            onPress={() => void openLink(problemVideoUrl(p, p.topicSlug), p.name)}
            hitSlop={8}
            style={s.iconBtn}
            accessibilityLabel={`Watch an explanation of ${p.name}`}
          >
            <Feather name="play" size={13} color={c.accent} />
          </Pressable>
          <Pressable
            onPress={() => onNote(p.id)}
            hitSlop={8}
            style={[s.iconBtn, hasNote && { backgroundColor: c.accentSoft }]}
            accessibilityLabel={hasNote ? 'Edit note' : 'Add note'}
          >
            <Feather name="edit-2" size={13} color={hasNote ? c.accent : c.textFaint} />
          </Pressable>
        </View>
      </View>
    </Card>
  );
});

const makeStyles = (c: Palette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  head: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  kicker: { fontFamily: type.mono, fontSize: 11, color: c.textFaint, letterSpacing: 1.5, textTransform: 'uppercase' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  h1: { fontFamily: type.display, fontSize: 40, color: c.text, letterSpacing: -1.2, marginTop: 2 },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 7, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: c.surface2,
  },
  clearText: { fontFamily: type.mono, fontSize: 11, color: c.textMuted, textTransform: 'uppercase' },
  count: { fontFamily: type.mono, fontSize: 12, color: c.textFaint, marginTop: 2, marginBottom: spacing.md },

  // Status: one segmented track, equal widths, counts under the labels.
  statusTrack: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: radius.lg, backgroundColor: c.surface2, marginBottom: spacing.md },
  statusTab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.md },
  statusTabActive: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  statusTabText: { fontFamily: type.heading, fontSize: 13, color: c.textMuted },
  statusTabTextActive: { color: c.text },
  statusTabCount: { fontFamily: type.mono, fontSize: 10.5, color: c.textFaint, marginTop: 2 },

  // Filters: three equal buttons, each opens a tile sheet.
  filterRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  filterBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: c.surface,
    borderWidth: 1.5,
    borderColor: c.border,
  },
  filterBtnActive: { backgroundColor: c.accentSoft, borderColor: c.accentDim },
  filterLabel: { fontFamily: type.mono, fontSize: 9.5, color: c.textFaint, textTransform: 'uppercase', letterSpacing: 0.8 },
  filterValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  filterValue: { flex: 1, fontFamily: type.heading, fontSize: 13.5, color: c.text },

  scroll: { paddingHorizontal: spacing.lg, paddingBottom: tabInset },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.md, paddingVertical: spacing.lg, paddingHorizontal: spacing.lg },

  statusCircle: {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },

  name: { fontFamily: type.heading, fontSize: 15.5, color: c.text, lineHeight: 21 },
  nameSolved: { color: c.textMuted },
  meta: { fontFamily: type.mono, fontSize: 10.5, color: c.textFaint, marginTop: 4 },
  rightCol: { alignItems: 'flex-end', gap: spacing.sm },
  actionRow: { flexDirection: 'row', gap: 6 },
  iconBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' },

  empty: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  emptyTitle: { fontFamily: type.display, fontSize: 22, color: c.text },
  emptyBody: { fontFamily: type.body, fontSize: 14, color: c.textMuted },
  emptyBtn: { marginTop: spacing.md, paddingVertical: 13, paddingHorizontal: spacing.xl, borderRadius: radius.pill, backgroundColor: c.surface2 },
  emptyBtnText: { fontFamily: type.heading, fontSize: 13, color: c.text },

  modalBg: { flex: 1, backgroundColor: c.scrim, justifyContent: 'flex-end' },
  modal: { backgroundColor: c.surface, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, padding: spacing.xl, paddingBottom: spacing.xxl },
  modalTitle: { fontFamily: type.display, fontSize: 22, color: c.text, marginBottom: spacing.lg, letterSpacing: -0.4 },
  input: {
    color: c.text, fontFamily: type.body, fontSize: 15,
    backgroundColor: c.surface2, borderRadius: radius.lg,
    padding: spacing.lg, minHeight: 120, maxHeight: 240, textAlignVertical: 'top',
  },
  cancel: { fontFamily: type.mono, fontSize: 12, color: c.textMuted, textAlign: 'center', textTransform: 'uppercase' },
});
