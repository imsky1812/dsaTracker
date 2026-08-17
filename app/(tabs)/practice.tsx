import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Palette, spacing, radius, type, tabInset, difficultyColor } from '../../src/theme/tokens';
import { useColors, useThemedStyles } from '../../src/theme/theme';
import { Card, Pill, PrimaryButton } from '../../src/components/ui';
import { plan, allProblems, ProblemStatus } from '../../src/lib/content';
import { useProgress } from '../../src/store/progress';

type StatusFilter = 'all' | ProblemStatus;
type DiffFilter = 'all' | 'Easy' | 'Medium' | 'Hard';
type PlatFilter = 'all' | 'LeetCode' | 'GFG';

export default function Practice() {
  const c = useColors();
  const s = useThemedStyles(makeStyles);
  const { problemStatus, cycleProblemStatus, problemNotes, setNote } = useProgress();
  const all = useMemo(() => allProblems(), []);

  const [status, setStatus] = useState<StatusFilter>('all');
  const [diff, setDiff] = useState<DiffFilter>('all');
  const [plat, setPlat] = useState<PlatFilter>('all');
  const [company, setCompany] = useState<string>('all');
  const [topic, setTopic] = useState<string>('all');
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  // Progress -> "By company" deep-links here with ?company=Amazon. Applied as
  // an effect rather than initial state so arriving again with a different
  // company re-filters instead of keeping the first one.
  const params = useLocalSearchParams<{ company?: string }>();
  useEffect(() => {
    if (params.company && plan.companies.includes(params.company)) setCompany(params.company);
  }, [params.company]);

  const filtered = all.filter((p) => {
    const st = problemStatus[p.id] ?? 'unsolved';
    if (status !== 'all' && st !== status) return false;
    if (diff !== 'all' && p.difficulty !== diff) return false;
    if (plat !== 'all' && p.platform !== plat) return false;
    if (company !== 'all' && !p.companies.includes(company)) return false;
    if (topic !== 'all' && p.topicSlug !== topic) return false;
    return true;
  });

  const statusColor = (st?: string) => (st === 'solved' ? c.easy : st === 'revisit' ? c.medium : c.textFaint);
  const statusGlyph = (st?: string) => (st === 'solved' ? '✓' : st === 'revisit' ? '↺' : '');

  // openURL rejects when no browser can handle the link; unhandled, that is an
  // unexplained crash-looking failure on a tap.
  const openProblem = async (url: string, name: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Couldn’t open the link', `${name}\n\n${url}`);
    }
  };

  const openNote = (id: string) => { setNoteFor(id); setDraft(problemNotes[id] ?? ''); };
  const saveNote = () => { if (noteFor) setNote(noteFor, draft); setNoteFor(null); };

  const anyFilter = status !== 'all' || diff !== 'all' || plat !== 'all' || company !== 'all' || topic !== 'all';
  const clearAll = () => { setStatus('all'); setDiff('all'); setPlat('all'); setCompany('all'); setTopic('all'); };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.head}>
        <Text style={s.kicker}>Solve</Text>
        <View style={s.titleRow}>
          <Text style={s.h1}>Practice</Text>
          {anyFilter && (
            <Pressable onPress={clearAll} style={s.clearBtn} hitSlop={8}>
              <Text style={s.clearText}>Clear</Text>
            </Pressable>
          )}
        </View>
        <Text style={s.count}>{filtered.length} of {all.length} problems</Text>
      </View>

      <View style={s.filters}>
        <FilterRow label="Status" value={status} setValue={setStatus} options={['all', 'unsolved', 'solved', 'revisit']} />
        <FilterRow label="Level" value={diff} setValue={setDiff} options={['all', 'Easy', 'Medium', 'Hard']} />
        <FilterRow label="Source" value={plat} setValue={setPlat} options={['all', 'LeetCode', 'GFG']} />
        <FilterRow label="Company" value={company} setValue={setCompany} options={['all', ...plan.companies]} />
        <FilterRow
          label="Topic"
          value={topic}
          setValue={setTopic}
          options={['all', ...plan.topics.map((t) => t.slug)]}
          labelFor={(v: string) => (v === 'all' ? 'all' : v.replace(/-/g, ' '))}
        />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {filtered.map((p) => {
          const st = problemStatus[p.id];
          const hasNote = Boolean(problemNotes[p.id]);
          const tint = statusColor(st);
          return (
            <Card key={p.id} style={s.row}>
              <Pressable
                onPress={() => cycleProblemStatus(p.id)}
                hitSlop={10}
                style={({ pressed }) => [
                  s.statusCircle,
                  { borderColor: tint },
                  st && st !== 'unsolved' && { backgroundColor: tint, borderColor: tint },
                  pressed && { transform: [{ scale: 0.92 }] },
                ]}
              >
                <Text style={[s.statusGlyph, { color: c.onAccent }]}>{statusGlyph(st)}</Text>
              </Pressable>

              <Pressable style={{ flex: 1 }} onPress={() => void openProblem(p.url, p.name)}>
                <Text style={s.name}>{p.name}</Text>
                <Text style={s.meta}>
                  {p.topicSlug.replace(/-/g, ' ')}
                  {p.companies.length ? ` · ${p.companies.slice(0, 2).join(', ')}` : ''}
                </Text>
              </Pressable>

              <View style={s.rightCol}>
                <Pill label={p.difficulty} filled color={difficultyColor(c, p.difficulty)} small />
                <Pressable onPress={() => openNote(p.id)} hitSlop={8} style={s.noteBtn}>
                  <Text style={[s.noteIcon, hasNote && { color: c.accent }]}>✎</Text>
                </Pressable>
              </View>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>Nothing matches</Text>
            <Text style={s.emptyBody}>Loosen a filter to see more problems.</Text>
            <Pressable onPress={clearAll} style={s.emptyBtn}>
              <Text style={s.emptyBtnText}>Clear filters</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Note editor */}
      <Modal visible={noteFor !== null} transparent animationType="fade" onRequestClose={() => setNoteFor(null)}>
        <View style={s.modalBg}>
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
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function FilterRow({ label, value, setValue, options, labelFor }: any) {
  const s = useThemedStyles(makeStyles);
  return (
    <View style={s.filterRow}>
      <Text style={s.filterLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingRight: spacing.lg }}>
        {options.map((o: string) => (
          <Pressable key={o} onPress={() => setValue(o)} style={[s.chip, value === o && s.chipActive]}>
            <Text style={[s.chipText, value === o && s.chipTextActive]}>{labelFor ? labelFor(o) : o}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  head: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  kicker: { fontFamily: type.mono, fontSize: 11, color: c.textFaint, letterSpacing: 1.5, textTransform: 'uppercase' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  h1: { fontFamily: type.display, fontSize: 40, color: c.text, letterSpacing: -1.2, marginTop: 2 },
  clearBtn: { paddingVertical: 7, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: c.surface2 },
  clearText: { fontFamily: type.mono, fontSize: 11, color: c.textMuted, textTransform: 'uppercase' },
  count: { fontFamily: type.mono, fontSize: 12, color: c.textFaint, marginTop: 2, marginBottom: spacing.md },

  filters: { paddingLeft: spacing.lg, gap: 8, paddingBottom: spacing.md },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  filterLabel: { fontFamily: type.mono, fontSize: 10, color: c.textFaint, width: 58, textTransform: 'uppercase' },
  chip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: c.surface2 },
  chipActive: { backgroundColor: c.accent },
  chipText: { fontFamily: type.mono, fontSize: 11.5, color: c.textMuted },
  chipTextActive: { color: c.onAccent },

  scroll: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: tabInset },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.lg, paddingVertical: spacing.lg, paddingHorizontal: spacing.lg },

  statusCircle: {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  statusGlyph: { fontSize: 15, fontFamily: type.heading, includeFontPadding: false },

  name: { fontFamily: type.heading, fontSize: 15.5, color: c.text, lineHeight: 21 },
  meta: { fontFamily: type.mono, fontSize: 10.5, color: c.textFaint, marginTop: 4, textTransform: 'capitalize' },
  rightCol: { alignItems: 'flex-end', gap: spacing.sm },
  noteBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' },
  noteIcon: { fontSize: 14, color: c.textFaint },

  empty: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyTitle: { fontFamily: type.display, fontSize: 22, color: c.text },
  emptyBody: { fontFamily: type.body, fontSize: 14, color: c.textMuted },
  emptyBtn: { marginTop: spacing.md, paddingVertical: 13, paddingHorizontal: spacing.xl, borderRadius: radius.pill, backgroundColor: c.surface2 },
  emptyBtnText: { fontFamily: type.heading, fontSize: 13, color: c.text },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modal: { backgroundColor: c.surface, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, padding: spacing.xl, paddingBottom: spacing.xxl },
  modalTitle: { fontFamily: type.display, fontSize: 22, color: c.text, marginBottom: spacing.lg, letterSpacing: -0.4 },
  input: {
    color: c.text, fontFamily: type.body, fontSize: 15,
    backgroundColor: c.surface2, borderRadius: radius.lg,
    padding: spacing.lg, minHeight: 120, textAlignVertical: 'top',
  },
  cancel: { fontFamily: type.mono, fontSize: 12, color: c.textMuted, textAlign: 'center', textTransform: 'uppercase' },
});
