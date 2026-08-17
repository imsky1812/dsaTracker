#!/usr/bin/env node
// M2 verification: prove the deployed Supabase project matches the authored
// content, read through the same anon key the app uses.
//
//   node scripts/verify-supabase.mjs
//
// Reads EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY from .env.
// Exits non-zero on any mismatch, so "content reads back correctly" is a fact
// with output behind it rather than an assumption.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Minimal .env reader — no dotenv dependency needed for a one-off script.
function loadEnv() {
  let raw;
  try {
    raw = readFileSync(join(root, '.env'), 'utf8');
  } catch {
    console.error('No .env found. Copy .env.example to .env and fill in your Supabase URL + anon key.');
    process.exit(1);
  }
  const env = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
  return env;
}

const env = loadEnv();
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must both be set in .env');
  process.exit(1);
}
if (!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url)) {
  console.error(`EXPO_PUBLIC_SUPABASE_URL looks wrong: ${url}`);
  console.error('Expected the Project URL, e.g. https://abcdefghijkl.supabase.co');
  process.exit(1);
}

const plan = JSON.parse(readFileSync(join(root, 'assets/data/plan.json'), 'utf8'));

const expected = {
  roadmap_phases: plan.roadmap.phases.length,
  languages: Object.keys(plan.primers).length,
  topics: plan.topics.length,
  code_snippets: plan.topics.reduce((n, t) => n + t.code.length, 0),
  lang_primer: Object.values(plan.primers).reduce((n, p) => n + p.sections.length, 0),
  problems: plan.topics.reduce((n, t) => n + t.problems.length, 0),
  companies: plan.companies.length,
  problem_companies: plan.topics.reduce(
    (n, t) => n + t.problems.reduce((m, p) => m + (p.companies?.length ?? 0), 0),
    0
  ),
};

const supabase = createClient(url, key, { auth: { persistSession: false } });

console.log(`Verifying ${url}\n`);

let failed = false;

for (const [table, want] of Object.entries(expected)) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) {
    console.log(`  FAIL  ${table.padEnd(18)} ${error.message}`);
    failed = true;
    continue;
  }
  const ok = count === want;
  if (!ok) failed = true;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${table.padEnd(18)} ${String(count).padStart(4)} / ${want} expected`);
}

// Spot-check real content came through, not just row counts.
const { data: topic, error: topicErr } = await supabase
  .from('topics')
  .select('slug, title, explainer_md')
  .eq('slug', 'arrays')
  .single();

if (topicErr || !topic) {
  console.log(`\n  FAIL  sample topic read: ${topicErr?.message ?? 'no row'}`);
  failed = true;
} else {
  const words = topic.explainer_md?.split(/\s+/).length ?? 0;
  console.log(`\n  ok    sample topic: "${topic.title}" (${words}-word explainer)`);
  if (words < 50) {
    console.log('  FAIL  explainer looks truncated');
    failed = true;
  }
}

// Per-user tables must be locked down: anon reads should return zero rows.
const { data: leak, error: leakErr } = await supabase.from('problem_progress').select('user_id').limit(1);
if (leakErr) {
  console.log(`  ok    RLS on problem_progress (anon blocked: ${leakErr.message})`);
} else if (leak?.length) {
  console.log('  FAIL  RLS: anon key can read other users\' problem_progress rows');
  failed = true;
} else {
  console.log('  ok    RLS on problem_progress (anon sees no rows)');
}

console.log('');
if (failed) {
  console.error('Verification FAILED — schema.sql and/or seed.sql did not apply cleanly.');
  process.exit(1);
}
console.log('Verification passed: Supabase content matches assets/data/plan.json.');
