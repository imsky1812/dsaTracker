import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, type } from '../../src/theme/tokens';
import { Card, Eyebrow, Pill } from '../../src/components/ui';
import { plan } from '../../src/lib/content';
import { useProgress } from '../../src/store/progress';
import { supabaseEnabled } from '../../src/lib/supabase';
import { checkRemoteContent, ContentCheck } from '../../src/lib/remoteContent';
import { useSession } from '../../src/store/session';
import { signOut } from '../../src/lib/auth';
import { syncNow } from '../../src/lib/syncManager';
import { scheduleDailyReminder, parseReminderTime } from '../../src/lib/notifications';

// Languages the data model supports. Only those actually present in the bundle
// are selectable; the rest show as "coming soon" (content is authored per M0).
const LANGUAGES = [
  { code: 'cpp', name: 'C++' },
  { code: 'java', name: 'Java' },
  { code: 'py', name: 'Python' },
  { code: 'js', name: 'JavaScript' },
];

export default function Profile() {
  const { language, setLanguage, reminderTime, setReminderTime, githubHandle, setGithubHandle, resetProgress } = useProgress();
  const [handle, setHandle] = useState(githubHandle);
  const [time, setTime] = useState(reminderTime ?? '');

  // Backend check is diagnostic only — it never gates rendering, so the screen
  // is fully usable while it is pending or if it fails outright.
  const [check, setCheck] = useState<ContentCheck | null>(null);
  const [checking, setChecking] = useState(false);

  const runCheck = useCallback(async () => {
    if (!supabaseEnabled) return;
    setChecking(true);
    setCheck(await checkRemoteContent());
    setChecking(false);
  }, []);

  useEffect(() => {
    void runCheck();
  }, [runCheck]);

  const available = (code: string) => Boolean(plan.primers[code]) || code === 'cpp';

  const session = useSession((s) => s.session);
  const localMode = useSession((s) => s.localMode);
  const exitLocalMode = useSession((s) => s.exitLocalMode);

  const pendingCount = useProgress((s) => s.pending.length);
  const syncState = useProgress((s) => s.syncState);
  const lastSyncedAt = useProgress((s) => s.lastSyncedAt);
  const currentStreak = useProgress((s) => s.currentStreak);
  const lastActiveDate = useProgress((s) => s.lastActiveDate);

  const [reminderNote, setReminderNote] = useState<string | null>(null);

  // Committing the reminder does two things that must stay in step: persist the
  // preference (which syncs) and reprogram the OS trigger.
  // Takes the value explicitly rather than reading `time` state: setTime() is
  // async, so "turn off" would otherwise re-read the value it just cleared.
  const commitReminder = async (raw: string) => {
    const value = raw.trim() || null;
    if (value && !parseReminderTime(value)) {
      setReminderNote('Use 24-hour HH:MM, e.g. 20:00.');
      return;
    }
    setReminderTime(value);
    const result = await scheduleDailyReminder(value, {
      streak: currentStreak,
      lastActiveDate,
    });
    setReminderNote(
      result === 'scheduled' ? `Reminder set for ${value} daily.`
        : result === 'cleared' ? 'Daily reminder turned off.'
        : result === 'denied' ? 'Notifications are blocked. Enable them for DSA Mastery in system settings.'
        : result === 'invalid' ? 'Use 24-hour HH:MM, e.g. 20:00.'
        : 'Reminders aren’t available here — they work in a real build.'
    );
  };

  const confirmSignOut = () => {
    Alert.alert(
      'Sign out?',
      'Your progress stays synced to your account. This device keeps its local copy.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
      ]
    );
  };

  const confirmReset = () => {
    Alert.alert('Reset all progress?', 'This clears every solved mark, note, and streak. Content stays. This cannot be undone.',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset', style: 'destructive', onPress: resetProgress }]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Eyebrow>You</Eyebrow>
        <Text style={styles.h1}>Profile</Text>

        {/* Account */}
        <Card style={{ marginBottom: spacing.lg }}>
          <Eyebrow>Account</Eyebrow>

          {!supabaseEnabled && (
            <>
              <Text style={styles.body}>Running locally. Your progress is saved on this device.</Text>
              <View style={{ marginTop: spacing.sm }}>
                <Pill label="Offline mode" small />
              </View>
              <Text style={styles.hint}>Accounts + cross-device sync activate once the backend is connected.</Text>
            </>
          )}

          {supabaseEnabled && session && (
            <>
              <Text style={styles.email}>{session.user.email}</Text>
              <View style={styles.syncRow}>
                <Pill label="Signed in" small color={colors.easy} filled />
                <Pill
                  label={
                    syncState === 'syncing'
                      ? 'syncing…'
                      : pendingCount > 0
                        ? `${pendingCount} to sync`
                        : 'synced'
                  }
                  small
                  color={pendingCount > 0 ? colors.medium : colors.easy}
                  filled={pendingCount > 0}
                />
              </View>
              {pendingCount > 0 && (
                <Text style={styles.hint}>
                  Saved on this device. They’ll upload automatically when you’re back online.
                </Text>
              )}
              {pendingCount === 0 && lastSyncedAt && (
                <Text style={styles.hint}>Last synced {new Date(lastSyncedAt).toLocaleString()}.</Text>
              )}
              <Pressable onPress={() => void syncNow()} style={styles.outlineBtn}>
                <Text style={styles.outlineText}>Sync now</Text>
              </Pressable>
              <Pressable onPress={confirmSignOut} style={styles.outlineBtn}>
                <Text style={styles.outlineText}>Sign out</Text>
              </Pressable>
            </>
          )}

          {supabaseEnabled && !session && localMode && (
            <>
              <Text style={styles.body}>
                Using the app without an account. Progress is saved on this device only.
              </Text>
              <View style={{ marginTop: spacing.sm }}>
                <Pill label="Local only" small />
              </View>
              <Pressable onPress={exitLocalMode} style={styles.outlineBtn}>
                <Text style={styles.outlineText}>Sign in to sync</Text>
              </Pressable>
              <Text style={styles.hint}>
                Signing in keeps what you have already done — it moves up to your account.
              </Text>
            </>
          )}
        </Card>

        {/* Language */}
        <Card style={{ marginBottom: spacing.lg }}>
          <Eyebrow>Language</Eyebrow>
          <Text style={styles.hint}>DSA code and the primer follow this choice.</Text>
          <View style={styles.langGrid}>
            {LANGUAGES.map((l) => {
              const active = language === l.code;
              const ok = available(l.code);
              return (
                <Pressable key={l.code} disabled={!ok} onPress={() => setLanguage(l.code)}
                  style={[styles.lang, active && styles.langActive, !ok && styles.langDisabled]}>
                  <Text style={[styles.langText, active && { color: colors.accent }, !ok && { color: colors.textFaint }]}>{l.name}</Text>
                  {!ok && <Text style={styles.soon}>soon</Text>}
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* Reminder */}
        <Card style={{ marginBottom: spacing.lg }}>
          <Eyebrow>Daily reminder</Eyebrow>
          <Text style={styles.hint}>A local nudge to keep your streak. Format HH:MM (24h).</Text>
          <TextInput
            style={styles.input}
            value={time}
            onChangeText={(t) => { setTime(t); setReminderNote(null); }}
            onEndEditing={() => void commitReminder(time)}
            placeholder="e.g. 20:00"
            placeholderTextColor={colors.textFaint}
            keyboardType="numbers-and-punctuation"
          />
          {reminderNote && <Text style={styles.hint}>{reminderNote}</Text>}
          {reminderTime && (
            <Pressable
              onPress={() => { setTime(''); void commitReminder(''); }}
              style={styles.outlineBtn}
            >
              <Text style={styles.outlineText}>Turn off reminder</Text>
            </Pressable>
          )}
        </Card>

        {/* GitHub */}
        <Card style={{ marginBottom: spacing.lg }}>
          <Eyebrow>GitHub handle</Eyebrow>
          <Text style={styles.hint}>For your commit habit — push solutions daily.</Text>
          <TextInput
            style={styles.input}
            value={handle}
            onChangeText={setHandle}
            onEndEditing={() => setGithubHandle(handle)}
            placeholder="username"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
          />
        </Card>

        {/* Meta */}
        <Card style={{ marginBottom: spacing.lg }}>
          <Eyebrow>Content</Eyebrow>
          <Text style={styles.body}>
            {plan.meta.topicCount} topics · {plan.meta.problemCount} problems · {plan.roadmap.phases.length} roadmap phases
          </Text>
          <Text style={styles.hint}>Bundled with the app — always available offline.</Text>
        </Card>

        {/* Backend — M2 diagnostic. Content always renders from the bundle;
            this only reports whether Supabase holds the same content. */}
        {supabaseEnabled && (
          <Card style={{ marginBottom: spacing.lg }}>
            <View style={styles.rowBetween}>
              <Eyebrow>Backend</Eyebrow>
              <Pressable onPress={runCheck} hitSlop={10} disabled={checking}>
                <Text style={styles.link}>{checking ? 'checking…' : 'recheck'}</Text>
              </Pressable>
            </View>

            {checking && !check && <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.md }} />}

            {check?.status === 'ok' && (
              <>
                <View style={{ marginTop: spacing.sm }}>
                  <Pill label="Connected" small />
                </View>
                <Text style={styles.body}>
                  All {check.rows.length} content tables match the bundle.
                </Text>
                <Text style={styles.hint}>Sample read: “{check.sampleTopic}”.</Text>
              </>
            )}

            {check?.status === 'mismatch' && (
              <>
                <Text style={[styles.body, { color: colors.accent }]}>Content mismatch.</Text>
                {check.rows.filter((r) => !r.ok).map((r) => (
                  <Text key={r.table} style={styles.mono}>
                    {r.table}: {r.remote} / {r.expected} expected
                  </Text>
                ))}
                <Text style={styles.hint}>Re-run supabase/seed.sql in the SQL editor.</Text>
              </>
            )}

            {check?.status === 'error' && (
              <>
                <Text style={[styles.body, { color: colors.accent }]}>Can’t reach the backend.</Text>
                <Text style={styles.mono}>{check.error}</Text>
                <Text style={styles.hint}>The app keeps working offline — your progress is safe on this device.</Text>
              </>
            )}
          </Card>
        )}

        <Pressable onPress={confirmReset} style={styles.resetBtn}>
          <Text style={styles.resetText}>Reset all progress</Text>
        </Pressable>

        <Text style={styles.version}>DSA Mastery · v1.0 · built for the grind</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  h1: { fontFamily: type.display, fontSize: 34, color: colors.text, letterSpacing: -0.5, marginBottom: spacing.lg },
  body: { fontFamily: type.body, fontSize: 14, color: colors.textMuted, lineHeight: 21, marginTop: 4 },
  hint: { fontFamily: type.body, fontSize: 13, color: colors.textFaint, marginTop: 4, lineHeight: 19 },
  langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  lang: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: radius.md, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  langActive: { backgroundColor: colors.accentSoft, borderColor: colors.accentDim },
  langDisabled: { opacity: 0.5 },
  langText: { fontFamily: type.heading, fontSize: 14, color: colors.text },
  soon: { fontFamily: type.mono, fontSize: 8, color: colors.textFaint, textTransform: 'uppercase', marginTop: 2 },
  input: { color: colors.text, fontFamily: type.mono, fontSize: 15, marginTop: spacing.md, backgroundColor: colors.surface2, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  resetBtn: { borderWidth: 1, borderColor: colors.accentDim, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', marginBottom: spacing.lg },
  resetText: { fontFamily: type.heading, fontSize: 14, color: colors.accent },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { fontFamily: type.mono, fontSize: 11, color: colors.accent, textTransform: 'uppercase', letterSpacing: 0.5 },
  mono: { fontFamily: type.mono, fontSize: 11, color: colors.textMuted, marginTop: 4 },
  email: { fontFamily: type.heading, fontSize: 15, color: colors.text, marginTop: 2 },
  outlineBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.lg },
  outlineText: { fontFamily: type.heading, fontSize: 13, color: colors.text },
  syncRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
  version: { fontFamily: type.mono, fontSize: 11, color: colors.textFaint, textAlign: 'center' },
});
