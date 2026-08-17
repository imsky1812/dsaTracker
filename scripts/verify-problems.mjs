#!/usr/bin/env node
// Verifies every problem link against the platform itself.
//
//   npm run verify:problems
//
// CLAUDE.md's rule is that a problem URL is verified or it does not ship. This
// is the machinery for that, and it is worth knowing what each platform allows:
//
//   LeetCode  — its GraphQL endpoint answers authoritatively: a bad slug returns
//               question: null, and a good one returns the official difficulty,
//               so this ALSO catches a difficulty we labelled wrongly.
//               (Plain HTTP is useless here: leetcode.com returns 403 to
//               scripted requests for real and fake slugs alike.)
//
//   GFG       — cannot be verified. geeksforgeeks.org returns HTTP 200 for a
//               made-up slug, so a status check proves nothing. GFG links are
//               reported as UNVERIFIABLE and must be checked by hand.
//
// Anything reported here as NOT FOUND is a broken link that would waste the
// user's time, so treat a failure as a blocker rather than a warning.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const plan = JSON.parse(readFileSync(join(root, 'assets/data/plan.json'), 'utf8'));

const QUERY = 'query q($s:String!){question(titleSlug:$s){questionFrontendId title difficulty}}';

async function leetcode(slug) {
  try {
    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com', 'User-Agent': 'Mozilla/5.0' },
      body: JSON.stringify({ query: QUERY, variables: { s: slug } }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return { error: `http ${res.status}` };
    const j = await res.json();
    return { question: j?.data?.question ?? null };
  } catch (e) {
    return { error: e.message || 'network' };
  }
}

// Unique problems by URL — the same problem is taught under several topics.
const byUrl = new Map();
for (const t of plan.topics) {
  for (const p of t.problems) {
    if (!byUrl.has(p.url)) byUrl.set(p.url, { ...p, topics: [t.slug] });
    else byUrl.get(p.url).topics.push(t.slug);
  }
}

const lc = [...byUrl.values()].filter((p) => p.platform === 'LeetCode');
const gfg = [...byUrl.values()].filter((p) => p.platform === 'GFG');

console.log(`${byUrl.size} unique problems: ${lc.length} LeetCode (verifiable), ${gfg.length} GFG (not verifiable)\n`);

let missing = 0, mismatched = 0, errored = 0, ok = 0;

for (const p of lc) {
  const slug = p.url.replace(/^https:\/\/leetcode\.com\/problems\//, '').replace(/\/$/, '');
  const { question, error } = await leetcode(slug);

  if (error) {
    errored++;
    console.log(`  ERR   ${p.name} — ${error}`);
  } else if (!question) {
    missing++;
    console.log(`  DEAD  ${p.name} — slug "${slug}" does not exist on LeetCode`);
  } else if (question.difficulty !== p.difficulty) {
    mismatched++;
    console.log(`  DIFF  ${p.name} — we say ${p.difficulty}, LeetCode says ${question.difficulty}`);
  } else {
    ok++;
  }
  // Be a polite client; this is someone else's API.
  await new Promise((r) => setTimeout(r, 120));
}

console.log('');
console.log(`LeetCode : ${ok} ok, ${mismatched} difficulty mismatch, ${missing} dead, ${errored} unchecked`);
console.log(`GFG      : ${gfg.length} unverifiable by script — verify by hand:`);
for (const p of gfg) console.log(`             ${p.name}  ${p.url}`);

console.log('');
if (missing || errored) {
  console.error('FAILED — dead or unchecked links must be fixed before shipping.');
  process.exit(1);
}
if (mismatched) {
  console.error(`${mismatched} difficulty label(s) disagree with LeetCode. Fix src/data, then npm run content.`);
  process.exit(1);
}
console.log('All LeetCode links verified.');
