import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Palette, spacing, radius, type, tabInset } from '../../src/theme/tokens';
import { useColors, useThemedStyles } from '../../src/theme/theme';
import { Card, Eyebrow, CodeBlock } from '../../src/components/ui';
import { plan } from '../../src/lib/content';
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
        {seg === 'roadmap' && (
          <>
            <Text style={s.intro}>{plan.roadmap.intro}</Text>
            {plan.roadmap.phases.map((ph) => (
              <Card key={ph.order} style={{ marginBottom: spacing.md }}>
                <View style={s.phaseHead}>
                  <View style={s.phaseNum}>
                    <Text style={s.phaseNumText}>{ph.order}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.phaseTitle}>{ph.title}</Text>
                    <Text style={s.phaseWeeks}>{ph.est_weeks}</Text>
                  </View>
                </View>
                <Text style={s.body}>{ph.summary}</Text>
                <View style={s.chips}>
                  {ph.learn.map((l, i) => (
                    <View key={i} style={s.chip}><Text style={s.chipText}>{l}</Text></View>
                  ))}
                </View>
                <View style={s.check}>
                  <Text style={s.checkGlyph}>✓</Text>
                  <Text style={s.checkText}>{ph.checkpoint}</Text>
                </View>
              </Card>
            ))}
          </>
        )}

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

  phaseHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  phaseNum: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center',
  },
  phaseNumText: { fontFamily: type.display, fontSize: 18, color: c.accent, includeFontPadding: false },
  phaseTitle: { fontFamily: type.display, fontSize: 19, color: c.text, letterSpacing: -0.3 },
  phaseWeeks: { fontFamily: type.mono, fontSize: 11.5, color: c.textFaint, marginTop: 3 },
  body: { fontFamily: type.body, fontSize: 14.5, color: c.textMuted, lineHeight: 23 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: spacing.lg },
  chip: { backgroundColor: c.surface2, borderRadius: radius.pill, paddingVertical: 7, paddingHorizontal: 13 },
  chipText: { fontFamily: type.mono, fontSize: 11, color: c.textMuted },

  check: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.lg },
  checkGlyph: { color: c.easy, fontSize: 14, fontFamily: type.heading },
  checkText: { flex: 1, fontFamily: type.body, fontSize: 13, color: c.easy, lineHeight: 20 },

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
