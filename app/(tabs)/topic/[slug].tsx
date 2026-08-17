import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { colors, spacing, radius, type, tierColor, difficultyColor } from '../../../src/theme/tokens';
import { Card, Eyebrow, Pill, Markdown, CodeBlock } from '../../../src/components/ui';
import { plan, problemId } from '../../../src/lib/content';
import { useProgress } from '../../../src/store/progress';

type Tab = 'learn' | 'patterns' | 'complexity' | 'code' | 'problems';

export default function TopicDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const topic = plan.topics.find((t) => t.slug === slug);
  const [tab, setTab] = useState<Tab>('learn');
  const { topicDone, toggleTopic, problemStatus, cycleProblemStatus } = useProgress();

  if (!topic) return null;
  const done = topicDone[topic.slug];

  const tabs: Tab[] = ['learn', 'patterns', 'complexity', 'code', 'problems'];
  const statusColor = (s?: string) => s === 'solved' ? colors.easy : s === 'revisit' ? colors.medium : colors.textFaint;
  const statusGlyph = (s?: string) => s === 'solved' ? '✓' : s === 'revisit' ? '↺' : '○';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Text style={styles.back}>‹ Learn</Text></Pressable>
        <Text style={styles.h1}>{topic.title}</Text>
        <Pressable onPress={() => toggleTopic(topic.slug)} style={[styles.doneBtn, done && styles.doneBtnActive]}>
          <Text style={[styles.doneBtnText, done && { color: colors.easy }]}>{done ? '✓ Completed' : 'Mark complete'}</Text>
        </Pressable>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow} contentContainerStyle={{ gap: 8 }}>
          {tabs.map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {tab === 'learn' && <Card><Markdown text={topic.explainer_md} /></Card>}
        {tab === 'patterns' && <Card><Markdown text={topic.patterns_md} /></Card>}
        {tab === 'complexity' && <Card><Markdown text={topic.complexity_md} /></Card>}
        {tab === 'code' && (
          <Card>
            {topic.code.map((c, i) => <CodeBlock key={i} label={c.label} code={c.code} />)}
          </Card>
        )}
        {tab === 'problems' && (
          <>
            {(['warmup', 'core', 'interview', 'hard'] as const).map((tier) => {
              const ps = topic.problems.filter((p) => p.tier === tier);
              if (!ps.length) return null;
              return (
                <View key={tier} style={{ marginBottom: spacing.lg }}>
                  <Text style={[styles.tierLabel, { color: tierColor(tier) }]}>{tier} · {ps.length}</Text>
                  {ps.map((p) => {
                    const id = problemId(topic.slug, p.name);
                    const st = problemStatus[id];
                    return (
                      <Card key={p.name} style={styles.problemRow}>
                        <Pressable onPress={() => cycleProblemStatus(id)} hitSlop={10} style={styles.statusBtn}>
                          <Text style={[styles.statusGlyph, { color: statusColor(st) }]}>{statusGlyph(st)}</Text>
                        </Pressable>
                        <Pressable style={{ flex: 1 }} onPress={() => Linking.openURL(p.url)}>
                          <Text style={styles.problemName}>{p.name}</Text>
                          <Text style={styles.problemCompanies}>{p.companies.slice(0, 4).join(' · ')}</Text>
                        </Pressable>
                        <View style={styles.problemMeta}>
                          <Pill label={p.difficulty} filled color={difficultyColor(p.difficulty)} small />
                          <Text style={styles.platform}>{p.platform}</Text>
                        </View>
                      </Card>
                    );
                  })}
                </View>
              );
            })}
            <Text style={styles.tapHint}>Tap the circle to cycle: unsolved → solved → revisit. Tap the name to open the problem.</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  back: { fontFamily: type.mono, fontSize: 13, color: colors.accent, marginBottom: spacing.sm },
  h1: { fontFamily: type.display, fontSize: 30, color: colors.text, letterSpacing: -0.5 },
  doneBtn: { alignSelf: 'flex-start', marginTop: spacing.sm, paddingVertical: 6, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  doneBtnActive: { backgroundColor: colors.surface, borderColor: colors.easy },
  doneBtnText: { fontFamily: type.mono, fontSize: 12, color: colors.textMuted },
  tabRow: { marginTop: spacing.md },
  tab: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.accentSoft, borderColor: colors.accentDim },
  tabText: { fontFamily: type.mono, fontSize: 12, color: colors.textMuted, textTransform: 'capitalize' },
  tabTextActive: { color: colors.accent },
  scroll: { padding: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  tierLabel: { fontFamily: type.mono, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', marginBottom: spacing.sm },
  problemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.md, paddingVertical: spacing.md },
  statusBtn: { width: 28, alignItems: 'center' },
  statusGlyph: { fontSize: 20 },
  problemName: { fontFamily: type.heading, fontSize: 15, color: colors.text },
  problemCompanies: { fontFamily: type.mono, fontSize: 10, color: colors.textFaint, marginTop: 3 },
  problemMeta: { alignItems: 'flex-end', gap: 4 },
  platform: { fontFamily: type.mono, fontSize: 10, color: colors.textFaint },
  tapHint: { fontFamily: type.body, fontSize: 12, color: colors.textFaint, fontStyle: 'italic', lineHeight: 18 },
});
