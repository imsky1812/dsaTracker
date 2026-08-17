#!/usr/bin/env node
// Adds LeetCode problems to the content, verifying each one against LeetCode.
//
//   node scripts/add-problems.mjs --check    # verify, write nothing
//   node scripts/add-problems.mjs --apply    # write the survivors into src/data
//
// The candidate list below supplies only what LeetCode cannot tell us — which
// topic a problem belongs to, which tier it sits in, and which companies ask
// it. The NAME and the DIFFICULTY come from LeetCode's own API, so a typo in a
// title or a wrong difficulty label is impossible by construction. A slug that
// does not resolve is dropped, never guessed at (see CLAUDE.md's URL rule).
//
// Company tags here are the service companies. That is deliberate: the app was
// tuned for the Amazon/Google end, and TCS/Infosys/Wipro/Accenture/Cognizant
// are where most placement offers actually come from. Hard problems carry
// TCS and Infosys because CodeVita and HackWithInfy are genuinely hard contests
// those companies run — not a stretch to justify.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const topicsDir = join(root, 'src/data/topics');
const apply = process.argv.includes('--apply');

const SVC = ['TCS', 'Infosys', 'Wipro', 'Accenture', 'Cognizant'];
const MASS = ['TCS', 'Infosys', 'Cognizant'];          // highest-volume hirers
const CONTEST = ['TCS', 'Infosys'];                     // CodeVita / HackWithInfy

