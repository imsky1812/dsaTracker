import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Palette, spacing, radius, type, tabInset, difficultyColor } from '../../src/theme/tokens';
import { useColors, useThemedStyles } from '../../src/theme/theme';
import { Card, Eyebrow, Pill, Bar, CircleButton } from '../../src/components/ui';
import { plan, allProblems } from '../../src/lib/content';
import { useProgress } from '../../src/store/progress';
import { effectiveStreak } from '../../src/lib/dates';

export default function Today() {
  const c = useColors();
  const s = useThemedStyles(makeStyles);
  const { problemStatus, currentStreak, topicDone, language, lastActiveDate } = useProgress();
  const streak = effectiveStreak(currentStreak, lastActiveDate);

  const problems = allProblems();
  const solved = problems.filter((p) => problemStatus[p.id] === 'solved').length;
  const total = problems.length;
  const pct = total ? (solved / total) * 100 : 0;

  const doneTopics = Object.values(topicDone).filter(Boolean).length;
  const phaseIdx = Math.min(
    Math.floor((doneTopics / plan.topics.length) * plan.roadmap.phases.length),
    plan.roadmap.phases.length - 1
  );
  const phase = plan.roadmap.phases[phaseIdx];

  const nextProblem = problems.find((p) => (problemStatus[p.id] ?? 'unsolved') !== 'solved');

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.kicker}>{language.toUpperCase()} · your path</Text>
            <Text style={s.h1}>Today</Text>
          </View>
          <View style={s.streakChip}>
            <Text style={s.streakNum}>{streak}</Text>
            <Text style={s.streakLabel}>day{streak === 1 ? '' : 's'}</Text>
          </View>
        </View>

        {/* Overall progress — the one number that matters most, given room. */}
        <Card style={{ marginBottom: spacing.lg }}>
          <View style={s.progressTop}>
            <View>
              <Text style={s.bigNum}>{solved}</Text>
              <Text style={s.bigLabel}>of {total} solved</Text>
            </View>
            <Text style={s.pctText}>{Math.round(pct)}%</Text>
          </View>
          <View style={{ marginTop: spacing.lg }}>
            <Bar pct={pct} height={10} />
          </View>
        </Card>

        {/* Current phase */}
        <Card style={{ marginBottom: spacing.lg }}>
          <Eyebrow>Current phase</Eyebrow>
          <Text style={s.phaseTitle}>{phase.title}</Text>
          <Text style={s.phaseWeeks}>{phase.est_weeks}</Text>
          <Text style={s.body}>{phase.summary}</Text>
          <Pressable style={s.rowLink} onPress={() => router.push('/(tabs)/learn')}>
            <Text style={s.rowLinkText}>Open the roadmap</Text>
            <CircleButton glyph="→" size="sm" onPress={() => router.push('/(tabs)/learn')} />
          </Pressable>
        </Card>

        {/* Today's focus */}
        {nextProblem && (
          <Card style={{ marginBottom: spacing.lg }}>
            <Eyebrow color={c.medium}>Today’s focus</Eyebrow>
            <Text style={s.focusName}>{nextProblem.name}</Text>
            <View style={s.focusMeta}>
              <Pill
                label={nextProblem.difficulty}
                filled
                color={difficultyColor(c, nextProblem.difficulty)}
                small
              />
              <Pill label={nextProblem.platform} small />
              <Text style={s.focusTopic}>{nextProblem.topicSlug.replace(/-/g, ' ')}</Text>
            </View>
            <Pressable style={s.rowLink} onPress={() => router.push('/(tabs)/practice')}>
              <Text style={s.rowLinkText}>Go to practice</Text>
              <CircleButton glyph="→" size="sm" onPress={() => router.push('/(tabs)/practice')} />
            </Pressable>
          </Card>
        )}

        <View style={s.statsRow}>
          <Card style={s.statCard}>
            <Text style={s.statNum}>{doneTopics}</Text>
            <Text style={s.statLabel}>of {plan.topics.length}{'\n'}topics</Text>
          </Card>
          <Card style={s.statCard}>
            <Text style={s.statNum}>{plan.roadmap.phases.length - phaseIdx - 1}</Text>
            <Text style={s.statLabel}>phases{'\n'}to go</Text>
          </Card>
        </View>

        <Text style={s.loop}>watch → re-code → solve → note → commit</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  scroll: { padding: spacing.lg, paddingBottom: tabInset },

  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl, gap: spacing.md },
  kicker: { fontFamily: type.mono, fontSize: 11, color: c.textFaint, letterSpacing: 1.5, textTransform: 'uppercase' },
  h1: { fontFamily: type.display, fontSize: 40, color: c.text, letterSpacing: -1.2, marginTop: 2 },

  streakChip: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: c.accentSoft,
    borderWidth: 1.5,
    borderColor: c.accentDim,
  },
  streakNum: { fontFamily: type.display, fontSize: 24, color: c.accent, includeFontPadding: false },
  streakLabel: { fontFamily: type.mono, fontSize: 9, color: c.accent, textTransform: 'uppercase', marginTop: 1 },

  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  bigNum: { fontFamily: type.display, fontSize: 44, color: c.text, letterSpacing: -1.5, includeFontPadding: false },
  bigLabel: { fontFamily: type.mono, fontSize: 12, color: c.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  pctText: { fontFamily: type.display, fontSize: 24, color: c.accent, letterSpacing: -0.5 },

  phaseTitle: { fontFamily: type.display, fontSize: 23, color: c.text, marginTop: 2, letterSpacing: -0.4 },
  phaseWeeks: { fontFamily: type.mono, fontSize: 12, color: c.accent, marginTop: 4, marginBottom: spacing.md },
  body: { fontFamily: type.body, fontSize: 14.5, color: c.textMuted, lineHeight: 23 },

  rowLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg },
  rowLinkText: { fontFamily: type.heading, fontSize: 14, color: c.text },

  focusName: { fontFamily: type.display, fontSize: 22, color: c.text, marginTop: 2, marginBottom: spacing.md, letterSpacing: -0.4 },
  focusMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  focusTopic: { fontFamily: type.mono, fontSize: 11, color: c.textFaint, textTransform: 'capitalize' },

  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: spacing.xl },
  statNum: { fontFamily: type.display, fontSize: 34, color: c.text, letterSpacing: -1 },
  statLabel: { fontFamily: type.mono, fontSize: 10.5, color: c.textMuted, marginTop: 6, textTransform: 'uppercase', textAlign: 'center', lineHeight: 15 },

  loop: { fontFamily: type.mono, fontSize: 11.5, color: c.textFaint, textAlign: 'center', letterSpacing: 0.5 },
});
