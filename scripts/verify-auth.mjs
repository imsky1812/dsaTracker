#!/usr/bin/env node
// M3 verification: exercise the real auth chain against the deployed project.
//
//   node scripts/verify-auth.mjs [you@gmail.com]
//
// Creates two throwaway accounts, so it reports the addresses it used — delete
// them from Authentication -> Users when you're done. Everything runs through
// the anon key, exactly as the app does, so what passes here is what the app
// gets.
//
// Supabase rejects addresses whose domain has no MX record, so example.com and
// invented domains fail validation. Pass your own address and the script uses
// plus-addressing (you+dsa-test-1@gmail.com); with "Confirm email" off no mail
// is ever sent, so nothing lands in your inbox.
//
// It also pre-validates the M4 assumptions: that the on-signup trigger creates
// profiles + streaks rows, and that RLS actually isolates one user from another.

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

const url = env.EXPO_PUBLIC_SUPABASE_URL;
const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing Supabase env vars in .env');
  process.exit(1);
}

const stamp = Date.now();
const base = process.argv[2];

// Plus-addressing keeps the throwaway accounts under one real, MX-valid address.
const addr = (suffix) => {
  if (!base) return `dsa-test-${stamp}-${suffix}@gmail.com`;
  const [local, domain] = base.split('@');
  if (!domain) {
    console.error(`Not an email address: ${base}`);
    process.exit(1);
  }
  return `${local}+dsa-test-${stamp}-${suffix}@${domain}`;
};

const userA = { email: addr('a'), password: 'test-password-123' };
const userB = { email: addr('b'), password: 'test-password-123' };

const client = () => createClient(url, key, { auth: { persistSession: false } });

let failed = false;
const check = (ok, label, detail = '') => {
  if (!ok) failed = true;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

console.log(`Auth check against ${url}\n`);
console.log(`  test accounts: ${userA.email}\n                 ${userB.email}\n`);

// ---------- sign up ----------
const a = client();
const { data: signUpA, error: signUpErrA } = await a.auth.signUp(userA);

if (signUpErrA) {
  check(false, 'sign up', signUpErrA.message);
  process.exit(1);
}

const autoConfirmed = Boolean(signUpA.session);
check(true, 'sign up accepted', `user id ${signUpA.user?.id?.slice(0, 8)}…`);

if (!autoConfirmed) {
  console.log('\n  !!  "Confirm email" is still ON in your Supabase dashboard.');
  console.log('      Signup returns a user but no session, so first sign-in is blocked');
  console.log('      until the emailed link is clicked.');
  console.log('      Turn it off: Authentication -> Providers -> Email -> Confirm email.\n');
  process.exit(2);
}
check(true, 'session issued on signup', 'email confirmation is off');

// ---------- on-signup trigger ----------
const uidA = signUpA.user.id;

const { data: profile, error: profileErr } = await a
  .from('profiles')
  .select('user_id')
  .eq('user_id', uidA)
  .maybeSingle();
check(!profileErr && Boolean(profile), 'trigger created profiles row', profileErr?.message);

const { data: streak, error: streakErr } = await a
  .from('streaks')
  .select('user_id, current, longest')
  .eq('user_id', uidA)
  .maybeSingle();
check(!streakErr && Boolean(streak), 'trigger created streaks row', streakErr?.message);

// ---------- per-user writes (M4 groundwork) ----------
const { data: problemRow } = await a.from('problems').select('id').limit(1).single();

const { error: writeErr } = await a
  .from('problem_progress')
  .upsert({ user_id: uidA, problem_id: problemRow.id, status: 'solved', note: 'verify-auth' });
check(!writeErr, 'can write own problem_progress', writeErr?.message);

const { data: readBack } = await a
  .from('problem_progress')
  .select('status, note')
  .eq('user_id', uidA)
  .maybeSingle();
check(readBack?.status === 'solved', 'can read own problem_progress back', `status=${readBack?.status}`);

// ---------- RLS isolation ----------
const b = client();
const { data: signUpB, error: signUpErrB } = await b.auth.signUp(userB);
if (signUpErrB || !signUpB.session) {
  check(false, 'second account for RLS test', signUpErrB?.message ?? 'no session');
} else {
  const { data: leak } = await b.from('problem_progress').select('user_id').eq('user_id', uidA);
  check((leak?.length ?? 0) === 0, 'RLS blocks reading another user\'s progress', `saw ${leak?.length ?? 0} rows`);

  const { error: crossWriteErr } = await b
    .from('problem_progress')
    .upsert({ user_id: uidA, problem_id: problemRow.id, status: 'unsolved' });
  check(Boolean(crossWriteErr), 'RLS blocks writing another user\'s progress', crossWriteErr ? 'rejected' : 'ALLOWED — policy is wrong');
}

// ---------- content is readable while signed in ----------
const { count: topicCount, error: contentErr } = await a
  .from('topics')
  .select('*', { count: 'exact', head: true });
check(!contentErr && topicCount === 19, 'signed-in user can read content', `topics=${topicCount}`);

// ---------- sign in / sign out ----------
const { error: signOutErr } = await a.auth.signOut({ scope: 'local' });
check(!signOutErr, 'sign out', signOutErr?.message);

const c = client();
const { data: signInData, error: signInErr } = await c.auth.signInWithPassword(userA);
check(!signInErr && Boolean(signInData.session), 'sign in with the same credentials', signInErr?.message);

const { error: badPwErr } = await client().auth.signInWithPassword({
  email: userA.email,
  password: 'definitely-wrong',
});
check(Boolean(badPwErr), 'wrong password is rejected', badPwErr?.message);

console.log('');
if (failed) {
  console.error('Auth verification FAILED.');
  process.exit(1);
}
console.log('Auth verification passed.');
console.log(`\nClean up: Authentication -> Users -> delete ${userA.email} and ${userB.email}`);
