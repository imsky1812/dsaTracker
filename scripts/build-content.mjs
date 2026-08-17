#!/usr/bin/env node
// Content pipeline: src/data/*.json -> assets/data/plan.json -> supabase/seed.sql
//
// Source of truth is the authored JSON under src/data/. This script bundles it
// into the single file the app imports, then regenerates the Supabase seed from
// that bundle. Run it after editing any content:
//
//   node scripts/build-content.mjs
//   node scripts/build-content.mjs --check   # verify outputs are up to date
//
// URL rule (CLAUDE.md): every problem link must be a real, verified URL. This
// script enforces the *shape* (leetcode.com/problems/<slug>/ or
// geeksforgeeks.org/problems/...) — it cannot verify a link resolves, so any
// newly added problem still needs a manual check before it lands.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));

const check = process.argv.includes('--check');
const problems = [];
const fail = (msg) => problems.push(msg);

// ---------- 1. bundle ----------

const roadmap = read('src/data/roadmap.json');

const topics = readdirSync(join(root, 'src/data/topics'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => read(`src/data/topics/${f}`))
  .sort((a, b) => a.order - b.order);

const primers = {};
for (const f of readdirSync(join(root, 'src/data/primer')).filter((f) => f.endsWith('.json'))) {
  const primer = read(`src/data/primer/${f}`);
  primers[primer.language] = primer;
}

const companies = [
  ...new Set(topics.flatMap((t) => t.problems.flatMap((p) => p.companies ?? []))),
].sort();

const plan = {
  roadmap,
  topics,
  primers,
  companies,
  meta: {
    topicCount: topics.length,
    problemCount: topics.reduce((n, t) => n + t.problems.length, 0),
    languages: Object.keys(primers),
  },
};

// ---------- 2. validate ----------

const LEETCODE = /^https:\/\/leetcode\.com\/problems\/[a-z0-9-]+\/$/;
const GFG = /^https:\/\/www\.geeksforgeeks\.org\/problems\/[^\s]+$/;
const TIERS = new Set(['warmup', 'core', 'interview', 'hard']);
const DIFFICULTIES = new Set(['Easy', 'Medium', 'Hard']);

// Every topic must belong to exactly one phase, or the progress journey either
// hides a topic or double-counts it.
const phaseTopics = roadmap.phases.flatMap((p) => p.topics ?? []);
const topicSlugs = topics.map((t) => t.slug);
for (const slug of topicSlugs) {
  if (!phaseTopics.includes(slug)) fail(`topic "${slug}" is not assigned to any roadmap phase`);
}
for (const slug of phaseTopics) {
  if (!topicSlugs.includes(slug)) fail(`roadmap phase references unknown topic "${slug}"`);
}
if (phaseTopics.length !== new Set(phaseTopics).size) {
  fail('a topic is assigned to more than one roadmap phase');
}

// Snippets are per-language; an unknown code would silently drop the snippet
// from the seed (the SQL joins on languages.code).
const KNOWN_LANGS = new Set(['cpp', 'java', 'py', 'c', 'go']);
for (const t of topics) {
  for (const c of t.code ?? []) {
    if (!KNOWN_LANGS.has(c.lang)) fail(`unknown snippet lang: ${t.slug} / ${c.label} -> ${c.lang}`);
  }
}

const seenSlugs = new Set();
// A problem may legitimately appear under several topics (Two Sum is taught in
// arrays, stl and hashing). Its identity is (name, url) — so the same name must
// never point at two different URLs, or the seed's lookups become ambiguous.
const urlByName = new Map();

for (const t of topics) {
  if (seenSlugs.has(t.slug)) fail(`duplicate topic slug: ${t.slug}`);
  seenSlugs.add(t.slug);

  for (const p of t.problems) {
    const where = `${t.slug} / ${p.name}`;
    if (p.platform === 'LeetCode' && !LEETCODE.test(p.url)) fail(`bad LeetCode URL: ${where} -> ${p.url}`);
    if (p.platform === 'GFG' && !GFG.test(p.url)) fail(`bad GFG URL: ${where} -> ${p.url}`);
    if (!TIERS.has(p.tier)) fail(`bad tier: ${where} -> ${p.tier}`);
    if (!DIFFICULTIES.has(p.difficulty)) fail(`bad difficulty: ${where} -> ${p.difficulty}`);

    // A curated video is optional, but if present it must be a real YouTube
    // link — a placeholder here would be exactly the fabricated URL the repo
    // rules forbid.
    if (p.video && !/^https:\/\/(www\.youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}/.test(p.video)) {
      fail(`bad video URL: ${where} -> ${p.video}`);
    }

    // Company-tag discipline. Amazon was once on 137 of 139 problems, which
    // made the filter useless — a tag on everything carries no information.
    // Two rules keep it meaningful, and they are enforced here so the tags
    // cannot drift back:
    //   - warmup problems carry no BIG-TECH tags. FizzBuzz and plain binary
    //     search are learning scaffolds, not a FAANG interview signature.
    //     Service-company tags (TCS/Infosys/Wipro) DO belong there: for those
    //     firms a warmup-level question is a representative one, so dropping
    //     them would have deleted those companies from the app entirely.
    //   - Amazon only appears on the interview/hard tiers, where "company X
    //     asks this" is a claim worth making.
    // These are editorial rules about tiers, not sourced interview data.
    const SERVICE_COMPANIES = new Set(['TCS', 'Infosys', 'Wipro']);
    const warmupBigTech = (p.companies ?? []).filter((n) => !SERVICE_COMPANIES.has(n));
    if (p.tier === 'warmup' && warmupBigTech.length > 0) {
      fail(`warmup problems carry no big-tech company tags: ${where} -> ${warmupBigTech.join(', ')}`);
    }
    if (p.companies?.includes('Amazon') && !['interview', 'hard'].includes(p.tier)) {
      fail(`Amazon tag only belongs on interview/hard tiers: ${where} (tier=${p.tier})`);
    }

    const prev = urlByName.get(p.name);
    if (prev && prev !== p.url) fail(`problem "${p.name}" has two different URLs: ${prev} vs ${p.url}`);
    urlByName.set(p.name, p.url);
  }
}

if (problems.length) {
  console.error('Content validation failed:');
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}

// ---------- 3. seed SQL ----------

const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);

