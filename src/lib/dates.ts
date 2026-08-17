// Date helpers for streaks and the heatmap (M6).
//
// The bug this fixes: the store previously derived "today" from
// `new Date().toISOString().slice(0, 10)`, which is UTC. In IST (UTC+5:30) a
// problem solved before 05:30 local time was filed under the *previous* day —
// so a late-night session could break a streak the user had actually kept, and
// the heatmap lit the wrong square. Everything here works in the device's local
// timezone, which is what "a day of practice" means to a person.

/** Local-calendar YYYY-MM-DD, unlike toISOString() which shifts to UTC. */
export const dayKey = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** `n` days before the given local day, as a key. */
export const dayKeyOffset = (days: number, from: Date = new Date()): string => {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return dayKey(d);
};

/** Whole local days between two YYYY-MM-DD keys (b - a). */
export const daysBetween = (a: string, b: string): number => {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  // UTC midnights of local dates — no DST offset can shift the difference.
  const t1 = Date.UTC(ay, am - 1, ad);
  const t2 = Date.UTC(by, bm - 1, bd);
  return Math.round((t2 - t1) / 86400000);
};

/**
 * The streak as it should *display* right now.
 *
 * The stored `currentStreak` is only updated when the user solves something, so
 * after a few idle days it still reads "7" until the next solve resets it. That
 * overstates things. A streak survives today and yesterday (you can still save
 * it today); beyond that it is broken and should read 0.
 */
export const effectiveStreak = (
  storedStreak: number,
  lastActiveDate: string | null,
  today: string = dayKey()
): number => {
  if (!lastActiveDate || storedStreak <= 0) return 0;
  const gap = daysBetween(lastActiveDate, today);
  if (gap < 0) return storedStreak; // clock skew / travel across timezones
  return gap <= 1 ? storedStreak : 0;
};
