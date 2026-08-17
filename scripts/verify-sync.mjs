#!/usr/bin/env node
// M4 verification: exercise the sync tables the way the app does.
//
//   node scripts/verify-sync.mjs [you@gmail.com]
//
// Creates a throwaway account (report at the end says which). Checks that
// progress can be written using only keys the client derives from bundled
// content, that the natural-key foreign keys hold, and that last-write-wins
// reconciliation behaves.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const env = {};
for (const line of readFileSync(join(root, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
}

const plan = JSON.parse(readFileSync(join(root, 'assets/data/plan.json'), 'utf8'));

const stamp = Date.now();
const base = process.argv[2];
const addr = () => {
  if (!base) return `dsa-sync-${stamp}@gmail.com`;
  const [local, domain] = base.split('@');
  return `${local}+dsa-sync-${stamp}@${domain}`;
};
const user = { email: addr(), password: 'test-password-123' };

const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

let failed = false;
const check = (ok, label, detail = '') => {
  if (!ok) failed = true;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

console.log(`Sync check against ${env.EXPO_PUBLIC_SUPABASE_URL}\n`);
console.log(`  test account: ${user.email}\n`);

// ---------- schema shape ----------
const { count: keyed, error: keyErr } = await supabase
  .from('problems')
  .select('key', { count: 'exact', head: true })
  .not('key', 'is', null);

if (keyErr) {
  console.log(`  FAIL  problems.key column — ${keyErr.message}`);
  console.log('\n  Run supabase/migrations/001_progress_natural_keys.sql, then re-run seed.sql.\n');
  process.exit(1);
}
check(keyed === 139, 'every problem has a natural key', `${keyed}/139`);

// Keys must match what the client computes, or progress silently orphans.
const localKeys = plan.topics.flatMap((t) => t.problems.map((p) => `${t.slug}::${p.name}`));
const { data: remoteKeyRows } = await supabase.from('problems').select('key');
const remoteKeys = new Set((remoteKeyRows ?? []).map((r) => r.key));
const missing = localKeys.filter((k) => !remoteKeys.has(k));
check(missing.length === 0, 'client-derived keys all exist server-side', missing.slice(0, 2).join(', '));

// ---------- sign up ----------
const { data: signUp, error: signUpErr } = await supabase.auth.signUp(user);
if (signUpErr || !signUp.session) {
  check(false, 'sign up', signUpErr?.message ?? 'no session');
  process.exit(1);
}
const uid = signUp.user.id;
check(true, 'signed up', `uid ${uid.slice(0, 8)}…`);

// ---------- write using client-derived keys only ----------
const problemKey = localKeys[0];
const topicSlug = plan.topics[0].slug;
const t1 = new Date(stamp).toISOString();

const { error: pErr } = await supabase.from('problem_progress').upsert(
  { user_id: uid, problem_key: problemKey, status: 'solved', note: 'first pass', updated_at: t1 },
  { onConflict: 'user_id,problem_key' }
);
check(!pErr, 'write problem_progress by natural key', pErr?.message);

const { error: tErr } = await supabase.from('topic_progress').upsert(
  { user_id: uid, topic_slug: topicSlug, completed: true, updated_at: t1 },
  { onConflict: 'user_id,topic_slug' }
);
check(!tErr, 'write topic_progress by slug', tErr?.message);

const { error: aErr } = await supabase
  .from('day_activity')
  .upsert({ user_id: uid, date: '2026-08-17', solved_count: 3 }, { onConflict: 'user_id,date' });
check(!aErr, 'write day_activity', aErr?.message);

const { error: sErr } = await supabase
  .from('streaks')
  .upsert({ user_id: uid, current: 4, longest: 9, last_active_date: '2026-08-17' }, { onConflict: 'user_id' });
check(!sErr, 'write streaks', sErr?.message);

// ---------- foreign keys actually hold ----------
const { error: fkErr } = await supabase
  .from('problem_progress')
  .upsert({ user_id: uid, problem_key: 'not-a-real::problem', status: 'solved', updated_at: t1 });
check(Boolean(fkErr), 'FK rejects an unknown problem key', fkErr ? 'rejected' : 'ACCEPTED — FK missing');

// ---------- upsert is idempotent, and newer wins ----------
const t2 = new Date(stamp + 60000).toISOString();
await supabase.from('problem_progress').upsert(
  { user_id: uid, problem_key: problemKey, status: 'revisit', note: 'second pass', updated_at: t2 },
  { onConflict: 'user_id,problem_key' }
);

const { data: after, count: rowCount } = await supabase
  .from('problem_progress')
  .select('status, note, updated_at', { count: 'exact' })
  .eq('user_id', uid);

check(rowCount === 1, 'repeat upsert updates rather than duplicates', `${rowCount} row(s)`);
check(after?.[0]?.status === 'revisit', 'later write wins', `status=${after?.[0]?.status}`);
check(after?.[0]?.note === 'second pass', 'note updated', after?.[0]?.note);

// ---------- pull shape matches what sync.ts expects ----------
const { data: pulled, error: pullErr } = await supabase
  .from('problem_progress')
  .select('problem_key, status, note, updated_at')
  .eq('user_id', uid);
check(!pullErr && pulled?.[0]?.problem_key === problemKey, 'pull returns the client key', pullErr?.message);

const { data: prof, error: profErr } = await supabase
  .from('profiles')
  .select('github_handle, reminder_time, language_id, languages(code)')
  .eq('user_id', uid)
  .maybeSingle();
check(!profErr && Boolean(prof), 'profile join used by pullRemote resolves', profErr?.message);

const { error: profWriteErr } = await supabase
  .from('profiles')
  .upsert({ user_id: uid, github_handle: 'imsky1812', reminder_time: '20:00' }, { onConflict: 'user_id' });
check(!profWriteErr, 'write profile preferences', profWriteErr?.message);

console.log('');
if (failed) {
  console.error('Sync verification FAILED.');
  process.exit(1);
}
console.log('Sync verification passed.');
console.log(`\nClean up: Authentication -> Users -> delete ${user.email}`);
