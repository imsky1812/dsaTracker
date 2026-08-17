// Progress store — the single source of truth screens read and write.
//
// M1: local + AsyncStorage. M4: the same store, now mirrored to Supabase.
//
// The public API is unchanged on purpose (CLAUDE.md): `setProblemStatus`,
// `cycleProblemStatus`, `toggleTopic`, `setNote` and friends still update local
// state synchronously and still work with no network and no account. Sync is
// additive — every mutation also appends to `pending`, which drains in the
// background. No screen had to change.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProblemStatus } from '../lib/content';
import type { PendingOp, RemoteProgress } from '../lib/sync';
import { mergeProgress } from '../lib/merge';
import { dayKey, dayKeyOffset } from '../lib/dates';

// Local-calendar day, not UTC — see src/lib/dates.ts for why that matters.
const todayKey = () => dayKey();
const now = () => new Date().toISOString();

export type SyncState = 'idle' | 'syncing' | 'offline' | 'error';

interface ProgressState {
  // ---- state screens read (unchanged since M1) ----
  problemStatus: Record<string, ProblemStatus>;
  problemNotes: Record<string, string>;
  topicDone: Record<string, boolean>;
  activity: Record<string, number>;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  language: string;
  reminderTime: string | null;
  githubHandle: string;

  // ---- sync bookkeeping (M4) ----
  /** Per-key local edit times, for last-write-wins reconciliation. */
  problemUpdatedAt: Record<string, string>;
  topicUpdatedAt: Record<string, string>;
  /** Changes not yet confirmed by the server. Persisted, so they survive a restart. */
  pending: PendingOp[];
  syncState: SyncState;
  lastSyncedAt: string | null;

  // ---- actions (unchanged signatures) ----
  setProblemStatus: (id: string, status: ProblemStatus) => void;
  cycleProblemStatus: (id: string) => void;
  setNote: (id: string, note: string) => void;
  toggleTopic: (slug: string) => void;
  setLanguage: (lang: string) => void;
  setReminderTime: (t: string | null) => void;
  setGithubHandle: (h: string) => void;
  resetProgress: () => void;

  // ---- sync plumbing (M4) ----
  enqueue: (op: PendingOp) => void;
  dropOps: (count: number) => void;
  setSyncState: (s: SyncState, at?: string | null) => void;
  mergeRemote: (remote: RemoteProgress) => void;
}

