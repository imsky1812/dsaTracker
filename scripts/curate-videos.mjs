#!/usr/bin/env node
// Curates explanation videos onto problems — and refuses to write one it cannot
// prove is both real AND about the right problem.
//
//   node scripts/curate-videos.mjs --check     # verify candidates, write nothing
//   node scripts/curate-videos.mjs --apply     # write the survivors into src/data
//
// Why two gates instead of one:
//
//   Gate 1 (exists)   YouTube oEmbed returns 200. A fabricated id returns 400,
//                     a deleted video 404. This catches dead links.
//   Gate 2 (relevant) the returned TITLE must mention the problem, and the
//                     channel must be on the allowlist below.
//
// Gate 1 alone is not enough, and that is the whole point. A recalled id can
// resolve perfectly and still be the wrong video — during development one
// candidate resolved to a Google interview vlog rather than a problem
// walkthrough. A verified-but-wrong link is WORSE than no link: it looks
// authoritative, so the user trusts it and loses time. Gate 2 is what makes
// curation safe enough to ship.
//
// Anything failing either gate is dropped, not guessed at. Those problems keep
// the YouTube-search fallback in src/lib/content.ts, which always works.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const topicsDir = join(root, 'src/data/topics');
const apply = process.argv.includes('--apply');

// Channels whose DSA explanations are worth sending someone to. A video on a
// channel outside this list is dropped even if the title matches — "some video
// that mentions Two Sum" is not a curation standard.
const ALLOWED_CHANNELS = [
  'NeetCode',
  'NeetCodeIO',
  'take U forward',
  'Abdul Bari',
  'Errichto',
  'William Fiset',
  'Back To Back SWE',
  'Kevin Naughton Jr.',
  'Tech With Nikola',
];

// Candidate ids, keyed by exact problem name as it appears in src/data.
// Recalled from memory and therefore UNTRUSTED — every one is verified below,
// and the failures are expected. Add more over time; the gates protect you.
const CANDIDATES = {
  'Two Sum': 'KLlXCFG5TnA',
  'Best Time to Buy and Sell Stock': '1pkOgXD63yU',
  'Contains Duplicate': '3OamzN90kPg',
  'Valid Anagram': '9UtInBqnCgA',
  'Group Anagrams': 'vzdNOK2oB2E',
  'Top K Frequent Elements': 'YPTqKIgVk-k',
  'Valid Parentheses': 'WTzjTskDFMg',
  'Maximum Subarray': '5WZl3MMT0Eg',
  'Product of Array Except Self': 'bNvIQI2wAjk',
  'Merge Two Sorted Lists': 'XIdigk956u0',
  'Reverse Linked List': 'G0_I-ZF0S38',
  'Linked List Cycle': 'gBTe7lFR3vc',
  'Merge k Sorted Lists': 'q5a5OiGbT6Q',
  'Invert Binary Tree': 'OnSn2XEQ4MY',
  'Maximum Depth of Binary Tree': 'hTM3phVI6YQ',
  'Same Tree': 'vRbbcKXCxOw',
  'Validate Binary Search Tree': 's6ATEkipzow',
  'Lowest Common Ancestor of a BST': 'gs2LMfuOR9k',
  'Binary Tree Level Order Traversal': '6ZnyEApgFYg',
  'Number of Islands': 'pV2kpPD66nE',
  'Course Schedule': 'EgI5nU9etnU',
  'Climbing Stairs': 'Y0lT9Fck7qI',
  'House Robber': '73r3KWiEvyk',
  'Longest Increasing Subsequence': 'cjWnW0hdF1Y',
  'Coin Change': 'H9bfqozjoqs',
  'Word Break': 'Sx9NNgInc3A',
  'Longest Common Subsequence': 'Ua0GhsJSlWM',
  'Subsets': 'REOH22Xwdkk',
  'Permutations': 's7AvT7cGdSo',
  'Combination Sum': 'GBKI9VSKdGg',
  'Implement Trie (Prefix Tree)': 'oobqoCJlHA0',
  'Single Number': 'qMPX1AOa83k',
  'Number of 1 Bits': '5Km3utixwZs',
  'Counting Bits': 'RyBM56RIWrM',
  'Kth Largest Element in an Array': 'XEmy13g1Qxc',
  'Search in Rotated Sorted Array': 'U8XENwh8Oy8',
  'Find Minimum in Rotated Sorted Array': 'nIVW4P8b1VA',
  'Longest Substring Without Repeating Characters': 'wiGpQwVHdE0',
  'Valid Palindrome': 'jJXJ16kPFWg',
  'Container With Most Water': 'UuiTKBwPgAo',
  'Trapping Rain Water': 'ZI2z5pq0TqA',
  'Binary Search': 's4DPM8ct1pI',
  'Clone Graph': 'mQeF6bN8hMk',
  'Min Stack': 'qkLl7nAwDPo',
  'Daily Temperatures': 'cTBiBSnjO3c',
};

