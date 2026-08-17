// M2 — read authored content back out of Supabase.
//
// Deliberately NOT the app's content source. `src/lib/content.ts` (the bundled
// plan.json) stays the single source screens render from, because offline-first
// is a hard requirement: the app must be fully usable with no signal, and a
// network read can never be on that path.
//
// What this module is for: proving the deployed backend actually holds the same
// content the app ships with. It powers the Backend card on the Profile screen
// and `scripts/verify-supabase.mjs`. From M4 the same client carries per-user
// progress, which *is* worth syncing — content is not, it never changes at runtime.

import { supabase, supabaseEnabled } from './supabase';
import { plan } from './content';

export interface ContentCheckRow {
  table: string;
  remote: number | null;
  expected: number;
  ok: boolean;
}

export interface ContentCheck {
  status: 'disabled' | 'ok' | 'mismatch' | 'error';
  rows: ContentCheckRow[];
  sampleTopic?: string;
  error?: string;
}

/** Row counts the bundle says the backend should hold. */
export const expectedCounts = (): Record<string, number> => ({
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
});

/**
 * Compare every content table against the bundle. Never throws — a backend that
 * is down or unreachable reports `error` and the app carries on offline.
 */
export async function checkRemoteContent(): Promise<ContentCheck> {
  if (!supabaseEnabled || !supabase) {
    return { status: 'disabled', rows: [] };
  }

  const expected = expectedCounts();
  const rows: ContentCheckRow[] = [];

  try {
    for (const [table, want] of Object.entries(expected)) {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (error) return { status: 'error', rows, error: `${table}: ${error.message}` };
      rows.push({ table, remote: count ?? 0, expected: want, ok: count === want });
    }

    // Counts alone can pass on empty text columns — read one real row too.
    const { data, error } = await supabase
      .from('topics')
      .select('title, explainer_md')
      .eq('slug', 'arrays')
      .single();

    if (error) return { status: 'error', rows, error: `sample topic: ${error.message}` };
    if (!data?.explainer_md || data.explainer_md.length < 200) {
      return { status: 'mismatch', rows, sampleTopic: data?.title, error: 'sample explainer looks truncated' };
    }

    return {
      status: rows.every((r) => r.ok) ? 'ok' : 'mismatch',
      rows,
      sampleTopic: data.title,
    };
  } catch (e) {
    return { status: 'error', rows, error: e instanceof Error ? e.message : String(e) };
  }
}
