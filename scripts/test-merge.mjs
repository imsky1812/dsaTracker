#!/usr/bin/env node
// Tests for the M4 reconciliation logic (src/lib/merge.ts).
//
//   npm run test:merge
//
// No test framework: merge.ts is a pure function with no React Native or
// Supabase imports, so it strips to plain JS and runs under node directly.
// These cover the cases where a bug loses someone's work silently.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Strip TypeScript's type-only syntax; the runtime body is already valid JS.
const source = readFileSync(join(root, 'src/lib/merge.ts'), 'utf8')
  .replace(/^import type .*$/gm, '')
  .replace(/^export interface [\s\S]*?^}/gm, '')
  .replace(/^export type .*$/gm, '')
  .replace(/: MergeableLocal|: RemoteProgress|: MergeResult/g, '')
  .replace(/\(t: string \| null \| undefined\)/g, '(t)')
  .replace(/\(local: string \| undefined, remote: string \| undefined\)/g, '(local, remote)');

const { mergeProgress } = await import(
  'data:text/javascript;base64,' + Buffer.from(source).toString('base64')
);

let failures = 0;
const eq = (actual, expected, label) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failures++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${ok ? '' : `\n          expected ${e}\n          got      ${a}`}`);
};

const T0 = '2026-08-01T00:00:00.000Z';
const T1 = '2026-08-10T00:00:00.000Z';
const T2 = '2026-08-20T00:00:00.000Z';

const emptyLocal = () => ({
  problemStatus: {}, problemNotes: {}, problemUpdatedAt: {},
  topicDone: {}, topicUpdatedAt: {},
  activity: {},
  currentStreak: 0, longestStreak: 0, lastActiveDate: null,
  language: 'cpp', reminderTime: null, githubHandle: '',
});

const emptyRemote = () => ({
  problemStatus: {}, problemNotes: {}, problemUpdatedAt: {},
  topicDone: {}, topicUpdatedAt: {},
  activity: {},
  currentStreak: 0, longestStreak: 0, lastActiveDate: null,
});

console.log('merge.ts\n');

// --- 1. fresh device pulls the account down ---
{
  const remote = { ...emptyRemote(),
    problemStatus: { 'arrays::Two Sum': 'solved' },
    problemNotes: { 'arrays::Two Sum': 'hashmap' },
    problemUpdatedAt: { 'arrays::Two Sum': T1 },
  };
  const out = mergeProgress(emptyLocal(), remote);
  eq(out.problemStatus, { 'arrays::Two Sum': 'solved' }, 'empty local adopts remote progress');
  eq(out.problemNotes, { 'arrays::Two Sum': 'hashmap' }, 'empty local adopts remote notes');
}

// --- 2. local-mode work survives first sign-in (the one that must not fail) ---
{
  const local = { ...emptyLocal(),
    problemStatus: { 'arrays::Two Sum': 'solved', 'stl::Contains Duplicate': 'revisit' },
    problemUpdatedAt: { 'arrays::Two Sum': T1, 'stl::Contains Duplicate': T1 },
  };
  const out = mergeProgress(local, emptyRemote());
  eq(out.problemStatus,
    { 'arrays::Two Sum': 'solved', 'stl::Contains Duplicate': 'revisit' },
    'local progress survives merge against an empty account');
}

// --- 3. last write wins, both directions ---
{
  const local = { ...emptyLocal(),
    problemStatus: { k: 'solved' }, problemUpdatedAt: { k: T2 },
  };
  const remote = { ...emptyRemote(),
    problemStatus: { k: 'unsolved' }, problemUpdatedAt: { k: T1 },
  };
  eq(mergeProgress(local, remote).problemStatus, { k: 'solved' }, 'newer local beats older remote');

  const local2 = { ...emptyLocal(),
    problemStatus: { k: 'solved' }, problemUpdatedAt: { k: T0 },
  };
  const remote2 = { ...emptyRemote(),
    problemStatus: { k: 'revisit' }, problemUpdatedAt: { k: T2 },
  };
  eq(mergeProgress(local2, remote2).problemStatus, { k: 'revisit' }, 'newer remote beats older local');
}

// --- 4. a local edit with no timestamp must not silently win ---
{
  const local = { ...emptyLocal(), problemStatus: { k: 'unsolved' } }; // no updatedAt
  const remote = { ...emptyRemote(),
    problemStatus: { k: 'solved' }, problemUpdatedAt: { k: T1 },
  };
  eq(mergeProgress(local, remote).problemStatus, { k: 'solved' }, 'untimestamped local yields to remote');
}

// --- 5. activity merges by max, never sum ---
{
  const local = { ...emptyLocal(), activity: { '2026-08-10': 3, '2026-08-11': 1 } };
  const remote = { ...emptyRemote(), activity: { '2026-08-10': 5, '2026-08-12': 2 } };
  eq(mergeProgress(local, remote).activity,
    { '2026-08-10': 5, '2026-08-11': 1, '2026-08-12': 2 },
    'activity takes max per day and unions dates');
}

// --- 6. re-merging the same remote is idempotent (no heatmap inflation) ---
{
  const local = { ...emptyLocal(), activity: { '2026-08-10': 4 } };
  const remote = { ...emptyRemote(), activity: { '2026-08-10': 4 } };
  const once = mergeProgress(local, remote);
  const twice = mergeProgress(once, remote);
  eq(twice.activity, once.activity, 'merging twice does not inflate activity');
}

// --- 7. streaks ---
{
  const local = { ...emptyLocal(), currentStreak: 2, longestStreak: 9, lastActiveDate: '2026-08-10' };
  const remote = { ...emptyRemote(), currentStreak: 5, longestStreak: 6, lastActiveDate: '2026-08-15' };
  const out = mergeProgress(local, remote);
  eq(out.longestStreak, 9, 'longest streak keeps the higher record');
  eq(out.currentStreak, 5, 'more recently active device owns the current streak');
  eq(out.lastActiveDate, '2026-08-15', 'last active date follows the more recent device');

  const out2 = mergeProgress(
    { ...emptyLocal(), currentStreak: 7, longestStreak: 7, lastActiveDate: '2026-08-20' },
    { ...emptyRemote(), currentStreak: 1, longestStreak: 3, lastActiveDate: '2026-08-11' }
  );
  eq(out2.currentStreak, 7, 'stale remote does not clobber a live local streak');
}

// --- 8. topics ---
{
  const local = { ...emptyLocal(), topicDone: { arrays: true }, topicUpdatedAt: { arrays: T2 } };
  const remote = { ...emptyRemote(), topicDone: { arrays: false, stl: true }, topicUpdatedAt: { arrays: T1, stl: T1 } };
  eq(mergeProgress(local, remote).topicDone,
    { arrays: true, stl: true },
    'topics merge per-key by timestamp');
}

// --- 9. preferences ---
{
  const local = { ...emptyLocal(), githubHandle: 'local', reminderTime: '20:00', language: 'cpp' };
  const remote = { ...emptyRemote(), githubHandle: 'remote', reminderTime: null, language: 'cpp' };
  const out = mergeProgress(local, remote);
  eq(out.githubHandle, 'remote', 'server github handle is adopted when present');
  eq(out.reminderTime, null, 'an explicitly cleared reminder is respected, not treated as absent');

  const out2 = mergeProgress(local, { ...emptyRemote(), githubHandle: undefined });
  eq(out2.githubHandle, 'local', 'absent server value keeps the local one');
}

// --- 10. merge never mutates its inputs ---
{
  const local = { ...emptyLocal(), problemStatus: { k: 'solved' }, problemUpdatedAt: { k: T0 }, activity: { d: 1 } };
  const snapshot = JSON.stringify(local);
  mergeProgress(local, { ...emptyRemote(), problemStatus: { k: 'revisit' }, problemUpdatedAt: { k: T2 }, activity: { d: 9 } });
  eq(JSON.stringify(local), snapshot, 'inputs are not mutated');
}

console.log('');
if (failures) {
  console.error(`${failures} merge test(s) FAILED.`);
  process.exit(1);
}
console.log('All merge tests passed.');