const lines = [
  '-- DSA Mastery — seed data',
  '-- GENERATED by scripts/build-content.mjs from assets/data/plan.json. Do not edit by hand.',
  '-- Run after schema.sql. Safe to re-run: content rows are upserted on their natural keys.',
  '',
];

for (const [code, primer] of Object.entries(primers)) {
  lines.push(
    `insert into languages (code, name) values (${q(code)}, ${q(primer.language_name)}) on conflict (code) do nothing;`
  );
}
lines.push('');

for (const ph of roadmap.phases) {
  lines.push(
    `insert into roadmap_phases ("order", title, summary, est_weeks, checkpoint, learn, topics) values ` +
      `(${ph.order}, ${q(ph.title)}, ${q(ph.summary)}, ${q(ph.est_weeks)}, ${q(ph.checkpoint)}, ` +
      `${q(JSON.stringify(ph.learn))}, ${q(JSON.stringify(ph.topics))})` +
      ` on conflict ("order") do update set title = excluded.title, summary = excluded.summary,` +
      ` est_weeks = excluded.est_weeks, checkpoint = excluded.checkpoint, learn = excluded.learn,` +
      ` topics = excluded.topics;`
  );
}
lines.push('');

for (const c of companies) {
  lines.push(`insert into companies (name) values (${q(c)}) on conflict (name) do nothing;`);
}
lines.push('');

for (const t of topics) {
  lines.push(
    `insert into topics ("order", slug, title, explainer_md, patterns_md, complexity_md) values ` +
      `(${t.order}, ${q(t.slug)}, ${q(t.title)}, ${q(t.explainer_md)}, ${q(t.patterns_md)}, ${q(t.complexity_md)})` +
      ` on conflict (slug) do update set "order" = excluded."order", title = excluded.title,` +
      ` explainer_md = excluded.explainer_md, patterns_md = excluded.patterns_md,` +
      ` complexity_md = excluded.complexity_md;`
  );
}
lines.push('');

// Purely-derived tables are rebuilt rather than upserted.
//
// Upserts propagate changed content but NOT deleted content: thinning the
// Amazon tags removed 125 company links from src/data, and a seed that only
// inserts left all 125 behind in the database (359 rows where 234 were
// expected). Same gap applies to a renamed snippet label.
//
// These two tables are safe to rebuild: nothing references them, and they hold
// no user data. problems/topics deliberately are NOT rebuilt — problem_progress
// references problems.key ON DELETE CASCADE, so deleting a problem would delete
// somebody's solved marks and notes. Removing a problem stays a manual,
// deliberate act; `npm run verify:supabase` reports the row-count drift.
lines.push('delete from problem_companies;');
lines.push('delete from code_snippets;');
lines.push('');

