// Pure reconciliation logic for M4, deliberately free of React Native and
// Supabase imports so it can be reasoned about — and tested — in isolation.
// This is the highest-risk code in the sync path: a mistake here silently
// destroys someone's progress rather than throwing.

import type { ProblemStatus } from './content';
import type { RemoteProgress } from './sync';

export interface MergeableLocal {
  problemStatus: Record<string, ProblemStatus>;
  problemNotes: Record<string, string>;
  problemUpdatedAt: Record<string, string>;
  topicDone: Record<string, boolean>;
  topicUpdatedAt: Record<string, string>;
  activity: Record<string, number>;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  language: string;
  reminderTime: string | null;
  githubHandle: string;
}

export type MergeResult = Omit<MergeableLocal, never>;

const ms = (t: string | null | undefined) => new Date(t ?? 0).getTime();

/** Local wins ties: it is still queued and would overwrite the server anyway. */
const localWins = (local: string | undefined, remote: string | undefined) => ms(local) >= ms(remote);

export function mergeProgress(local: MergeableLocal, remote: RemoteProgress): MergeResult {
  const problemStatus = { ...local.problemStatus };
  const problemNotes = { ...local.problemNotes };
  const problemUpdatedAt = { ...local.problemUpdatedAt };

  for (const key of Object.keys(remote.problemStatus)) {
    if (localWins(local.problemUpdatedAt[key], remote.problemUpdatedAt[key])) continue;
    problemStatus[key] = remote.problemStatus[key];
    problemUpdatedAt[key] = remote.problemUpdatedAt[key];
    if (remote.problemNotes[key] !== undefined) problemNotes[key] = remote.problemNotes[key];
  }

  const topicDone = { ...local.topicDone };
  const topicUpdatedAt = { ...local.topicUpdatedAt };
  for (const slug of Object.keys(remote.topicDone)) {
    if (localWins(local.topicUpdatedAt[slug], remote.topicUpdatedAt[slug])) continue;
    topicDone[slug] = remote.topicDone[slug];
    topicUpdatedAt[slug] = remote.topicUpdatedAt[slug];
  }

  // max, not sum: re-syncing must not inflate the heatmap. Under-counting a
  // genuine two-device day is the less damaging error.
  const activity = { ...local.activity };
  for (const [date, count] of Object.entries(remote.activity)) {
    activity[date] = Math.max(activity[date] ?? 0, count);
  }

  // Whichever device was active more recently owns the running streak; the
  // record is simply the higher of the two.
  const remoteMoreRecent = ms(remote.lastActiveDate) > ms(local.lastActiveDate);

  return {
    problemStatus,
    problemNotes,
    problemUpdatedAt,
    topicDone,
    topicUpdatedAt,
    activity,
    longestStreak: Math.max(local.longestStreak, remote.longestStreak),
    currentStreak: remoteMoreRecent ? remote.currentStreak : local.currentStreak,
    lastActiveDate: remoteMoreRecent ? remote.lastActiveDate : local.lastActiveDate,
    language: remote.language ?? local.language,
    reminderTime: remote.reminderTime !== undefined ? remote.reminderTime : local.reminderTime,
    githubHandle: remote.githubHandle ?? local.githubHandle,
  };
}