const norm = (s) =>
  s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Does the video title plausibly refer to this problem? */
function titleMatches(problemName, title) {
  const t = norm(title);
  const p = norm(problemName);
  if (t.includes(p)) return true;
  // Fall back to token overlap for titles that reword slightly
  // ("2 Sum Problem" vs "Two Sum"). Require most significant words present.
  const stop = new Set(['the', 'of', 'a', 'an', 'in', 'to', 'and', 'array', 'problem']);
  const words = p.split(' ').filter((w) => w.length > 2 && !stop.has(w));
  if (!words.length) return false;
  const hits = words.filter((w) => t.includes(w)).length;
  return hits / words.length >= 0.7;
}

async function probe(id) {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${id}`
  )}&format=json`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return { ok: false, reason: `http ${res.status}` };
    const j = await res.json();
    return { ok: true, title: j.title, author: j.author_name };
  } catch (e) {
    return { ok: false, reason: 'network: ' + (e.message || 'failed') };
  }
}

// ---------- load content ----------
const topicFiles = readdirSync(topicsDir).filter((f) => f.endsWith('.json'));
const topics = topicFiles.map((f) => ({ file: f, data: JSON.parse(readFileSync(join(topicsDir, f), 'utf8')) }));
const allNames = new Set(topics.flatMap((t) => t.data.problems.map((p) => p.name)));

// ---------- verify ----------
const verified = new Map();
const rejected = [];
let unknownName = 0;

console.log(`Verifying ${Object.keys(CANDIDATES).length} candidates against ${allNames.size} problem names\n`);

for (const [name, id] of Object.entries(CANDIDATES)) {
  if (!allNames.has(name)) {
    unknownName++;
    rejected.push({ name, id, why: 'no problem with this exact name in src/data' });
    continue;
  }
  const r = await probe(id);
  if (!r.ok) {
    rejected.push({ name, id, why: `gate 1 (exists): ${r.reason}` });
    console.log(`  DROP  ${name}  —  ${r.reason}`);
    continue;
  }
  if (!ALLOWED_CHANNELS.includes(r.author)) {
    rejected.push({ name, id, why: `gate 2 (channel): "${r.author}" not allowlisted` });
    console.log(`  DROP  ${name}  —  channel "${r.author}" not allowlisted`);
    continue;
  }
  if (!titleMatches(name, r.title)) {
    rejected.push({ name, id, why: `gate 2 (title): "${r.title}"` });
    console.log(`  DROP  ${name}  —  title mismatch: "${r.title}"`);
    continue;
  }
  verified.set(name, { id, title: r.title, author: r.author });
  console.log(`  KEEP  ${name}  —  ${r.author}: ${r.title}`);
}

console.log('');
console.log(`verified : ${verified.size}`);
console.log(`dropped  : ${rejected.length}${unknownName ? ` (${unknownName} name not found in content)` : ''}`);
console.log(`coverage : ${verified.size}/${allNames.size} problems get a curated video; the rest keep the search fallback`);

// ---------- apply ----------
if (!apply) {
  console.log('\n(--check mode: nothing written. Re-run with --apply to write the survivors.)');
  process.exit(0);
}

let written = 0;
for (const t of topics) {
  let touched = false;
  for (const p of t.data.problems) {
    const v = verified.get(p.name);
    if (v) {
      const url = `https://www.youtube.com/watch?v=${v.id}`;
      if (p.video !== url) { p.video = url; touched = true; written++; }
    }
  }
  if (touched) writeFileSync(join(topicsDir, t.file), JSON.stringify(t.data, null, 2) + '\n');
}

console.log(`\nwrote ${written} video links across src/data/topics/`);
console.log('now run: npm run content');
