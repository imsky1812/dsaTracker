import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, spacing, radius, type } from '../../src/theme/tokens';
import { Card, Eyebrow, Pill } from '../../src/components/ui';
import { plan, allProblems } from '../../src/lib/content';
import { useProgress } from '../../src/store/progress';
import { effectiveStreak } from '../../src/lib/dates';

export default function Today() {
  const { problemStatus, currentStreak, topicDone, language, lastActiveDate } = useProgress();
  const streak = effectiveStreak(currentStreak, lastActiveDate);
  const problems = allProblems();
  const solved = problems.filter((p) => problemStatus[p.id] === 'solved').length;
  const total = problems.length;

  // pick the current phase: first phase whose topics aren't all done — simplified
  const doneTopics = Object.values(topicDone).filter(Boolean).length;
  const phaseIdx = Math.min(Math.floor((doneTopics / plan.topics.length) * plan.roadmap.phases.length), plan.roadmap.phases.length - 1);
  const phase = plan.roadmap.phases[phaseIdx];

  // next unsolved problem as "today's focus"
  const nextProblem = problems.find((p) => (problemStatus[p.id] ?? 'unsolved') !== 'solved');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Eyebrow>Your path · {language.toUpperCase()}</Eyebrow>
            <Text style={styles.h1}>DSA <Text style={{ color: colors.accent }}>Mastery</Text></Text>
          </View>
          <View style={styles.streakBox}>
            <Text style={styles.streakNum}>{streak}</Text>
            <Text style={styles.streakLabel}>day streak</Text>
          </View>
        </View>

        <Card style={{ marginBottom: spacing.lg }}>
          <Eyebrow>Current phase</Eyebrow>
          <Text style={styles.phaseTitle}>{phase.title}</Text>
          <Text style={styles.phaseWeeks}>{phase.est_weeks}</Text>
          <Text style={styles.phaseSummary}>{phase.summary}</Text>
          <Pressable style={styles.cta} onPress={() => router.push('/learn')}>
            <Text style={styles.ctaText}>Open the roadmap →</Text>
          </Pressable>
        </Card>

        {nextProblem && (
          <Card style={{ marginBottom: spacing.lg }}>
            <Eyebrow color={colors.medium}>Today's focus</Eyebrow>
            <Text style={styles.focusName}>{nextProblem.name}</Text>
            <View style={styles.focusMeta}>
              <Pill label={nextProblem.difficulty} filled color={nextProblem.difficulty === 'Easy' ? colors.easy : nextProblem.difficulty === 'Medium' ? colors.medium : colors.hard} small />
              <Pill label={nextProblem.platform} small />
              <Text style={styles.focusTopic}>{nextProblem.topicSlug.replace(/-/g, ' ')}</Text>
            </View>
            <Pressable style={styles.cta} onPress={() => router.push('/practice')}>
              <Text style={styles.ctaText}>Go to practice →</Text>
            </Pressable>
          </Card>
        )}

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statNum}>{solved}</Text>
            <Text style={styles.statLabel}>solved of {total}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statNum}>{doneTopics}</Text>
            <Text style={styles.statLabel}>of {plan.topics.length} topics</Text>
          </Card>
        </View>

        <Text style={styles.loop}>Watch → re-code → solve → note → commit</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xl },
  h1: { fontFamily: type.display, fontSize: 34, color: colors.text, letterSpacing: -0.5 },
  streakBox: { alignItems: 'center', backgroundColor: colors.accentSoft, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.accentDim },
  streakNum: { fontFamily: type.display, fontSize: 26, color: colors.accent },
  streakLabel: { fontFamily: type.mono, fontSize: 9, color: colors.textMuted, textTransform: 'uppercase' },
  phaseTitle: { fontFamily: type.display, fontSize: 22, color: colors.text, marginTop: 2 },
  phaseWeeks: { fontFamily: type.mono, fontSize: 12, color: colors.accent, marginTop: 2, marginBottom: spacing.sm },
  phaseSummary: { fontFamily: type.body, fontSize: 14, color: colors.textMuted, lineHeight: 21 },
  cta: { marginTop: spacing.md },
  ctaText: { fontFamily: type.mono, fontSize: 13, color: colors.accent },
  focusName: { fontFamily: type.heading, fontSize: 19, color: colors.text, marginTop: 2, marginBottom: spacing.sm },
  focusMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  focusTopic: { fontFamily: type.mono, fontSize: 11, color: colors.textFaint, textTransform: 'capitalize' },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  statCard: { flex: 1, alignItems: 'center' },
  statNum: { fontFamily: type.display, fontSize: 32, color: colors.accent },
  statLabel: { fontFamily: type.mono, fontSize: 11, color: colors.textMuted, marginTop: 4, textTransform: 'uppercase', textAlign: 'center' },
  loop: { fontFamily: type.mono, fontSize: 12, color: colors.textFaint, textAlign: 'center', letterSpacing: 0.5 },
});