// Code snippets are keyed (topic, language, label) so re-running updates in place.
for (const t of topics) {
  for (const c of t.code) {
    lines.push(
      `insert into code_snippets (topic_id, language_id, label, code) ` +
        `select t.id, l.id, ${q(c.label)}, ${q(c.code)} from topics t, languages l ` +
        `where t.slug = ${q(t.slug)} and l.code = ${q(c.lang)} ` +
        `on conflict (topic_id, language_id, label) do update set code = excluded.code;`
    );
  }
}
lines.push('');

for (const [code, primer] of Object.entries(primers)) {
  for (const s of primer.sections) {
    lines.push(
      `insert into lang_primer (language_id, "order", section_title, body_md, code) ` +
        `select id, ${s.order}, ${q(s.title)}, ${q(s.body_md)}, ${q(s.code)} from languages where code = ${q(code)} ` +
        `on conflict (language_id, "order") do update set section_title = excluded.section_title,` +
        ` body_md = excluded.body_md, code = excluded.code;`
    );
  }
}
lines.push('');

// Problems are keyed (topic_id, name): the same problem can appear under several
// topics, so topic must be part of the key — and every company link below must
// be scoped by topic too, or one company row fans out across every copy.
for (const t of topics) {
  for (const p of t.problems) {
    // Must match problemId() in src/lib/content.ts — per-user progress rows
    // reference this key, so a mismatch would silently orphan someone's data.
    const key = `${t.slug}::${p.name}`;
    lines.push(
      `insert into problems (topic_id, key, name, url, platform, difficulty, tier, video) ` +
        `select id, ${q(key)}, ${q(p.name)}, ${q(p.url)}, ${q(p.platform)}, ${q(p.difficulty)}, ${q(p.tier)}, ` +
        `${p.video ? q(p.video) : 'null'} ` +
        `from topics where slug = ${q(t.slug)} ` +
        `on conflict (topic_id, name) do update set key = excluded.key, url = excluded.url,` +
        ` platform = excluded.platform, difficulty = excluded.difficulty, tier = excluded.tier,` +
        ` video = excluded.video;`
    );
  }
}
lines.push('');

let linkCount = 0;
for (const t of topics) {
  for (const p of t.problems) {
    for (const company of p.companies ?? []) {
      linkCount++;
      lines.push(
        `insert into problem_companies (problem_id, company_id) ` +
          `select pr.id, c.id from problems pr join topics t on t.id = pr.topic_id, companies c ` +
          `where t.slug = ${q(t.slug)} and pr.name = ${q(p.name)} and c.name = ${q(company)} ` +
          `on conflict do nothing;`
      );
    }
  }
}
lines.push('');

const seed = lines.join('\n');
const bundle = JSON.stringify(plan, null, 2) + '\n';

// ---------- 4. write / check ----------

const outputs = [
  ['assets/data/plan.json', bundle],
  ['supabase/seed.sql', seed],
];

if (check) {
  let stale = false;
  for (const [path, want] of outputs) {
    const have = readFileSync(join(root, path), 'utf8');
    if (have !== want) {
      console.error(`stale: ${path} — run "node scripts/build-content.mjs"`);
      stale = true;
    }
  }
  if (stale) process.exit(1);
  console.log('content outputs are up to date');
} else {
  for (const [path, content] of outputs) writeFileSync(join(root, path), content);
  console.log(`wrote assets/data/plan.json and supabase/seed.sql`);
}

const byLang = {};
for (const t of topics) for (const c of t.code ?? []) byLang[c.lang] = (byLang[c.lang] ?? 0) + 1;
const langSummary = Object.entries(byLang).map(([k, v]) => `${k}:${v}`).join(' ');

console.log(
  `  ${roadmap.phases.length} phases · ${topics.length} topics · ${plan.meta.problemCount} problems · ` +
    `${topics.reduce((n, t) => n + t.code.length, 0)} snippets (${langSummary}) · ` +
    `${Object.keys(primers).length} primers · ${companies.length} companies · ` +
    `${linkCount} problem-company links`
);
