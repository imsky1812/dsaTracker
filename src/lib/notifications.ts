// M6 — the daily practice reminder.
//
// Local notifications only: no push server, no tokens, nothing to configure.
// The OS holds a repeating daily trigger, so the reminder fires whether or not
// the app has been opened and whether or not there is a network — consistent
// with the app working fully offline.
//
// Everything here fails soft. A denied permission or an unavailable scheduler
// must never break the Profile screen or block a save; the reminder is a
// convenience, not a feature the app depends on.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { effectiveStreak } from './dates';

const CHANNEL_ID = 'daily-practice';

// Show the banner even when the app happens to be open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** "HH:MM" (24h) -> {hour, minute}, or null if malformed. */
export function parseReminderTime(value: string | null): { hour: number; minute: number } | null {
  if (!value) return null;
  const m = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Daily practice',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

/** Ask for permission. Returns whether we ended up with it. */
export async function requestPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    // Don't re-prompt when the user has explicitly refused — the OS won't show
    // the dialog again anyway, and asking looks broken.
    if (!current.canAskAgain) return false;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

/**
 * Replace any existing reminder with one at `time` ("HH:MM"), or clear it when
 * `time` is null. Returns what actually happened so the UI can be honest.
 */
export async function scheduleDailyReminder(
  time: string | null,
  opts: { streak?: number; lastActiveDate?: string | null } = {}
): Promise<'scheduled' | 'cleared' | 'invalid' | 'denied' | 'unavailable'> {
  try {
    // Always clear first: rescheduling without this stacks duplicate reminders.
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (!time) return 'cleared';

    const parsed = parseReminderTime(time);
    if (!parsed) return 'invalid';

    if (!(await requestPermission())) return 'denied';
    await ensureAndroidChannel();

    const streak = effectiveStreak(opts.streak ?? 0, opts.lastActiveDate ?? null);
    const body =
      streak > 0
        ? `${streak}-day streak on the line. One problem keeps it alive.`
        : 'One problem today. That is how the streak starts.';

    await Notifications.scheduleNotificationAsync({
      content: { title: 'DSA Mastery', body, ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}) },
      // SDK 51's DailyTriggerInput shape. (SDK 52+ replaces this with
      // `type: SchedulableTriggerInputTypes.DAILY` — worth updating on upgrade.)
      trigger: {
        hour: parsed.hour,
        minute: parsed.minute,
        repeats: true,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
    });

    return 'scheduled';
  } catch {
    // Expo Go on Android dropped remote-push support in SDK 53, and some
    // environments have no scheduler at all. Not worth surfacing as an error.
    return 'unavailable';
  }
}

/** Count of reminders the OS currently holds — used to confirm state in the UI. */
export async function scheduledCount(): Promise<number> {
  try {
    return (await Notifications.getAllScheduledNotificationsAsync()).length;
  } catch {
    return 0;
  }
}
