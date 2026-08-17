#!/usr/bin/env node
// Syntax-checks the authored code snippets, per language, using whichever
// toolchains are installed.
//
//   npm run check:snippets
//
// Snippets are teaching fragments, not runnable programs — they reference
// undefined names on purpose. So this checks SYNTAX only, which is the part a
// typo breaks and a reader can't be expected to debug. Anything semantic still
// needs human eyes.
//
// A missing toolchain is skipped with a note rather than failing: not every
// machine has a JDK or a Go install, and this must not block the build.

import { readFileSync, readdirSync, existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const packsDir = join(root, 'src/data/snippets');

const has = (cmd, args = ['--version']) => {
  const r = spawnSync(cmd, args, { stdio: 'ignore', shell: process.platform === 'win32' });
  return r.status === 0;
};

// Each checker returns null when the snippet is fine, or an error string.
const CHECKERS = {
  py: {
    available: () => has('python3') || has('python'),
    check(code, dir, i) {
      const bin = has('python3') ? 'python3' : 'python';
      const f = join(dir, `s${i}.py`);
      writeFileSync(f, code);
      // py_compile parses without executing, so undefined names are fine.
      // Deliberately NOT `python -c "<program>"`: passing a quoted program on
      // the command line is mangled by Windows shell quoting, which made this
      // checker report a syntax error on every snippet including valid ones.
      const r = spawnSync(bin, ['-m', 'py_compile', f], {
        encoding: 'utf8', shell: process.platform === 'win32',
      });
      return r.status === 0 ? null : (r.stderr || '').trim().split('\n').slice(-2).join(' ').slice(0, 200);
    },
  },
  go: {
    available: () => has('gofmt', ['-h']) || has('go', ['version']),
    check(code, dir, i) {
      // gofmt parses without needing a module, imports to resolve, or a main().
      // Fragments are wrapped so top-level statements are legal.
      const body = /^\s*(package|import|func|type|var|const)\b/m.test(code)
        ? `package p\n\n${code}\n`
        : `package p\n\nfunc _fragment() {\n${code}\n}\n`;
      const f = join(dir, `s${i}.go`);
      writeFileSync(f, body);
      const r = spawnSync('gofmt', ['-e', f], { encoding: 'utf8', shell: process.platform === 'win32' });
      return r.status === 0 ? null : (r.stderr || '').trim().split('\n')[0];
    },
  },
};

let checked = 0, failed = 0, skipped = [];

for (const file of readdirSync(packsDir).filter((f) => f.endsWith('.json'))) {
  const lang = file.replace(/\.json$/, '');
  const pack = JSON.parse(readFileSync(join(packsDir, file), 'utf8'));
  const checker = CHECKERS[lang];

  if (!checker) { skipped.push(`${lang} (no checker — syntax not verified)`); continue; }
  if (!checker.available()) { skipped.push(`${lang} (toolchain not installed)`); continue; }

  const dir = mkdtempSync(join(tmpdir(), `snippet-${lang}-`));
  console.log(`=== ${lang} ===`);
  try {
    let i = 0;
    for (const [slug, entries] of Object.entries(pack)) {
      for (const e of Array.isArray(entries) ? entries : [entries]) {
        const err = checker.check(e.code, dir, i++);
        checked++;
        if (err) { failed++; console.log(`  FAIL  ${slug}: ${err}`); }
        else console.log(`  ok    ${slug}`);
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  console.log('');
}

for (const s of skipped) console.log(`skipped: ${s}`);
console.log('');
console.log(`${checked} snippets checked, ${failed} syntax error(s)`);
process.exit(failed ? 1 : 0);