// slug, topic, tier, companies. Difficulty and name come from the API.
const CANDIDATES = [
  // --- foundations ---
  ['palindrome-number',                      'basics-patterns',     'warmup',    SVC],
  ['power-of-two',                           'basics-patterns',     'warmup',    MASS],
  ['happy-number',                           'basics-patterns',     'warmup',    ['TCS', 'Wipro', 'Accenture']],

  // --- arrays ---
  ['majority-element',                       'arrays',              'core',      SVC],
  ['remove-duplicates-from-sorted-array',    'arrays',              'warmup',    MASS],
  ['plus-one',                               'arrays',              'warmup',    ['TCS', 'Wipro']],
  ['merge-sorted-array',                     'arrays',              'warmup',    ['Accenture', 'Cognizant']],
  ['rotate-array',                           'arrays',              'core',      ['Infosys', 'Wipro', 'Accenture']],
  ['3sum',                                   'arrays',              'interview', ['Infosys', 'Cognizant']],
  ['next-permutation',                       'arrays',              'interview', ['Infosys']],
  ['first-missing-positive',                 'arrays',              'hard',      CONTEST],

  // --- binary search ---
  ['sqrtx',                                  'binary-search',       'warmup',    MASS],
  ['find-peak-element',                      'binary-search',       'core',      ['Infosys', 'Accenture']],
  ['koko-eating-bananas',                    'binary-search',       'interview', ['Infosys']],
  ['median-of-two-sorted-arrays',            'binary-search',       'hard',      CONTEST],

  // --- strings ---
  ['longest-common-prefix',                  'strings',             'warmup',    SVC],
  ['roman-to-integer',                       'strings',             'warmup',    MASS],
  ['string-to-integer-atoi',                 'strings',             'core',      ['TCS', 'Cognizant']],
  ['longest-palindromic-substring',          'strings',             'interview', ['Infosys', 'Accenture']],
  ['minimum-window-substring',               'strings',             'hard',      CONTEST],

  // --- hashing ---
  ['intersection-of-two-arrays-ii',          'hashing',             'warmup',    ['Accenture', 'Cognizant']],
  ['longest-consecutive-sequence',           'hashing',             'interview', ['Infosys']],

  // --- recursion & backtracking ---
  ['powx-n',                                 'recursion',           'core',      ['TCS', 'Infosys']],
  ['generate-parentheses',                   'recursion',           'interview', ['Infosys', 'Cognizant']],
  ['word-search',                            'backtracking',        'interview', ['Infosys', 'Wipro']],
  ['n-queens',                               'backtracking',        'hard',      CONTEST],
  ['sudoku-solver',                          'backtracking',        'hard',      CONTEST],

  // --- sorting ---
  ['sort-colors',                            'sorting',             'core',      SVC],
  ['merge-intervals',                        'sorting',             'interview', ['Infosys', 'Accenture']],
  ['largest-number',                         'sorting',             'interview', ['TCS']],

  // --- linked lists ---
  ['add-two-numbers',                        'linked-lists',        'core',      SVC],
  ['remove-nth-node-from-end-of-list',       'linked-lists',        'core',      ['Infosys', 'Wipro']],
  ['reorder-list',                           'linked-lists',        'interview', ['Cognizant']],
  ['reverse-nodes-in-k-group',               'linked-lists',        'hard',      CONTEST],

  // --- stacks & queues ---
  ['implement-queue-using-stacks',           'stacks-queues',       'warmup',    MASS],
  ['largest-rectangle-in-histogram',         'stacks-queues',       'hard',      CONTEST],
  ['sliding-window-maximum',                 'stacks-queues',       'hard',      CONTEST],

  // --- trees ---
  ['symmetric-tree',                         'trees',               'warmup',    MASS],
  ['balanced-binary-tree',                   'trees',               'core',      ['TCS', 'Accenture']],
  ['binary-tree-zigzag-level-order-traversal', 'trees',             'interview', ['Infosys', 'Wipro']],
  ['binary-tree-maximum-path-sum',           'trees',               'hard',      CONTEST],
  ['serialize-and-deserialize-binary-tree',  'trees',               'hard',      CONTEST],

  // --- BST ---
  ['convert-sorted-array-to-binary-search-tree', 'bst',             'warmup',    ['Accenture', 'Cognizant']],
  ['kth-smallest-element-in-a-bst',          'bst',                 'interview', ['Infosys']],

  // --- heaps ---
  ['k-closest-points-to-origin',             'heaps',               'interview', ['Cognizant']],
  ['find-median-from-data-stream',           'heaps',               'hard',      CONTEST],

  // --- greedy ---
  ['gas-station',                            'greedy',              'interview', ['Infosys', 'TCS']],
  ['candy',                                  'greedy',              'hard',      CONTEST],

  // --- graphs ---
  ['rotting-oranges',                        'graphs',              'interview', ['Infosys', 'Accenture']],
  ['network-delay-time',                     'graphs',              'interview', ['TCS']],
  ['word-ladder',                            'graphs',              'hard',      CONTEST],

  // --- DP ---
  ['unique-paths',                           'dynamic-programming', 'core',      SVC],
  ['maximum-product-subarray',               'dynamic-programming', 'interview', ['Infosys', 'Cognizant']],
  ['partition-equal-subset-sum',             'dynamic-programming', 'interview', ['Infosys']],
  ['edit-distance',                          'dynamic-programming', 'hard',      CONTEST],

  // --- tries ---
  ['design-add-and-search-words-data-structure', 'tries',           'interview', ['Infosys']],
  ['word-search-ii',                         'tries',               'hard',      CONTEST],

  // --- bit manipulation ---
  ['missing-number',                         'bit-manipulation',    'warmup',    MASS],
  ['reverse-bits',                           'bit-manipulation',    'core',      ['TCS', 'Wipro']],
  // --- deeper Medium/Hard coverage, weighted at the topics thin on both.
  //     CodeVita and HackWithInfy sit at exactly this level. ---
  ['spiral-matrix',                          'arrays',              'interview', ['Infosys', 'Wipro']],
  ['set-matrix-zeroes',                      'arrays',              'core',      ['TCS', 'Accenture']],
  ['trapping-rain-water',                    'arrays',              'hard',      CONTEST],
  ['find-first-and-last-position-of-element-in-sorted-array', 'binary-search', 'core', ['Infosys']],
  ['search-a-2d-matrix',                     'binary-search',       'core',      ['Cognizant']],
  ['split-array-largest-sum',                'binary-search',       'hard',      CONTEST],
  ['zigzag-conversion',                      'strings',             'core',      ['TCS']],
  ['multiply-strings',                       'strings',             'interview', ['Infosys', 'Cognizant']],
  ['valid-number',                           'strings',             'hard',      CONTEST],
  ['subsets-ii',                             'recursion',           'interview', ['Infosys']],
  ['palindrome-partitioning',                'recursion',           'hard',      CONTEST],
  ['combination-sum-ii',                     'backtracking',        'interview', ['Wipro']],
  ['insert-interval',                        'sorting',             'interview', ['Accenture']],
  ['sort-list',                              'sorting',             'hard',      CONTEST],
  ['copy-list-with-random-pointer',          'linked-lists',        'interview', ['Infosys', 'TCS']],
  ['lru-cache',                              'linked-lists',        'hard',      CONTEST],
  ['min-stack',                              'stacks-queues',       'core',      ['Cognizant', 'Accenture']],
  ['decode-string',                          'stacks-queues',       'interview', ['Infosys']],
  ['construct-binary-tree-from-preorder-and-inorder-traversal', 'trees', 'interview', ['Infosys', 'Wipro']],
  ['flatten-binary-tree-to-linked-list',     'trees',               'interview', ['TCS']],
  ['recover-binary-search-tree',             'bst',                 'hard',      CONTEST],
  ['delete-node-in-a-bst',                   'bst',                 'interview', ['Cognizant']],
  ['task-scheduler',                         'heaps',               'interview', ['Infosys']],
  ['sliding-window-median',                  'heaps',               'hard',      CONTEST],
  ['minimum-window-substring',               'hashing',             'hard',      CONTEST],
  ['4sum',                                   'hashing',             'interview', ['Infosys']],
  ['jump-game-ii',                           'greedy',              'interview', ['TCS', 'Infosys']],
  ['minimum-number-of-arrows-to-burst-balloons', 'greedy',          'interview', ['Accenture']],
  ['number-of-provinces',                    'graphs',              'core',      ['TCS', 'Cognizant']],
  ['course-schedule-ii',                     'graphs',              'interview', ['Infosys']],
  ['cheapest-flights-within-k-stops',        'graphs',              'hard',      CONTEST],
  ['longest-increasing-path-in-a-matrix',     'dynamic-programming', 'hard',     CONTEST],
  ['decode-ways',                            'dynamic-programming', 'interview', ['Infosys', 'Wipro']],
  ['target-sum',                             'dynamic-programming', 'interview', ['Cognizant']],
  ['maximum-xor-of-two-numbers-in-an-array', 'tries',               'hard',      CONTEST],
  ['single-number-ii',                       'bit-manipulation',    'interview', ['Infosys']],
  ['divide-two-integers',                    'bit-manipulation',    'hard',      CONTEST],

  // LeetCode equivalents of the two GFG problems that were removed — the GFG
  // links could not be verified by script (a made-up slug returns HTTP 200),
  // and these are literally the same problems.
  ['reverse-pairs',                          'sorting',             'hard',      CONTEST],   // was: Count Inversions
];

