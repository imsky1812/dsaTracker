import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, spacing, radius, type } from '../../src/theme/tokens';
import { Card, Eyebrow, Pill } from '../../src/components/ui';
import { plan } from '../../src/lib/content';
import { useProgress } from '../../src/store/progress';

type Segment = 'roadmap' | 'topics' | 'language';

export default function Learn() {
  const [seg, setSeg] = useState<Segment>('roadmap');
  const { topicDone, language } = useProgress();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Eyebrow>Study</Eyebrow>
        <Text style={styles.h1}>Learn</Text>
        <View style={styles.segRow}>
          {(['roadmap', 'topics', 'language'] as Segment[]).map((s) => (
            <Pressable key={s} onPress={() => setSeg(s)} style={[styles.seg, seg === s && styles.segActive]}>
              <Text style={[styles.segText, seg === s && styles.segTextActive]}>{s}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {seg === 'roadmap' && (
          <>
            <Text style={styles.intro}>{plan.roadmap.intro}</Text>
            {plan.roadmap.phases.map((ph) => (
              <Card key={ph.order} style={styles.phase}>
                <View style={styles.phaseAccent} />
                <Text style={styles.phaseTitle}>{ph.title}</Text>
                <Text style={styles.phaseWeeks}>{ph.est_weeks}</Text>
                <Text style={styles.phaseSummary}>{ph.summary}</Text>
                <View style={styles.chips}>
                  {ph.learn.map((l, i) => (
                    <View key={i} style={styles.chip}><Text style={styles.chipText}>{l}</Text></View>
                  ))}
                </View>
                <Text style={styles.check}>✓ {ph.checkpoint}</Text>
              </Card>
            ))}
          </>
        )}

        {seg === 'topics' && (
          <>
            {plan.topics.map((t) => {
              const done = topicDone[t.slug];
              return (
                <Pressable key={t.slug} onPress={() => router.push(`/topic/${t.slug}`)}>
                  <Card style={styles.topicRow}>
                    <View style={styles.topicNum}><Text style={styles.topicNumText}>{String(t.order).padStart(2, '0')}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.topicTitle}>{t.title}</Text>
                      <Text style={styles.topicMeta}>{t.problems.length} problems · {t.code.length} code samples</Text>
                    </View>
                    {done ? <Text style={styles.doneCheck}>✓</Text> : <Text style={styles.chevron}>›</Text>}
                  </Card>
                </Pressable>
              );
            })}
          </>
        )}

        {seg === 'language' && (
          <LanguagePrimer />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LanguagePrimer() {
  const { language } = useProgress();
  const primer = plan.primers[language] ?? plan.primers['cpp'];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <>
      <Card style={{ marginBottom: spacing.lg }}>
        <Eyebrow color={colors.medium}>{primer.language_name} primer</Eyebrow>
        <Text style={styles.primerTagline}>{primer.tagline}</Text>
        <Text style={styles.phaseSummary}>{primer.intro}</Text>
      </Card>
      {primer.sections.map((s) => (
        <Pressable key={s.order} onPress={() => setOpen(open === s.order ? null : s.order)}>
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>{String(s.order).padStart(2, '0')}  {s.title}</Text>
              <Text style={styles.chevron}>{open === s.order ? '−' : '+'}</Text>
            </View>
            {open === s.order && (
              <View style={{ marginTop: spacing.md }}>
                <Text style={styles.phaseSummary}>{s.body_md}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.codeWrap}>
                  <Text style={styles.code}>{s.code}</Text>
                </ScrollView>
              </View>
            )}
          </Card>
        </Pressable>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  h1: { fontFamily: type.display, fontSize: 34, color: colors.text, letterSpacing: -0.5, marginBottom: spacing.md },
  segRow: { flexDirection: 'row', gap: spacing.sm },
  seg: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  segActive: { backgroundColor: colors.accentSoft, borderColor: colors.accentDim },
  segText: { fontFamily: type.mono, fontSize: 12, color: colors.textMuted, textTransform: 'capitalize' },
  segTextActive: { color: colors.accent },
  scroll: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  intro: { fontFamily: type.body, fontSize: 15, color: colors.textMuted, lineHeight: 23, marginBottom: spacing.lg },
  phase: { marginBottom: spacing.md, paddingLeft: spacing.lg + 4 },
  phaseAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: colors.accent, borderTopLeftRadius: radius.lg, borderBottomLeftRadius: radius.lg },
  phaseTitle: { fontFamily: type.display, fontSize: 20, color: colors.text },
  phaseWeeks: { fontFamily: type.mono, fontSize: 12, color: colors.accent, marginTop: 2, marginBottom: spacing.sm },
  phaseSummary: { fontFamily: type.body, fontSize: 14, color: colors.textMuted, lineHeight: 21 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.md },
  chip: { backgroundColor: colors.surface2, borderRadius: radius.sm, paddingVertical: 5, paddingHorizontal: 10 },
  chipText: { fontFamily: type.mono, fontSize: 11, color: colors.textMuted },
  check: { fontFamily: type.body, fontStyle: 'italic', fontSize: 13, color: colors.easy, marginTop: spacing.md },
  topicRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.md },
  topicNum: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  topicNumText: { fontFamily: type.display, fontSize: 18, color: colors.accent },
  topicTitle: { fontFamily: type.heading, fontSize: 17, color: colors.text },
  topicMeta: { fontFamily: type.mono, fontSize: 11, color: colors.textFaint, marginTop: 2 },
  doneCheck: { color: colors.easy, fontSize: 20 },
  chevron: { color: colors.textFaint, fontSize: 24 },
  primerTagline: { fontFamily: type.heading, fontSize: 18, color: colors.text, marginVertical: 4 },
  sectionCard: { marginBottom: spacing.sm },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontFamily: type.mono, fontSize: 14, color: colors.text },
  codeWrap: { backgroundColor: '#0A0A0C', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  code: { fontFamily: type.mono, fontSize: 12.5, color: '#D6E9C8', lineHeight: 20 },
});
