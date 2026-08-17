#!/usr/bin/env node
// Merges per-language snippet packs into the per-topic content files.
//
//   node scripts/merge-snippets.mjs            # merge every pack
//   node scripts/merge-snippets.mjs java py    # merge only these
//
// A pack lives at src/data/snippets/<lang>.json and maps topic slug -> one or
// more snippets:
//
//   { "arrays": [ { "label": "Kadane's maximum subarray", "code": "..." } ] }
//
// Authoring one file per language beats hand-editing 19 topic files per
// language: the pack reads as a coherent tour of that language, which is how
// you catch a snippet that is C++ transliterated rather than idiomatic.
//
// Merging is keyed on (lang, label), so re-running updates in place and never
// duplicates. Snippets are ordered C++ first, then packs in LANGUAGES order, so
// the Code tab is stable regardless of merge order.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const topicsDir = join(root, 'src/data/topics');
const packsDir = join(root, 'src/data/snippets');

const LANG_ORDER = ['cpp', 'java', 'py', 'c', 'go'];

if (!existsSync(packsDir)) {
  console.error(`No snippet packs directory at ${packsDir}`);
  process.exit(1);
}

const wanted = process.argv.slice(2);
const packFiles = readdirSync(packsDir)
  .filter((f) => f.endsWith('.json'))
  .filter((f) => !wanted.length || wanted.includes(f.replace(/\.json$/, '')));

if (!packFiles.length) {
  console.error('No matching snippet packs.');
  process.exit(1);
}

// Load topics keyed by slug.
const topicFiles = readdirSync(topicsDir).filter((f) => f.endsWith('.json'));
const topics = new Map();
for (const f of topicFiles) {
  const data = JSON.parse(readFileSync(join(topicsDir, f), 'utf8'));
  topics.set(data.slug, { file: f, data });
}

let added = 0, updated = 0;
const unknownSlugs = [];

for (const pf of packFiles) {
  const lang = pf.replace(/\.json$/, '');
  if (!LANG_ORDER.includes(lang)) {
    console.error(`pack "${pf}": "${lang}" is not a known language — skipping`);
    continue;
  }
  const pack = JSON.parse(readFileSync(join(packsDir, pf), 'utf8'));
  let n = 0;

  for (const [slug, entries] of Object.entries(pack)) {
    const t = topics.get(slug);
    if (!t) { unknownSlugs.push(`${lang}:${slug}`); continue; }
    t.data.code = t.data.code ?? [];

    for (const e of Array.isArray(entries) ? entries : [entries]) {
      const existing = t.data.code.find((c) => c.lang === lang && c.label === e.label);
      if (existing) {
        if (existing.code !== e.code) { existing.code = e.code; updated++; }
      } else {
        t.data.code.push({ lang, label: e.label, code: e.code });
        added++;
      }
      n++;
    }
  }
  console.log(`  ${lang.padEnd(5)} ${String(n).padStart(3)} snippets`);
}

// Stable ordering, then write.
for (const { file, data } of topics.values()) {
  if (!data.code) continue;
  data.code.sort((a, b) => {
    const d = LANG_ORDER.indexOf(a.lang) - LANG_ORDER.indexOf(b.lang);
    return d !== 0 ? d : 0;
  });
  data.code = data.code.map((c) => ({ lang: c.lang, label: c.label, code: c.code }));
  writeFileSync(join(topicsDir, file), JSON.stringify(data, null, 2) + '\n');
}

console.log('');
console.log(`added ${added}, updated ${updated}`);
if (unknownSlugs.length) console.log(`WARNING unknown topic slugs: ${unknownSlugs.join(', ')}`);

// Coverage report — which topics still lack a snippet in which language.
const gaps = {};
for (const lang of LANG_ORDER) {
  const missing = [...topics.values()].filter(({ data }) => !(data.code ?? []).some((c) => c.lang === lang));
  gaps[lang] = missing.length;
}
console.log('');
console.log('coverage (topics with at least one snippet):');
for (const lang of LANG_ORDER) console.log(`  ${lang.padEnd(5)} ${topics.size - gaps[lang]}/${topics.size}`);
console.log('');
console.log('now run: npm run content');