const QUERY = 'query q($s:String!){question(titleSlug:$s){questionFrontendId title difficulty}}';

async function fetchProblem(slug) {
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

// ---------- load ----------
const files = readdirSync(topicsDir).filter((f) => f.endsWith('.json'));
const topics = new Map();
for (const f of files) {
  const data = JSON.parse(readFileSync(join(topicsDir, f), 'utf8'));
  topics.set(data.slug, { file: f, data });
}
const existingUrls = new Set([...topics.values()].flatMap(({ data }) => data.problems.map((p) => p.url)));

// ---------- verify ----------
const accepted = [];
let dead = 0, dup = 0, badTopic = 0, errored = 0;

console.log(`Verifying ${CANDIDATES.length} candidates against LeetCode\n`);

for (const [slug, topicSlug, tier, companies] of CANDIDATES) {
  const url = `https://leetcode.com/problems/${slug}/`;

  if (!topics.has(topicSlug)) { badTopic++; console.log(`  DROP  ${slug} — unknown topic "${topicSlug}"`); continue; }
  if (existingUrls.has(url))  { dup++;      console.log(`  SKIP  ${slug} — already in the content`); continue; }

  const { question, error } = await fetchProblem(slug);
  if (error)     { errored++; console.log(`  ERR   ${slug} — ${error}`); continue; }
  if (!question) { dead++;    console.log(`  DROP  ${slug} — no such problem on LeetCode`); continue; }

  accepted.push({
    topicSlug, tier, companies,
    problem: {
      name: question.title,                 // LeetCode's own title — no typos
      url,
      platform: 'LeetCode',
      difficulty: question.difficulty,      // LeetCode's own difficulty — no guessing
      tier,
      companies,
    },
  });
  console.log(`  OK    #${String(question.questionFrontendId).padStart(4)}  ${question.difficulty.padEnd(6)} ${question.title}`);
  await new Promise((r) => setTimeout(r, 120));
}

// Warmup problems must not carry big-tech tags (build-content enforces it);
// these are all service-company tags, but check rather than assume.
const BIG_TECH = new Set(['Amazon', 'Google', 'Microsoft', 'Meta', 'Adobe', 'Uber', 'LinkedIn', 'Flipkart']);
const violations = accepted.filter((a) => a.tier === 'warmup' && a.companies.some((c) => BIG_TECH.has(c)));
for (const v of violations) console.log(`  WARN  ${v.problem.name} — warmup with a big-tech tag, will fail the build`);

console.log('');
console.log(`accepted ${accepted.length}, skipped ${dup} duplicate, dropped ${dead} dead / ${badTopic} bad topic, ${errored} errored`);

const byDiff = {};
for (const a of accepted) byDiff[a.problem.difficulty] = (byDiff[a.problem.difficulty] ?? 0) + 1;
console.log(`difficulty spread: ${Object.entries(byDiff).map(([k, v]) => `${k} ${v}`).join(', ')}`);

if (!apply) {
  console.log('\n(--check mode: nothing written. Re-run with --apply.)');
  process.exit(errored || violations.length ? 1 : 0);
}

// ---------- apply ----------
for (const a of accepted) {
  topics.get(a.topicSlug).data.problems.push(a.problem);
}
for (const { file, data } of topics.values()) {
  const order = { warmup: 0, core: 1, interview: 2, hard: 3 };
  data.problems.sort((x, y) => order[x.tier] - order[y.tier]);
  writeFileSync(join(topicsDir, file), JSON.stringify(data, null, 2) + '\n');
}
console.log(`\nwrote ${accepted.length} problems into src/data/topics/`);
console.log('now run: npm run content');
