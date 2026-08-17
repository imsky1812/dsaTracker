import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Palette, spacing, radius, type, tabInset } from '../../src/theme/tokens';
import { useColors, useThemedStyles } from '../../src/theme/theme';
import { Card, Eyebrow, CodeBlock, Bar } from '../../src/components/ui';
import { plan, problemId } from '../../src/lib/content';
import { useProgress } from '../../src/store/progress';

type Segment = 'roadmap' | 'topics' | 'language';

export default function Learn() {
  const s = useThemedStyles(makeStyles);
  const [seg, setSeg] = useState<Segment>('roadmap');
  const { topicDone } = useProgress();

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.head}>
        <Text style={s.kicker}>Study</Text>
        <Text style={s.h1}>Learn</Text>
        <View style={s.segRow}>
          {(['roadmap', 'topics', 'language'] as Segment[]).map((k) => (
            <Pressable key={k} onPress={() => setSeg(k)} style={[s.seg, seg === k && s.segActive]}>
              <Text style={[s.segText, seg === k && s.segTextActive]}>{k}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {seg === 'roadmap' && <Journey />}

        {seg === 'topics' &&
          plan.topics.map((t) => {
            const done = topicDone[t.slug];
            return (
              <Pressable key={t.slug} onPress={() => router.push(`/topic/${t.slug}`)}>
                {({ pressed }) => (
                  <Card style={[s.topicRow, pressed && { opacity: 0.7 }]}>
                    <View style={[s.topicNum, done && s.topicNumDone]}>
                      <Text style={[s.topicNumText, done && s.topicNumTextDone]}>
                        {done ? '✓' : String(t.order).padStart(2, '0')}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.topicTitle}>{t.title}</Text>
                      <Text style={s.topicMeta}>
                        {t.problems.length} problems · {t.code.length} code samples
                      </Text>
                    </View>
                    <Text style={s.chevron}>›</Text>
                  </Card>
                )}
              </Pressable>
            );
          })}

        {seg === 'language' && <LanguagePrimer />}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * The roadmap as a journey rather than eight equal cards.
 *
 * Each phase now reports real completion, computed from the topics assigned to
 * it (roadmap.json `topics`) and the problems solved within them. A connecting
 * rail runs down the left: filled behind you, hollow ahead. Exactly one phase is
 * "current" — the first not yet finished — and only that one expands, so the
 * screen answers "where am I and what's next" before it answers anything else.
 */
function Journey() {
  const c = useColors();
  const s = useThemedStyles(makeStyles);
  const { topicDone, problemStatus } = useProgress();

  const phases = plan.roadmap.phases.map((ph) => {
    const topics = ph.topics
      .map((slug) => plan.topics.find((t) => t.slug === slug))
      .filter((t): t is NonNullable<typeof t> => Boolean(t));

    const problems = topics.flatMap((t) => t.problems.map((p) => problemId(t.slug, p.name)));
    const solved = problems.filter((id) => problemStatus[id] === 'solved').length;
    const topicsDone = topics.filter((t) => topicDone[t.slug]).length;

    // Weight both signals: reading the topic and actually solving its problems.
    const pct = problems.length
      ? Math.round(((solved / problems.length) * 0.7 + (topicsDone / topics.length) * 0.3) * 100)
      : 0;

    return { ...ph, topics, solved, problemCount: problems.length, topicsDone, pct, done: pct >= 100 };
  });

  const currentIdx = phases.findIndex((p) => !p.done);
  const overall = Math.round(phases.reduce((n, p) => n + p.pct, 0) / phases.length);

  return (
    <>
      <Card style={{ marginBottom: spacing.lg }}>
        <View style={s.overallTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.overallLabel}>Your journey</Text>
            <Text style={s.overallStage}>
              {currentIdx === -1
                ? 'All phases complete'
                : `Stage ${currentIdx + 1} of ${phases.length}`}
            </Text>
          </View>
          <Text style={s.overallPct}>{overall}%</Text>
        </View>
        <View style={{ marginTop: spacing.lg }}>
          <Bar pct={overall} height={10} />
        </View>
      </Card>

      {phases.map((ph, i) => {
        const isCurrent = i === currentIdx;
        const isPast = ph.done;
        const isLast = i === phases.length - 1;

        return (
          <View key={ph.order} style={s.stageRow}>
            {/* Rail: the dot marks the stage, the line connects to the next. */}
            <View style={s.rail}>
              <View
                style={[
                  s.railDot,
                  isPast && { backgroundColor: c.mint, borderColor: c.mint },
                  isCurrent && { backgroundColor: c.accent, borderColor: c.accent },
                ]}
              >
                {isPast ? (
                  <Feather name="check" size={14} color={c.onAccent} />
                ) : (
                  <Text style={[s.railNum, isCurrent && { color: c.onAccent }]}>{i + 1}</Text>
                )}
              </View>
              {!isLast && <View style={[s.railLine, isPast && { backgroundColor: c.mint }]} />}
            </View>

            <View style={{ flex: 1, paddingBottom: spacing.lg }}>
              <Card style={isCurrent ? s.stageCardCurrent : undefined}>
                <View style={s.stageHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.stageTitle}>{ph.title}</Text>
                    <Text style={s.stageWeeks}>{ph.est_weeks}</Text>
                  </View>
                  {isCurrent && (
                    <View style={s.nowChip}><Text style={s.nowChipText}>Now</Text></View>
                  )}
                </View>

                <View style={s.stageBarRow}>
                  <Bar pct={ph.pct} height={6} color={isPast ? c.mint : c.accent} />
                  <Text style={s.stagePct}>{ph.pct}%</Text>
                </View>
                <Text style={s.stageCount}>
                  {ph.solved}/{ph.problemCount} problems · {ph.topicsDone}/{ph.topics.length} topics
                </Text>

                {/* Only the current stage opens up — the rest stay scannable. */}
                {isCurrent && (
                  <>
                    <Text style={[s.body, { marginTop: spacing.lg }]}>{ph.summary}</Text>

                    <View style={{ marginTop: spacing.lg }}>
                      {ph.topics.map((t) => {
                        const solvedHere = t.problems.filter(
                          (p) => problemStatus[problemId(t.slug, p.name)] === 'solved'
                        ).length;
                        return (
                          <Pressable
                            key={t.slug}
                            onPress={() => router.push(`/topic/${t.slug}`)}
                            style={({ pressed }) => [s.stageTopic, pressed && { opacity: 0.6 }]}
                          >
                            <Feather
                              name={topicDone[t.slug] ? 'check-circle' : 'circle'}
                              size={16}
                              color={topicDone[t.slug] ? c.mint : c.textFaint}
                            />
                            <Text style={s.stageTopicName}>{t.title}</Text>
                            <Text style={s.stageTopicCount}>{solvedHere}/{t.problems.length}</Text>
                            <Feather name="chevron-right" size={16} color={c.textFaint} />
                          </Pressable>
                        );
                      })}
                    </View>

                    <View style={s.check}>
                      <Feather name="flag" size={14} color={c.mint} />
                      <Text style={s.checkText}>{ph.checkpoint}</Text>
                    </View>
                  </>
                )}
              </Card>
            </View>
          </View>
        );
      })}
    </>
  );
}

function LanguagePrimer() {
  const c = useColors();
  const s = useThemedStyles(makeStyles);
  const { language } = useProgress();
  const primer = plan.primers[language] ?? plan.primers['cpp'];
  const [open, setOpen] = useState<number | null>(0);

  return (
    <>
      <Card style={{ marginBottom: spacing.lg }}>
        <Eyebrow color={c.medium}>{primer.language_name} primer</Eyebrow>
        <Text style={s.primerTagline}>{primer.tagline}</Text>
        <Text style={s.body}>{primer.intro}</Text>
      </Card>

      {primer.sections.map((sec) => {
        const isOpen = open === sec.order;
        return (
          <Pressable key={sec.order} onPress={() => setOpen(isOpen ? null : sec.order)}>
            <Card style={{ marginBottom: spacing.sm }}>
              <View style={s.sectionHead}>
                <Text style={s.sectionNum}>{String(sec.order).padStart(2, '0')}</Text>
                <Text style={s.sectionTitle}>{sec.title}</Text>
                <View style={s.expand}>
                  <Text style={s.expandGlyph}>{isOpen ? '−' : '+'}</Text>
                </View>
              </View>
              {isOpen && (
                <View style={{ marginTop: spacing.lg }}>
                  <Text style={s.body}>{sec.body_md}</Text>
                  <CodeBlock code={sec.code} />
                </View>
              )}
            </Card>
          </Pressable>
        );
      })}
    </>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  head: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  kicker: { fontFamily: type.mono, fontSize: 11, color: c.textFaint, letterSpacing: 1.5, textTransform: 'uppercase' },
  h1: { fontFamily: type.display, fontSize: 40, color: c.text, letterSpacing: -1.2, marginTop: 2, marginBottom: spacing.lg },

  segRow: { flexDirection: 'row', gap: spacing.sm },
  seg: { paddingVertical: 9, paddingHorizontal: 18, borderRadius: radius.pill, backgroundColor: c.surface2 },
  segActive: { backgroundColor: c.accent },
  segText: { fontFamily: type.heading, fontSize: 13, color: c.textMuted, textTransform: 'capitalize' },
  segTextActive: { color: c.onAccent },

  scroll: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: tabInset },
  intro: { fontFamily: type.body, fontSize: 15, color: c.textMuted, lineHeight: 24, marginBottom: spacing.lg },

  body: { fontFamily: type.body, fontSize: 14.5, color: c.textMuted, lineHeight: 23 },

  // ---- journey ----
  overallTop: { flexDirection: 'row', alignItems: 'flex-end' },
  overallLabel: { fontFamily: type.mono, fontSize: 11, color: c.textFaint, letterSpacing: 1.5, textTransform: 'uppercase' },
  overallStage: { fontFamily: type.display, fontSize: 26, color: c.text, letterSpacing: -0.6, marginTop: 4 },
  overallPct: { fontFamily: type.display, fontSize: 30, color: c.accent, letterSpacing: -1 },

  stageRow: { flexDirection: 'row', gap: spacing.lg },
  rail: { alignItems: 'center', width: 34 },
  railDot: {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 2, borderColor: c.border, backgroundColor: c.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  railNum: { fontFamily: type.heading, fontSize: 14, color: c.textFaint, includeFontPadding: false },
  railLine: { flex: 1, width: 2, backgroundColor: c.border, marginVertical: 4 },

  stageCardCurrent: { borderWidth: 2, borderColor: c.accentDim },
  stageHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  stageTitle: { fontFamily: type.display, fontSize: 18, color: c.text, letterSpacing: -0.3 },
  stageWeeks: { fontFamily: type.mono, fontSize: 11, color: c.textFaint, marginTop: 3 },
  nowChip: { backgroundColor: c.accent, borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 12 },
  nowChipText: { fontFamily: type.mono, fontSize: 10, color: c.onAccent, textTransform: 'uppercase', letterSpacing: 0.5 },

  stageBarRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
  stagePct: { fontFamily: type.mono, fontSize: 11, color: c.textMuted, width: 38, textAlign: 'right' },
  stageCount: { fontFamily: type.mono, fontSize: 10.5, color: c.textFaint, marginTop: spacing.sm },

  stageTopic: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 11 },
  stageTopicName: { flex: 1, fontFamily: type.body, fontSize: 14, color: c.text },
  stageTopicCount: { fontFamily: type.mono, fontSize: 11, color: c.textFaint },

  check: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.lg, backgroundColor: c.mintSoft, padding: spacing.md, borderRadius: radius.md },
  checkText: { flex: 1, fontFamily: type.body, fontSize: 13, color: c.mint, lineHeight: 20 },

  topicRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.lg, paddingVertical: spacing.lg },
  topicNum: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' },
  topicNumDone: { backgroundColor: c.easy },
  topicNumText: { fontFamily: type.display, fontSize: 17, color: c.textMuted, includeFontPadding: false },
  topicNumTextDone: { color: c.onAccent, fontSize: 20 },
  topicTitle: { fontFamily: type.heading, fontSize: 17, color: c.text },
  topicMeta: { fontFamily: type.mono, fontSize: 11, color: c.textFaint, marginTop: 4 },
  chevron: { color: c.textFaint, fontSize: 26 },

  primerTagline: { fontFamily: type.display, fontSize: 20, color: c.text, marginBottom: spacing.sm, letterSpacing: -0.3 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sectionNum: { fontFamily: type.mono, fontSize: 12, color: c.accent },
  sectionTitle: { flex: 1, fontFamily: type.heading, fontSize: 15.5, color: c.text },
  expand: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' },
  expandGlyph: { fontFamily: type.heading, fontSize: 17, color: c.textMuted, includeFontPadding: false },
});
