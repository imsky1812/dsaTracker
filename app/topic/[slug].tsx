import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Palette, spacing, radius, type, tierColor, difficultyColor } from '../../src/theme/tokens';
import { useColors, useThemedStyles } from '../../src/theme/theme';
import { Card, Pill, Markdown, CodeBlock, Bar, PrimaryButton } from '../../src/components/ui';
import { Feather } from '@expo/vector-icons';
import { plan, problemId, problemVideoUrl } from '../../src/lib/content';
import { useProgress } from '../../src/store/progress';

type Tab = 'learn' | 'patterns' | 'complexity' | 'code' | 'problems';

export default function TopicDetail() {
  const c = useColors();
  const s = useThemedStyles(makeStyles);
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const topic = plan.topics.find((t) => t.slug === slug);
  const [tab, setTab] = useState<Tab>('learn');
  const { topicDone, toggleTopic, problemStatus, cycleProblemStatus } = useProgress();

  // Returning null here used to render a blank white screen with no clue what
  // went wrong. A missing topic is a routing bug, so say so rather than
  // failing silently.
  if (!topic) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.missing}>
          <Text style={s.missingTitle}>Topic not found</Text>
          <Text style={s.missingBody}>
            {slug ? `No topic matches “${slug}”.` : 'No topic was specified in the link.'}
          </Text>
          <PrimaryButton
            label="Back to Learn"
            onPress={() => router.replace('/(tabs)/learn')}
            style={{ marginTop: spacing.lg, paddingHorizontal: spacing.xxl }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const done = topicDone[topic.slug];
  const tabs: Tab[] = ['learn', 'patterns', 'complexity', 'code', 'problems'];

  const solvedHere = topic.problems.filter(
    (p) => problemStatus[problemId(topic.slug, p.name)] === 'solved'
  ).length;

  const statusColor = (st?: string) => (st === 'solved' ? c.easy : st === 'revisit' ? c.medium : c.textFaint);
  const statusGlyph = (st?: string) => (st === 'solved' ? '✓' : st === 'revisit' ? '↺' : '');

  const openLink = async (url: string, name: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Couldn’t open the link', `${name}\n\n${url}`);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.head}>
        <View style={s.navRow}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/learn'))}
            hitSlop={12}
            style={s.backBtn}
          >
            <Feather name="chevron-left" size={22} color={c.text} />
          </Pressable>
          <Pressable
            onPress={() => toggleTopic(topic.slug)}
            style={[s.doneBtn, done && s.doneBtnActive]}
          >
            <Text style={[s.doneText, done && { color: c.onAccent }]}>
              {done ? '✓ Completed' : 'Mark complete'}
            </Text>
          </Pressable>
        </View>

        <Text style={s.h1}>{topic.title}</Text>
        <View style={s.progressRow}>
          <Bar pct={topic.problems.length ? (solvedHere / topic.problems.length) * 100 : 0} height={6} />
          <Text style={s.progressText}>{solvedHere}/{topic.problems.length}</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabRow} contentContainerStyle={{ gap: 7 }}>
          {tabs.map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[s.tab, tab === t && s.tabActive]}>
              <Text style={[s.tabText, tab === t && s.tabTextActive]}>{t}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {tab === 'learn' && <Card><Markdown text={topic.explainer_md} /></Card>}
        {tab === 'patterns' && <Card><Markdown text={topic.patterns_md} /></Card>}
        {tab === 'complexity' && <Card><Markdown text={topic.complexity_md} /></Card>}

        {tab === 'code' && (
          <Card>
            {topic.code.map((block, i) => (
              <CodeBlock key={i} label={block.label} code={block.code} />
            ))}
          </Card>
        )}

        {tab === 'problems' && (
          <>
            {(['warmup', 'core', 'interview', 'hard'] as const).map((tier) => {
              const ps = topic.problems.filter((p) => p.tier === tier);
              if (!ps.length) return null;
              return (
                <View key={tier} style={{ marginBottom: spacing.xl }}>
                  <View style={s.tierHead}>
                    <View style={[s.tierDot, { backgroundColor: tierColor(c, tier) }]} />
                    <Text style={[s.tierLabel, { color: tierColor(c, tier) }]}>{tier}</Text>
                    <Text style={s.tierCount}>{ps.length}</Text>
                  </View>

                  {ps.map((p) => {
                    const id = problemId(topic.slug, p.name);
                    const st = problemStatus[id];
                    const tint = statusColor(st);
                    return (
                      <Card key={p.name} style={s.problemRow}>
                        <Pressable
                          onPress={() => cycleProblemStatus(id)}
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

                        <Pressable style={{ flex: 1 }} onPress={() => void openLink(p.url, p.name)}>
                          <Text style={s.problemName}>{p.name}</Text>
                          {p.companies.length > 0 && (
                            <Text style={s.problemCompanies}>{p.companies.slice(0, 3).join(' · ')}</Text>
                          )}
                        </Pressable>

                        <View style={s.problemMeta}>
                          <Pill label={p.difficulty} filled color={difficultyColor(c, p.difficulty)} small />
                          {/* Stuck? Go straight to an explanation. */}
                          <Pressable
                            onPress={() => void openLink(problemVideoUrl(p, topic.slug), p.name)}
                            hitSlop={8}
                            style={s.watchBtn}
                          >
                            <Feather name="play" size={11} color={c.accent} />
                            <Text style={s.watchText}>Watch</Text>
                          </Pressable>
                        </View>
                      </Card>
                    );
                  })}
                </View>
              );
            })}
            <Text style={s.tapHint}>
              Tap the circle to cycle: unsolved → solved → revisit. Tap the name to open the problem,
              or Watch for an explanation.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  head: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },

  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' },
  backGlyph: { fontSize: 26, color: c.text, includeFontPadding: false, marginTop: -3 },
  doneBtn: { paddingVertical: 11, paddingHorizontal: 20, borderRadius: radius.pill, backgroundColor: c.surface2 },
  doneBtnActive: { backgroundColor: c.easy },
  doneText: { fontFamily: type.heading, fontSize: 13, color: c.textMuted },

  h1: { fontFamily: type.display, fontSize: 34, color: c.text, letterSpacing: -1 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  progressText: { fontFamily: type.mono, fontSize: 11.5, color: c.textFaint, width: 48, textAlign: 'right' },

  tabRow: { marginTop: spacing.lg },
  tab: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: c.surface2 },
  tabActive: { backgroundColor: c.accent },
  tabText: { fontFamily: type.heading, fontSize: 12.5, color: c.textMuted, textTransform: 'capitalize' },
  tabTextActive: { color: c.onAccent },

  scroll: { padding: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl * 2 },

  tierHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md, paddingHorizontal: 4 },
  tierDot: { width: 8, height: 8, borderRadius: 4 },
  tierLabel: { fontFamily: type.mono, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase' },
  tierCount: { fontFamily: type.mono, fontSize: 11, color: c.textFaint },

  problemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.lg, paddingVertical: spacing.lg, paddingHorizontal: spacing.lg },
  statusCircle: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  statusGlyph: { fontSize: 15, fontFamily: type.heading, includeFontPadding: false },
  problemName: { fontFamily: type.heading, fontSize: 15.5, color: c.text, lineHeight: 21 },
  problemCompanies: { fontFamily: type.mono, fontSize: 10, color: c.textFaint, marginTop: 4 },
  problemMeta: { alignItems: 'flex-end', gap: 8 },
  watchBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: c.accentSoft, borderRadius: radius.pill,
    paddingVertical: 5, paddingHorizontal: 10,
  },
  watchText: { fontFamily: type.mono, fontSize: 10, color: c.accent, textTransform: 'uppercase' },

  tapHint: { fontFamily: type.body, fontSize: 12.5, color: c.textFaint, lineHeight: 20, textAlign: 'center' },

  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  missingTitle: { fontFamily: type.display, fontSize: 26, color: c.text, letterSpacing: -0.5 },
  missingBody: { fontFamily: type.body, fontSize: 14.5, color: c.textMuted, textAlign: 'center', lineHeight: 22 },
});
