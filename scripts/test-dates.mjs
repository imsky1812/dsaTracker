#!/usr/bin/env node
// Tests for the streak/day logic (src/lib/dates.ts).
//
//   npm run test:dates
//
// Run under a non-UTC timezone to prove the fix, e.g.
//   TZ=Asia/Kolkata node scripts/test-dates.mjs
// The suite re-executes itself under IST if TZ is not already set, because the
// bug being guarded against is invisible in UTC.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Re-run under IST so the UTC-vs-local distinction actually shows up.
if (!process.env.DATES_TZ_SET) {
  const res = spawnSync(process.execPath, [import.meta.filename], {
    stdio: 'inherit',
    env: { ...process.env, TZ: 'Asia/Kolkata', DATES_TZ_SET: '1' },
  });
  process.exit(res.status ?? 1);
}

const source = readFileSync(join(root, 'src/lib/dates.ts'), 'utf8')
  .replace(/: Date = new Date\(\)/g, ' = new Date()')
  .replace(/: string = dayKey\(\)/g, ' = dayKey()')
  .replace(/\(d: Date\)/g, '(d)')
  .replace(/\(days: number, from = new Date\(\)\)/g, '(days, from = new Date())')
  .replace(/\(a: string, b: string\)/g, '(a, b)')
  .replace(/storedStreak: number,/, 'storedStreak,')
  .replace(/lastActiveDate: string \| null,/, 'lastActiveDate,')
  .replace(/\): string =>/g, ') =>')
  .replace(/\): number =>/g, ') =>');

const { dayKey, dayKeyOffset, daysBetween, effectiveStreak } = await import(
  'data:text/javascript;base64,' + Buffer.from(source).toString('base64')
);

let failures = 0;
const eq = (actual, expected, label) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${ok ? '' : ` — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`}`);
};

console.log(`dates.ts  (TZ=${process.env.TZ})\n`);

// --- the actual bug: 02:00 IST is still the previous day in UTC ---
{
  const lateNight = new Date('2026-08-17T02:00:00+05:30'); // 20:30 UTC on the 16th
  eq(dayKey(lateNight), '2026-08-17', 'a 2am local session counts as today, not yesterday');
  eq(
    lateNight.toISOString().slice(0, 10),
    '2026-08-16',
    'sanity: the old UTC-based approach really did report the previous day'
  );
}

// --- dayKey basics ---
{
  eq(dayKey(new Date(2026, 0, 5)), '2026-01-05', 'pads single-digit month and day');
  eq(dayKey(new Date(2026, 11, 31)), '2026-12-31', 'end of year');
}

// --- offsets ---
{
  const d = new Date(2026, 7, 17);
  eq(dayKeyOffset(-1, d), '2026-08-16', 'yesterday');
  eq(dayKeyOffset(1, d), '2026-08-18', 'tomorrow');
  eq(dayKeyOffset(-1, new Date(2026, 7, 1)), '2026-07-31', 'crosses a month boundary');
  eq(dayKeyOffset(-1, new Date(2026, 0, 1)), '2025-12-31', 'crosses a year boundary');
  eq(dayKeyOffset(-1, new Date(2028, 2, 1)), '2028-02-29', 'handles a leap day');
}

// --- daysBetween ---
{
  eq(daysBetween('2026-08-16', '2026-08-17'), 1, 'consecutive days');
  eq(daysBetween('2026-08-17', '2026-08-17'), 0, 'same day');
  eq(daysBetween('2026-08-17', '2026-08-16'), -1, 'negative when going backwards');
  eq(daysBetween('2026-07-31', '2026-08-01'), 1, 'across a month boundary');
  eq(daysBetween('2026-08-01', '2026-08-31'), 30, 'a long gap');
}

// --- effectiveStreak: the display decay ---
{
  eq(effectiveStreak(7, '2026-08-17', '2026-08-17'), 7, 'solved today keeps the streak');
  eq(effectiveStreak(7, '2026-08-16', '2026-08-17'), 7, 'solved yesterday keeps it — still saveable today');
  eq(effectiveStreak(7, '2026-08-15', '2026-08-17'), 0, 'a missed day breaks it');
  eq(effectiveStreak(7, '2026-06-01', '2026-08-17'), 0, 'a long absence breaks it');
  eq(effectiveStreak(0, '2026-08-17', '2026-08-17'), 0, 'zero stays zero');
  eq(effectiveStreak(5, null, '2026-08-17'), 0, 'no activity yet means no streak');
  eq(effectiveStreak(5, '2026-08-18', '2026-08-17'), 5, 'a future date (travel/clock skew) does not wipe the streak');
}

console.log('');
if (failures) {
  console.error(`${failures} date test(s) FAILED.`);
  process.exit(1);
}
console.log('All date tests passed.');
