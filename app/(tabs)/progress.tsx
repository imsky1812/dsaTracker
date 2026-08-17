import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, spacing, radius, type } from '../../src/theme/tokens';
import { Card, Eyebrow } from '../../src/components/ui';
import { Heatmap } from '../../src/components/Heatmap';
import { plan, allProblems } from '../../src/lib/content';
import { useProgress } from '../../src/store/progress';
import { useSession } from '../../src/store/session';
import { supabaseEnabled } from '../../src/lib/supabase';
import { effectiveStreak } from '../../src/lib/dates';

export default function Progress() {
  const { problemStatus, activity, currentStreak, longestStreak, topicDone, lastActiveDate } = useProgress();
  const all = useMemo(() => allProblems(), []);

  // The stored streak only changes when something is solved, so after idle days
  // it would still read the old number. Decay it for display.
  const streak = effectiveStreak(currentStreak, lastActiveDate);

  // These numbers come from the store, which M4 keeps reconciled with the
  // account — so the same figures follow the user across devices.
  const pendingCount = useProgress((s) => s.pending.length);
  const signedIn = useSession((s) => Boolean(s.session));

  const solved = all.filter((p) => problemStatus[p.id] === 'solved').length;
  const revisit = all.filter((p) => problemStatus[p.id] === 'revisit').length;
  const total = all.length;
  const pct = total ? Math.round((solved / total) * 100) : 0;
  const totalSolvedDays = Object.values(activity).filter((c) => c > 0).length;

  // per-difficulty
  const byDiff = (d: string) => {
    const items = all.filter((p) => p.difficulty === d);
    const done = items.filter((p) => problemStatus[p.id] === 'solved').length;
    return { done, total: items.length };
  };
  const easy = byDiff('Easy'), medium = byDiff('Medium'), hard = byDiff('Hard');

  // per-company — the placement-prep view: "how much of Amazon's set have I
  // done?". A problem counts once per company it is tagged with.
  const companyStats = useMemo(() => {
    const rows = plan.companies.map((name) => {
      const items = all.filter((p) => p.companies.includes(name));
      const done = items.filter((p) => problemStatus[p.id] === 'solved').length;
      return { name, done, total: items.length };
    });
    // Biggest sets first — those are the ones worth grinding.
    return rows.filter((r) => r.total > 0).sort((a, b) => b.total - a.total);
  }, [all, problemStatus]);

  // per-topic completion
  const topicStats = plan.topics.map((t) => {
    const items = t.problems.length;
    const done = t.problems.filter((p) => problemStatus[`${t.slug}::${p.name}`] === 'solved').length;
    return { slug: t.slug, title: t.title, done, total: items, complete: topicDone[t.slug] };
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Eyebrow>Track</Eyebrow>
        <Text style={styles.h1}>Progress</Text>
        {supabaseEnabled && (
          <Text style={styles.syncNote}>
            {signedIn
              ? pendingCount > 0
                ? `Synced to your account · ${pendingCount} change${pendingCount === 1 ? '' : 's'} still uploading`
                : 'Synced to your account'
              : 'This device only · sign in to sync'}
          </Text>
        )}

        {solved === 0 && (
          <Card style={{ marginBottom: spacing.lg }}>
            <Eyebrow>Nothing here yet</Eyebrow>
            <Text style={styles.emptyBody}>
              Mark your first problem solved and this page fills in — heatmap, streak, and how far
              through each company’s set you are.
            </Text>
            <Pressable style={styles.emptyCta} onPress={() => router.push('/(tabs)/practice')}>
              <Text style={styles.emptyCtaText}>Start practising →</Text>
            </Pressable>
          </Card>
        )}

        {/* Headline numbers */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={styles.statNum}>{pct}%</Text>
            <Text style={styles.statLabel}>complete</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statNum}>{solved}</Text>
            <Text style={styles.statLabel}>solved</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statNum}>{streak}</Text>
            <Text style={styles.statLabel}>streak</Text>
          </Card>
        </View>

        {/* Heatmap — signature element */}
        <Card style={{ marginBottom: spacing.lg }}>
          <Eyebrow>Contribution heatmap</Eyebrow>
          <Text style={styles.subtle}>Problems solved per day · last 18 weeks</Text>
          <View style={{ marginTop: spacing.md }}>
            <Heatmap activity={activity} />
          </View>
          <Text style={styles.heatFoot}>{totalSolvedDays} active days · longest streak {longestStreak}</Text>
        </Card>

        {/* Difficulty breakdown */}
        <Card style={{ marginBottom: spacing.lg }}>
          <Eyebrow>By difficulty</Eyebrow>
          <DiffBar label="Easy" done={easy.done} total={easy.total} color={colors.easy} />
          <DiffBar label="Medium" done={medium.done} total={medium.total} color={colors.medium} />
          <DiffBar label="Hard" done={hard.done} total={hard.total} color={colors.hard} />
          {revisit > 0 && <Text style={styles.revisit}>↺ {revisit} flagged for revisit</Text>}
        </Card>

        {/* Per-company — tap through to that company's set in Practice */}
        <Card style={{ marginBottom: spacing.lg }}>
          <Eyebrow>By company</Eyebrow>
          <Text style={styles.subtle}>Tap a company to practise its tagged set</Text>
          <View style={{ marginTop: spacing.sm }}>
            {companyStats.map((c) => (
              <Pressable
                key={c.name}
                onPress={() => router.push({ pathname: '/(tabs)/practice', params: { company: c.name } })}
                style={({ pressed }) => [styles.topicRow, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.topicName}>{c.name}</Text>
                <View style={styles.topicBarTrack}>
                  <View
                    style={[
                      styles.topicBarFill,
                      { width: `${c.total ? (c.done / c.total) * 100 : 0}%` },
                    ]}
                  />
                </View>
                <Text style={styles.topicCount}>{c.done}/{c.total}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* Per-topic */}
        <Card>
          <Eyebrow>By topic</Eyebrow>
          <View style={{ marginTop: spacing.sm }}>
            {topicStats.map((t) => (
              <View key={t.slug} style={styles.topicRow}>
                <Text style={styles.topicName}>{t.title}{t.complete ? '  ✓' : ''}</Text>
                <View style={styles.topicBarTrack}>
                  <View style={[styles.topicBarFill, { width: `${t.total ? (t.done / t.total) * 100 : 0}%` }]} />
                </View>
                <Text style={styles.topicCount}>{t.done}/{t.total}</Text>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function DiffBar({ label, done, total, color }: any) {
  const pct = total ? (done / total) * 100 : 0;
  return (
    <View style={styles.diffRow}>
      <Text style={[styles.diffLabel, { color }]}>{label}</Text>
      <View style={styles.diffTrack}>
        <View style={[styles.diffFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.diffCount}>{done}/{total}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  h1: { fontFamily: type.display, fontSize: 34, color: colors.text, letterSpacing: -0.5, marginBottom: spacing.sm },
  syncNote: { fontFamily: type.mono, fontSize: 11, color: colors.textFaint, marginBottom: spacing.lg },
  emptyBody: { fontFamily: type.body, fontSize: 14, color: colors.textMuted, lineHeight: 21, marginTop: 4 },
  emptyCta: { marginTop: spacing.lg, borderWidth: 1, borderColor: colors.accentDim, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  emptyCtaText: { fontFamily: type.heading, fontSize: 14, color: colors.accent },
  statsGrid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  statCard: { flex: 1, alignItems: 'center' },
  statNum: { fontFamily: type.display, fontSize: 30, color: colors.accent },
  statLabel: { fontFamily: type.mono, fontSize: 10, color: colors.textMuted, marginTop: 4, textTransform: 'uppercase' },
  subtle: { fontFamily: type.mono, fontSize: 11, color: colors.textFaint, marginTop: 4 },
  heatFoot: { fontFamily: type.mono, fontSize: 11, color: colors.textFaint, marginTop: spacing.md },
  diffRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: spacing.md },
  diffLabel: { fontFamily: type.mono, fontSize: 12, width: 60, textTransform: 'uppercase' },
  diffTrack: { flex: 1, height: 8, backgroundColor: colors.surface2, borderRadius: 4, overflow: 'hidden' },
  diffFill: { height: 8, borderRadius: 4 },
  diffCount: { fontFamily: type.mono, fontSize: 12, color: colors.textMuted, width: 46, textAlign: 'right' },
  revisit: { fontFamily: type.mono, fontSize: 12, color: colors.medium, marginTop: spacing.md },
  topicRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, gap: spacing.md },
  topicName: { fontFamily: type.body, fontSize: 13, color: colors.text, width: 120 },
  topicBarTrack: { flex: 1, height: 6, backgroundColor: colors.surface2, borderRadius: 3, overflow: 'hidden' },
  topicBarFill: { height: 6, backgroundColor: colors.accent, borderRadius: 3 },
  topicCount: { fontFamily: type.mono, fontSize: 11, color: colors.textFaint, width: 40, textAlign: 'right' },
});
