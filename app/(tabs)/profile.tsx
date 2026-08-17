import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Palette, spacing, radius, type, tabInset } from '../../src/theme/tokens';
import { useColors, useThemedStyles } from '../../src/theme/theme';
import { Card, Eyebrow, Pill, GhostButton } from '../../src/components/ui';
import { plan, LANGUAGES } from '../../src/lib/content';
import { useProgress } from '../../src/store/progress';
import { supabaseEnabled } from '../../src/lib/supabase';
import { checkRemoteContent, ContentCheck } from '../../src/lib/remoteContent';
import { useSession } from '../../src/store/session';
import { signOut } from '../../src/lib/auth';
import { syncNow } from '../../src/lib/syncManager';
import { scheduleDailyReminder, parseReminderTime } from '../../src/lib/notifications';

export default function Profile() {
  const c = useColors();
  const s = useThemedStyles(makeStyles);

  const { language, setLanguage, reminderTime, setReminderTime, githubHandle, setGithubHandle, resetProgress } = useProgress();
  const [handle, setHandle] = useState(githubHandle);
  const [time, setTime] = useState(reminderTime ?? '');

  const session = useSession((st) => st.session);
  const localMode = useSession((st) => st.localMode);
  const exitLocalMode = useSession((st) => st.exitLocalMode);

  const pendingCount = useProgress((st) => st.pending.length);
  const syncState = useProgress((st) => st.syncState);
  const lastSyncedAt = useProgress((st) => st.lastSyncedAt);
  const currentStreak = useProgress((st) => st.currentStreak);
  const lastActiveDate = useProgress((st) => st.lastActiveDate);

  const [reminderNote, setReminderNote] = useState<string | null>(null);

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

  useEffect(() => { void runCheck(); }, [runCheck]);

  // A language is selectable when its primer is actually bundled.
  const available = (code: string) => Boolean(plan.primers[code]);

  // Takes the value explicitly rather than reading `time` state: setTime() is
  // async, so "turn off" would otherwise re-read the value it just cleared.
  const commitReminder = async (raw: string) => {
    const value = raw.trim() || null;
    if (value && !parseReminderTime(value)) {
      setReminderNote('Use 24-hour HH:MM, e.g. 20:00.');
      return;
    }
    setReminderTime(value);
    const result = await scheduleDailyReminder(value, { streak: currentStreak, lastActiveDate });
    setReminderNote(
      result === 'scheduled' ? `Reminder set for ${value} daily.`
        : result === 'cleared' ? 'Daily reminder turned off.'
        : result === 'denied' ? 'Notifications are blocked. Enable them for DSA Mastery in system settings.'
        : result === 'invalid' ? 'Use 24-hour HH:MM, e.g. 20:00.'
        : 'Reminders aren’t available here — they work in a real build.'
    );
  };

  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'Your progress stays synced to your account. This device keeps its local copy.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const confirmReset = () => {
    Alert.alert(
      'Reset all progress?',
      'This clears every solved mark, note, and streak. Content stays. This cannot be undone.',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset', style: 'destructive', onPress: resetProgress }]
    );
  };

  const initial = (session?.user.email ?? '?').charAt(0).toUpperCase();

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.kicker}>You</Text>
        <Text style={s.h1}>Profile</Text>

        {/* Account */}
        <Card style={{ marginBottom: spacing.lg }}>
          {!supabaseEnabled && (
            <>
              <Eyebrow>Account</Eyebrow>
              <Text style={s.body}>Running locally. Your progress is saved on this device.</Text>
              <View style={{ marginTop: spacing.md }}><Pill label="Offline mode" small /></View>
            </>
          )}

          {supabaseEnabled && session && (
            <>
              <View style={s.accountHead}>
                <View style={s.avatar}><Text style={s.avatarText}>{initial}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.email} numberOfLines={1}>{session.user.email}</Text>
                  <View style={s.syncRow}>
                    <Pill
                      label={syncState === 'syncing' ? 'syncing…' : pendingCount > 0 ? `${pendingCount} to sync` : 'synced'}
                      small
                      color={pendingCount > 0 ? c.medium : c.easy}
                      filled
                    />
                  </View>
                </View>
              </View>

              {pendingCount > 0 && (
                <Text style={s.hint}>Saved on this device. They’ll upload automatically when you’re back online.</Text>
              )}
              {pendingCount === 0 && lastSyncedAt && (
                <Text style={s.hint}>Last synced {new Date(lastSyncedAt).toLocaleString()}.</Text>
              )}

              <View style={s.btnRow}>
                <GhostButton label="Sync now" onPress={() => void syncNow()} style={{ flex: 1 }} />
                <GhostButton label="Sign out" onPress={confirmSignOut} style={{ flex: 1 }} />
              </View>
            </>
          )}

          {supabaseEnabled && !session && localMode && (
            <>
              <Eyebrow>Account</Eyebrow>
              <Text style={s.body}>Using the app without an account. Progress is saved on this device only.</Text>
              <View style={{ marginTop: spacing.md }}><Pill label="Local only" small /></View>
              <GhostButton label="Sign in to sync" tone="accent" onPress={exitLocalMode} style={{ marginTop: spacing.lg }} />
              <Text style={s.hint}>Signing in keeps what you have already done — it moves up to your account.</Text>
            </>
          )}
        </Card>

        {/* Language */}
        <Card style={{ marginBottom: spacing.lg }}>
          <Eyebrow>Language</Eyebrow>
          <Text style={s.hint}>DSA code and the primer follow this choice.</Text>
          <View style={s.langGrid}>
            {LANGUAGES.map((l) => {
              const active = language === l.code;
              const ok = available(l.code);
              return (
                <Pressable
                  key={l.code}
                  disabled={!ok}
                  onPress={() => setLanguage(l.code)}
                  style={[s.lang, active && s.langActive, !ok && { opacity: 0.4 }]}
                >
                  <Text style={[s.langText, active && { color: c.onAccent }]}>{l.name}</Text>
                  {!ok && <Text style={s.soon}>soon</Text>}
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* Reminder */}
        <Card style={{ marginBottom: spacing.lg }}>
          <Eyebrow>Daily reminder</Eyebrow>
          <Text style={s.hint}>A local nudge to keep your streak. Format HH:MM (24h).</Text>
          <TextInput
            style={s.input}
            value={time}
            onChangeText={(t) => { setTime(t); setReminderNote(null); }}
            onEndEditing={() => void commitReminder(time)}
            placeholder="e.g. 20:00"
            placeholderTextColor={c.textFaint}
            selectionColor={c.accent}
            keyboardType="numbers-and-punctuation"
          />
          {reminderNote && <Text style={s.hint}>{reminderNote}</Text>}
          {reminderTime && (
            <GhostButton
              label="Turn off reminder"
              onPress={() => { setTime(''); void commitReminder(''); }}
              style={{ marginTop: spacing.md }}
            />
          )}
        </Card>

        {/* GitHub */}
        <Card style={{ marginBottom: spacing.lg }}>
          <Eyebrow>GitHub handle</Eyebrow>
          <Text style={s.hint}>For your commit habit — push solutions daily.</Text>
          <TextInput
            style={s.input}
            value={handle}
            onChangeText={setHandle}
            onEndEditing={() => setGithubHandle(handle)}
            placeholder="username"
            placeholderTextColor={c.textFaint}
            selectionColor={c.accent}
            autoCapitalize="none"
          />
        </Card>

        {/* Content */}
        <Card style={{ marginBottom: spacing.lg }}>
          <Eyebrow>Content</Eyebrow>
          <Text style={s.body}>
            {plan.meta.topicCount} topics · {plan.meta.problemCount} problems · {plan.roadmap.phases.length} phases
          </Text>
          <Text style={s.hint}>Bundled with the app — always available offline.</Text>
        </Card>

        {/* Backend diagnostic */}
        {supabaseEnabled && (
          <Card style={{ marginBottom: spacing.lg }}>
            <View style={s.rowBetween}>
              <Eyebrow>Backend</Eyebrow>
              <Pressable onPress={runCheck} hitSlop={10} disabled={checking}>
                <Text style={s.link}>{checking ? 'checking…' : 'recheck'}</Text>
              </Pressable>
            </View>

            {checking && !check && <ActivityIndicator color={c.accent} style={{ marginTop: spacing.md }} />}

            {check?.status === 'ok' && (
              <>
                <View style={{ marginTop: spacing.sm }}>
                  <Pill label="Connected" small color={c.easy} filled />
                </View>
                <Text style={s.body}>All {check.rows.length} content tables match the bundle.</Text>
              </>
            )}

            {check?.status === 'mismatch' && (
              <>
                <Text style={[s.body, { color: c.accent }]}>Content mismatch.</Text>
                {check.rows.filter((r) => !r.ok).map((r) => (
                  <Text key={r.table} style={s.mono}>{r.table}: {r.remote} / {r.expected} expected</Text>
                ))}
              </>
            )}

            {check?.status === 'error' && (
              <>
                <Text style={[s.body, { color: c.accent }]}>Can’t reach the backend.</Text>
                <Text style={s.hint}>The app keeps working offline — your progress is safe on this device.</Text>
              </>
            )}
          </Card>
        )}

        <GhostButton label="Reset all progress" tone="accent" onPress={confirmReset} />

        <Text style={s.version}>
          DSA Mastery · v1.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  scroll: { padding: spacing.lg, paddingBottom: tabInset },
  kicker: { fontFamily: type.mono, fontSize: 11, color: c.textFaint, letterSpacing: 1.5, textTransform: 'uppercase' },
  h1: { fontFamily: type.display, fontSize: 40, color: c.text, letterSpacing: -1.2, marginTop: 2, marginBottom: spacing.lg },

  accountHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: type.display, fontSize: 22, color: c.onAccent, includeFontPadding: false },
  email: { fontFamily: type.heading, fontSize: 15.5, color: c.text },
  syncRow: { flexDirection: 'row', gap: spacing.sm, marginTop: 6, flexWrap: 'wrap' },

  body: { fontFamily: type.body, fontSize: 14.5, color: c.textMuted, lineHeight: 23, marginTop: 4 },
  hint: { fontFamily: type.body, fontSize: 13, color: c.textFaint, marginTop: spacing.sm, lineHeight: 20 },
  mono: { fontFamily: type.mono, fontSize: 11, color: c.textMuted, marginTop: 4 },

  btnRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { fontFamily: type.mono, fontSize: 11, color: c.accent, textTransform: 'uppercase', letterSpacing: 0.5 },

  langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  lang: { paddingVertical: 12, paddingHorizontal: 22, borderRadius: radius.pill, backgroundColor: c.surface2, alignItems: 'center' },
  langActive: { backgroundColor: c.accent },
  langText: { fontFamily: type.heading, fontSize: 14, color: c.text },
  soon: { fontFamily: type.mono, fontSize: 8, color: c.textFaint, textTransform: 'uppercase', marginTop: 2 },

  input: {
    color: c.text, fontFamily: type.mono, fontSize: 15,
    marginTop: spacing.lg, backgroundColor: c.surface2,
    borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: 15,
  },

  version: { fontFamily: type.mono, fontSize: 10.5, color: c.textFaint, textAlign: 'center', marginTop: spacing.xl },
});
