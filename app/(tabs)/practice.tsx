import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { colors, spacing, radius, type, difficultyColor } from '../../src/theme/tokens';
import { Card, Eyebrow, Pill } from '../../src/components/ui';
import { plan, allProblems, ProblemStatus } from '../../src/lib/content';
import { useProgress } from '../../src/store/progress';

type StatusFilter = 'all' | ProblemStatus;
type DiffFilter = 'all' | 'Easy' | 'Medium' | 'Hard';
type PlatFilter = 'all' | 'LeetCode' | 'GFG';

export default function Practice() {
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

  const statusColor = (s?: string) => s === 'solved' ? colors.easy : s === 'revisit' ? colors.medium : colors.textFaint;
  const statusGlyph = (s?: string) => s === 'solved' ? '✓' : s === 'revisit' ? '↺' : '○';

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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Eyebrow>Solve</Eyebrow>
        <Text style={styles.h1}>Practice</Text>
        <Text style={styles.count}>{filtered.length} of {all.length} problems</Text>
      </View>

      {/* Filter rows */}
      <View style={styles.filters}>
        <FilterRow label="Status" value={status} setValue={setStatus} options={['all', 'unsolved', 'solved', 'revisit']} />
        <FilterRow label="Level" value={diff} setValue={setDiff} options={['all', 'Easy', 'Medium', 'Hard']} />
        <FilterRow label="Source" value={plat} setValue={setPlat} options={['all', 'LeetCode', 'GFG']} />
        <FilterRow label="Company" value={company} setValue={setCompany} options={['all', ...plan.companies]} />
        <FilterRow label="Topic" value={topic} setValue={setTopic}
          options={['all', ...plan.topics.map((t) => t.slug)]}
          labelFor={(v: string) => v === 'all' ? 'all' : v.replace(/-/g, ' ')} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {filtered.map((p) => {
          const st = problemStatus[p.id];
          const hasNote = Boolean(problemNotes[p.id]);
          return (
            <Card key={p.id} style={styles.row}>
              <Pressable onPress={() => cycleProblemStatus(p.id)} hitSlop={10} style={styles.statusBtn}>
                <Text style={[styles.statusGlyph, { color: statusColor(st) }]}>{statusGlyph(st)}</Text>
              </Pressable>
              <Pressable style={{ flex: 1 }} onPress={() => void openProblem(p.url, p.name)}>
                <Text style={styles.name}>{p.name}</Text>
                <Text style={styles.meta}>{p.topicSlug.replace(/-/g, ' ')} · {p.companies.slice(0, 3).join(', ')}</Text>
              </Pressable>
              <View style={styles.rightCol}>
                <Pill label={p.difficulty} filled color={difficultyColor(p.difficulty)} small />
                <Pressable onPress={() => openNote(p.id)} hitSlop={8}>
                  <Text style={[styles.noteIcon, hasNote && { color: colors.accent }]}>✎</Text>
                </Pressable>
              </View>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <Text style={styles.empty}>No problems match these filters. Loosen one to see more.</Text>
        )}
      </ScrollView>

      {/* Note editor */}
      <Modal visible={noteFor !== null} transparent animationType="fade" onRequestClose={() => setNoteFor(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Eyebrow>Note</Eyebrow>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="Approach, gotchas, complexity…"
              placeholderTextColor={colors.textFaint}
              multiline
              autoFocus
            />
            <View style={styles.modalBtns}>
              <Pressable onPress={() => setNoteFor(null)}><Text style={styles.cancel}>Cancel</Text></Pressable>
              <Pressable onPress={saveNote} style={styles.saveBtn}><Text style={styles.saveText}>Save</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function FilterRow({ label, value, setValue, options, labelFor }: any) {
  return (
    <View style={styles.filterRow}>
      <Text style={styles.filterLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: spacing.lg }}>
        {options.map((o: string) => (
          <Pressable key={o} onPress={() => setValue(o)} style={[styles.chip, value === o && styles.chipActive]}>
            <Text style={[styles.chipText, value === o && styles.chipTextActive]}>{labelFor ? labelFor(o) : o}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  h1: { fontFamily: type.display, fontSize: 34, color: colors.text, letterSpacing: -0.5 },
  count: { fontFamily: type.mono, fontSize: 12, color: colors.textFaint, marginTop: 2, marginBottom: spacing.md },
  filters: { paddingLeft: spacing.lg, gap: 6, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  filterLabel: { fontFamily: type.mono, fontSize: 10, color: colors.textFaint, width: 58, textTransform: 'uppercase' },
  chip: { paddingVertical: 5, paddingHorizontal: 11, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.accentSoft, borderColor: colors.accentDim },
  chipText: { fontFamily: type.mono, fontSize: 11, color: colors.textMuted, textTransform: 'capitalize' },
  chipTextActive: { color: colors.accent },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.md, paddingVertical: spacing.md },
  statusBtn: { width: 26, alignItems: 'center' },
  statusGlyph: { fontSize: 20 },
  name: { fontFamily: type.heading, fontSize: 15, color: colors.text },
  meta: { fontFamily: type.mono, fontSize: 10, color: colors.textFaint, marginTop: 3, textTransform: 'capitalize' },
  rightCol: { alignItems: 'flex-end', gap: 6 },
  noteIcon: { fontSize: 16, color: colors.textFaint },
  empty: { fontFamily: type.body, fontSize: 14, color: colors.textFaint, textAlign: 'center', marginTop: spacing.xl, fontStyle: 'italic' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: spacing.lg },
  modal: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  input: { color: colors.text, fontFamily: type.body, fontSize: 15, minHeight: 100, textAlignVertical: 'top', marginTop: spacing.sm, backgroundColor: colors.surface2, borderRadius: radius.md, padding: spacing.md },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.lg, marginTop: spacing.md },
  cancel: { fontFamily: type.mono, fontSize: 13, color: colors.textMuted },
  saveBtn: { backgroundColor: colors.accent, paddingVertical: 8, paddingHorizontal: 20, borderRadius: radius.pill },
  saveText: { fontFamily: type.heading, fontSize: 13, color: '#fff' },
});
