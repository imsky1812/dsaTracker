import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Palette, spacing, radius, type, tabInset } from '../../src/theme/tokens';
import { useColors, useThemedStyles } from '../../src/theme/theme';
import { Card, Eyebrow, Bar, PrimaryButton } from '../../src/components/ui';
import { Heatmap } from '../../src/components/Heatmap';
import { plan, allProblems } from '../../src/lib/content';
import { useProgress } from '../../src/store/progress';
import { useSession } from '../../src/store/session';
import { supabaseEnabled } from '../../src/lib/supabase';
import { effectiveStreak } from '../../src/lib/dates';

export default function Progress() {
  const c = useColors();
  const s = useThemedStyles(makeStyles);
  const { problemStatus, activity, currentStreak, longestStreak, topicDone, lastActiveDate } = useProgress();
  const all = useMemo(() => allProblems(), []);

  // The stored streak only changes when something is solved, so after idle days
  // it would still read the old number. Decay it for display.
  const streak = effectiveStreak(currentStreak, lastActiveDate);

  // These numbers come from the store, which M4 keeps reconciled with the
  // account — so the same figures follow the user across devices.
  const pendingCount = useProgress((st) => st.pending.length);
  const signedIn = useSession((st) => Boolean(st.session));

  const solved = all.filter((p) => problemStatus[p.id] === 'solved').length;
  const revisit = all.filter((p) => problemStatus[p.id] === 'revisit').length;
  const total = all.length;
  const pct = total ? Math.round((solved / total) * 100) : 0;
  const totalSolvedDays = Object.values(activity).filter((n) => n > 0).length;

  const byDiff = (d: string) => {
    const items = all.filter((p) => p.difficulty === d);
    return { done: items.filter((p) => problemStatus[p.id] === 'solved').length, total: items.length };
  };
  const easy = byDiff('Easy'), medium = byDiff('Medium'), hard = byDiff('Hard');

  // per-company — the placement-prep view: "how much of Amazon's set have I
  // done?". A problem counts once per company it is tagged with.
  const companyStats = useMemo(() => {
    return plan.companies
      .map((name) => {
        const items = all.filter((p) => p.companies.includes(name));
        return { name, done: items.filter((p) => problemStatus[p.id] === 'solved').length, total: items.length };
      })
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [all, problemStatus]);

  const topicStats = plan.topics.map((t) => {
    const done = t.problems.filter((p) => problemStatus[`${t.slug}::${p.name}`] === 'solved').length;
    return { slug: t.slug, title: t.title, done, total: t.problems.length, complete: topicDone[t.slug] };
  });

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.kicker}>Track</Text>
        <Text style={s.h1}>Progress</Text>
        {supabaseEnabled && (
          <Text style={s.syncNote}>
            {signedIn
              ? pendingCount > 0
                ? `Synced · ${pendingCount} change${pendingCount === 1 ? '' : 's'} uploading`
                : 'Synced to your account'
              : 'This device only · sign in to sync'}
          </Text>
        )}

        {solved === 0 ? (
          <Card style={{ marginBottom: spacing.lg }}>
            <Eyebrow>Nothing here yet</Eyebrow>
            <Text style={s.emptyBody}>
              Mark your first problem solved and this page fills in — heatmap, streak, and how far
              through each company’s set you are.
            </Text>
            <PrimaryButton
              label="Start practising"
              onPress={() => router.push('/(tabs)/practice')}
              style={{ marginTop: spacing.lg }}
            />
          </Card>
        ) : (
          <View style={s.statsGrid}>
            <Card style={s.statCard}>
              <Text style={s.statNum}>{pct}%</Text>
              <Text style={s.statLabel}>complete</Text>
            </Card>
            <Card style={s.statCard}>
              <Text style={s.statNum}>{solved}</Text>
              <Text style={s.statLabel}>solved</Text>
            </Card>
            <Card style={s.statCard}>
              <Text style={s.statNum}>{streak}</Text>
              <Text style={s.statLabel}>streak</Text>
            </Card>
          </View>
        )}

        {/* Heatmap — signature element */}
        <Card style={{ marginBottom: spacing.lg }}>
          <Eyebrow>Contribution heatmap</Eyebrow>
          <Text style={s.subtle}>Problems solved per day · last 18 weeks</Text>
          <View style={{ marginTop: spacing.lg }}>
            <Heatmap activity={activity} />
          </View>
          <Text style={s.heatFoot}>
            {totalSolvedDays} active day{totalSolvedDays === 1 ? '' : 's'} · longest streak {longestStreak}
          </Text>
        </Card>

        {/* Difficulty */}
        <Card style={{ marginBottom: spacing.lg }}>
          <Eyebrow>By difficulty</Eyebrow>
          <View style={{ marginTop: spacing.md }}>
            <DiffBar label="Easy" done={easy.done} total={easy.total} color={c.easy} />
            <DiffBar label="Medium" done={medium.done} total={medium.total} color={c.medium} />
            <DiffBar label="Hard" done={hard.done} total={hard.total} color={c.hard} />
          </View>
          {revisit > 0 && <Text style={s.revisit}>↺ {revisit} flagged for revisit</Text>}
        </Card>

        {/* Company — tap through to that company's set in Practice */}
        <Card style={{ marginBottom: spacing.lg }}>
          <Eyebrow>By company</Eyebrow>
          <Text style={s.subtle}>Tap a company to practise its tagged set</Text>
          <View style={{ marginTop: spacing.md }}>
            {companyStats.map((co) => (
              <Pressable
                key={co.name}
                onPress={() => router.push({ pathname: '/(tabs)/practice', params: { company: co.name } })}
                style={({ pressed }) => [s.listRow, pressed && { opacity: 0.6 }]}
              >
                <Text style={s.listName}>{co.name}</Text>
                <Bar pct={co.total ? (co.done / co.total) * 100 : 0} height={6} />
                <Text style={s.listCount}>{co.done}/{co.total}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* Topic */}
        <Card>
          <Eyebrow>By topic</Eyebrow>
          <View style={{ marginTop: spacing.md }}>
            {topicStats.map((t) => (
              <Pressable
                key={t.slug}
                onPress={() => router.push(`/topic/${t.slug}`)}
                style={({ pressed }) => [s.listRow, pressed && { opacity: 0.6 }]}
              >
                <Text style={s.listName} numberOfLines={1}>
                  {t.title}{t.complete ? ' ✓' : ''}
                </Text>
                <Bar pct={t.total ? (t.done / t.total) * 100 : 0} height={6} />
                <Text style={s.listCount}>{t.done}/{t.total}</Text>
              </Pressable>
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function DiffBar({ label, done, total, color }: { label: string; done: number; total: number; color: string }) {
  const s = useThemedStyles(makeStyles);
  return (
    <View style={s.diffRow}>
      <Text style={[s.diffLabel, { color }]}>{label}</Text>
      <Bar pct={total ? (done / total) * 100 : 0} color={color} />
      <Text style={s.diffCount}>{done}/{total}</Text>
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  scroll: { padding: spacing.lg, paddingBottom: tabInset },
  kicker: { fontFamily: type.mono, fontSize: 11, color: c.textFaint, letterSpacing: 1.5, textTransform: 'uppercase' },
  h1: { fontFamily: type.display, fontSize: 40, color: c.text, letterSpacing: -1.2, marginTop: 2 },
  syncNote: { fontFamily: type.mono, fontSize: 11, color: c.textFaint, marginTop: 6, marginBottom: spacing.lg },

  emptyBody: { fontFamily: type.body, fontSize: 14.5, color: c.textMuted, lineHeight: 23, marginTop: 4 },

  statsGrid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.sm },
  statNum: { fontFamily: type.display, fontSize: 30, color: c.text, letterSpacing: -1 },
  statLabel: { fontFamily: type.mono, fontSize: 10, color: c.textMuted, marginTop: 6, textTransform: 'uppercase' },

  subtle: { fontFamily: type.mono, fontSize: 11, color: c.textFaint, marginTop: 2 },
  heatFoot: { fontFamily: type.mono, fontSize: 11, color: c.textFaint, marginTop: spacing.lg },

  diffRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: spacing.md },
  diffLabel: { fontFamily: type.mono, fontSize: 11.5, width: 58, textTransform: 'uppercase' },
  diffCount: { fontFamily: type.mono, fontSize: 11.5, color: c.textMuted, width: 48, textAlign: 'right' },
  revisit: { fontFamily: type.mono, fontSize: 12, color: c.medium, marginTop: spacing.lg },

  listRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, gap: spacing.md },
  listName: { fontFamily: type.body, fontSize: 13.5, color: c.text, width: 116 },
  listCount: { fontFamily: type.mono, fontSize: 11, color: c.textFaint, width: 44, textAlign: 'right' },
});
