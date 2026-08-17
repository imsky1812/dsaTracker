// M4 — offline-first sync between the local progress store and Supabase.
//
// The contract (CLAUDE.md): the app must be fully usable with no signal, and
// the store's public API must not change. So the local store stays the thing
// screens read and write, synchronously, always. This module is strictly a
// background mirror:
//
//   local write  ->  store updates immediately (UI never waits on a network)
//                ->  change is queued
//                ->  queue flushes when online and signed in
//
// Nothing here can make a write fail from the user's point of view. A push that
// errors stays queued and is retried; it is never lost and never surfaced as a
// blocking error.
//
// Reconciliation is last-write-wins on `updated_at`. For a single-user study
// app that is the right trade: it is predictable, needs no vector clocks, and
// the realistic conflict — the same person marking a problem solved on a phone
// and a tablet — resolves the way they'd expect.

import { supabase, supabaseEnabled } from './supabase';
import type { ProblemStatus } from './content';

export type PendingOp =
  | { kind: 'problem'; key: string; status: ProblemStatus; note?: string; updatedAt: string }
  | { kind: 'topic'; slug: string; completed: boolean; updatedAt: string }
  | { kind: 'activity'; date: string; count: number }
  | { kind: 'streak'; current: number; longest: number; lastActiveDate: string | null }
  | { kind: 'profile'; language?: string; reminderTime?: string | null; githubHandle?: string };

export interface RemoteProgress {
  problemStatus: Record<string, ProblemStatus>;
  problemNotes: Record<string, string>;
  topicDone: Record<string, boolean>;
  activity: Record<string, number>;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  language?: string;
  reminderTime?: string | null;
  githubHandle?: string;
  /** problem key -> server updated_at, used for last-write-wins. */
  problemUpdatedAt: Record<string, string>;
  topicUpdatedAt: Record<string, string>;
}

const uid = async (): Promise<string | null> => {
  if (!supabaseEnabled || !supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
};

/** Push one queued change. Returns false if it should stay queued and retry. */
export async function pushOp(op: PendingOp): Promise<boolean> {
  const userId = await uid();
  if (!userId || !supabase) return false;

  try {
    switch (op.kind) {
      case 'problem': {
        const { error } = await supabase.from('problem_progress').upsert(
          {
            user_id: userId,
            problem_key: op.key,
            status: op.status,
            note: op.note ?? null,
            updated_at: op.updatedAt,
          },
          { onConflict: 'user_id,problem_key' }
        );
        return !error;
      }
      case 'topic': {
        const { error } = await supabase.from('topic_progress').upsert(
          {
            user_id: userId,
            topic_slug: op.slug,
            completed: op.completed,
            updated_at: op.updatedAt,
          },
          { onConflict: 'user_id,topic_slug' }
        );
        return !error;
      }
      case 'activity': {
        const { error } = await supabase
          .from('day_activity')
          .upsert(
            { user_id: userId, date: op.date, solved_count: op.count },
            { onConflict: 'user_id,date' }
          );
        return !error;
      }
      case 'streak': {
        const { error } = await supabase.from('streaks').upsert(
          {
            user_id: userId,
            current: op.current,
            longest: op.longest,
            last_active_date: op.lastActiveDate,
          },
          { onConflict: 'user_id' }
        );
        return !error;
      }
      case 'profile': {
        const patch: Record<string, unknown> = { user_id: userId };
        if (op.language !== undefined) patch.language_id = null; // resolved below
        if (op.reminderTime !== undefined) patch.reminder_time = op.reminderTime;
        if (op.githubHandle !== undefined) patch.github_handle = op.githubHandle;

        // profiles.language_id is a FK to languages.code, so translate.
        if (op.language !== undefined) {
          const { data: lang } = await supabase
            .from('languages')
            .select('id')
            .eq('code', op.language)
            .maybeSingle();
          patch.language_id = lang?.id ?? null;
        }

        const { error } = await supabase.from('profiles').upsert(patch, { onConflict: 'user_id' });
        return !error;
      }
    }
  } catch {
    // Network failure, DNS, timeout — keep it queued.
    return false;
  }
}

/** Pull everything belonging to the signed-in user. Null if unavailable. */
export async function pullRemote(): Promise<RemoteProgress | null> {
  const userId = await uid();
  if (!userId || !supabase) return null;

  try {
    const [problems, topics, activity, streak, profile] = await Promise.all([
      supabase.from('problem_progress').select('problem_key, status, note, updated_at').eq('user_id', userId),
      supabase.from('topic_progress').select('topic_slug, completed, updated_at').eq('user_id', userId),
      supabase.from('day_activity').select('date, solved_count').eq('user_id', userId),
      supabase.from('streaks').select('current, longest, last_active_date').eq('user_id', userId).maybeSingle(),
      supabase.from('profiles').select('github_handle, reminder_time, language_id, languages(code)').eq('user_id', userId).maybeSingle(),
    ]);

    if (problems.error || topics.error || activity.error) return null;

    const out: RemoteProgress = {
      problemStatus: {},
      problemNotes: {},
      topicDone: {},
      activity: {},
      currentStreak: streak.data?.current ?? 0,
      longestStreak: streak.data?.longest ?? 0,
      lastActiveDate: streak.data?.last_active_date ?? null,
      problemUpdatedAt: {},
      topicUpdatedAt: {},
    };

    for (const r of problems.data ?? []) {
      out.problemStatus[r.problem_key] = r.status as ProblemStatus;
      if (r.note) out.problemNotes[r.problem_key] = r.note;
      out.problemUpdatedAt[r.problem_key] = r.updated_at;
    }
    for (const r of topics.data ?? []) {
      out.topicDone[r.topic_slug] = r.completed;
      out.topicUpdatedAt[r.topic_slug] = r.updated_at;
    }
    for (const r of activity.data ?? []) {
      out.activity[r.date] = r.solved_count;
    }

    if (profile.data) {
      out.githubHandle = profile.data.github_handle ?? undefined;
      out.reminderTime = profile.data.reminder_time ?? null;
      const langs = profile.data.languages as { code: string } | { code: string }[] | null;
      const code = Array.isArray(langs) ? langs[0]?.code : langs?.code;
      if (code) out.language = code;
    }

    return out;
  } catch {
    return null;
  }
}