const bumpStreak = (state: ProgressState) => {
  const today = todayKey();
  if (state.lastActiveDate === today) return {}; // already counted today
  // Local-day arithmetic: subtracting 86_400_000 ms is wrong across a DST
  // boundary, where a local day is 23 or 25 hours long.
  const yesterday = dayKeyOffset(-1);
  const nextStreak = state.lastActiveDate === yesterday ? state.currentStreak + 1 : 1;
  return {
    currentStreak: nextStreak,
    longestStreak: Math.max(state.longestStreak, nextStreak),
    lastActiveDate: today,
  };
};

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      problemStatus: {},
      problemNotes: {},
      topicDone: {},
      activity: {},
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      language: 'cpp',
      reminderTime: null,
      githubHandle: '',

      problemUpdatedAt: {},
      topicUpdatedAt: {},
      pending: [],
      syncState: 'idle',
      lastSyncedAt: null,

      setProblemStatus: (id, status) =>
        set((s) => {
          const was = s.problemStatus[id];
          const activity = { ...s.activity };
          const stamp = now();
          let streakPatch: Partial<ProgressState> = {};
          let activityOp: PendingOp | null = null;
          let streakOp: PendingOp | null = null;

          if (status === 'solved' && was !== 'solved') {
            const d = todayKey();
            activity[d] = (activity[d] ?? 0) + 1;
            streakPatch = bumpStreak(s);
            activityOp = { kind: 'activity', date: d, count: activity[d] };
            streakOp = {
              kind: 'streak',
              current: streakPatch.currentStreak ?? s.currentStreak,
              longest: streakPatch.longestStreak ?? s.longestStreak,
              lastActiveDate: streakPatch.lastActiveDate ?? s.lastActiveDate,
            };
          }

          const ops: PendingOp[] = [
            { kind: 'problem', key: id, status, note: s.problemNotes[id], updatedAt: stamp },
            ...(activityOp ? [activityOp] : []),
            ...(streakOp ? [streakOp] : []),
          ];

          return {
            problemStatus: { ...s.problemStatus, [id]: status },
            problemUpdatedAt: { ...s.problemUpdatedAt, [id]: stamp },
            activity,
            pending: [...s.pending, ...ops],
            ...streakPatch,
          };
        }),

      cycleProblemStatus: (id) => {
        const order: ProblemStatus[] = ['unsolved', 'solved', 'revisit'];
        const cur = get().problemStatus[id] ?? 'unsolved';
        const next = order[(order.indexOf(cur) + 1) % order.length];
        get().setProblemStatus(id, next);
      },

      setNote: (id, note) =>
        set((s) => {
          const stamp = now();
          return {
            problemNotes: { ...s.problemNotes, [id]: note },
            problemUpdatedAt: { ...s.problemUpdatedAt, [id]: stamp },
            pending: [
              ...s.pending,
              {
                kind: 'problem',
                key: id,
                status: s.problemStatus[id] ?? 'unsolved',
                note,
                updatedAt: stamp,
              },
            ],
          };
        }),

      toggleTopic: (slug) =>
        set((s) => {
          const completed = !s.topicDone[slug];
          const stamp = now();
          return {
            topicDone: { ...s.topicDone, [slug]: completed },
            topicUpdatedAt: { ...s.topicUpdatedAt, [slug]: stamp },
            pending: [...s.pending, { kind: 'topic', slug, completed, updatedAt: stamp }],
          };
        }),

      setLanguage: (language) =>
        set((s) => ({ language, pending: [...s.pending, { kind: 'profile', language }] })),

      setReminderTime: (reminderTime) =>
        set((s) => ({ reminderTime, pending: [...s.pending, { kind: 'profile', reminderTime }] })),

      setGithubHandle: (githubHandle) =>
        set((s) => ({ githubHandle, pending: [...s.pending, { kind: 'profile', githubHandle }] })),

      resetProgress: () =>
        set((s) => {
          const stamp = now();
          // Reset is a real edit, not a local-only wipe: push cleared rows up so
          // the next pull doesn't restore what the user just deleted.
          const ops: PendingOp[] = [
            ...Object.keys(s.problemStatus).map(
              (key): PendingOp => ({ kind: 'problem', key, status: 'unsolved', note: '', updatedAt: stamp })
            ),
            ...Object.keys(s.topicDone).map(
              (slug): PendingOp => ({ kind: 'topic', slug, completed: false, updatedAt: stamp })
            ),
            { kind: 'streak', current: 0, longest: 0, lastActiveDate: null },
          ];
          return {
            problemStatus: {}, problemNotes: {}, topicDone: {}, activity: {},
            currentStreak: 0, longestStreak: 0, lastActiveDate: null,
            problemUpdatedAt: {}, topicUpdatedAt: {},
            pending: [...s.pending, ...ops],
          };
        }),

      enqueue: (op) => set((s) => ({ pending: [...s.pending, op] })),

      // Ops flush in order from the head, so drop from the head. Anything
      // enqueued while the flush was in flight stays put.
      dropOps: (count) => set((s) => ({ pending: s.pending.slice(count) })),

      setSyncState: (syncState, at) =>
        set((s) => ({ syncState, lastSyncedAt: at === undefined ? s.lastSyncedAt : at })),

      // Reconciliation lives in src/lib/merge.ts as a pure function so it can
      // be tested without a store, a device, or a network.
      mergeRemote: (remote) => set((s) => mergeProgress(s, remote)),
    }),
    {
      name: 'dsa-progress-v1',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      // v1 stores predate sync bookkeeping; give them the new fields rather
      // than letting `undefined` reach the reducers.
      migrate: (persisted: any, version) => {
        if (version < 2) {
          return {
            ...persisted,
            problemUpdatedAt: {},
            topicUpdatedAt: {},
            pending: [],
            syncState: 'idle' as SyncState,
            lastSyncedAt: null,
          };
        }
        return persisted;
      },
      // Transient status is not worth persisting; the queue very much is.
      partialize: ({ syncState, ...rest }) => rest,
    }
  )
);
