// Types mirror the authored content bundle in assets/data/plan.json.
// The app reads content from this bundle (offline-first); per-user progress
// lives in the Zustand store (M1) and later syncs to Supabase (M4).

export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type Tier = 'warmup' | 'core' | 'interview' | 'hard';
export type Platform = 'LeetCode' | 'GFG';
export type ProblemStatus = 'unsolved' | 'solved' | 'revisit';

export interface Problem {
  name: string;
  url: string;
  platform: Platform;
  difficulty: Difficulty;
  tier: Tier;
  companies: string[];
}

export interface CodeBlock {
  label: string;
  code: string;
}

export interface Topic {
  slug: string;
  order: number;
  title: string;
  explainer_md: string;
  patterns_md: string;
  complexity_md: string;
  code: CodeBlock[];
  problems: Problem[];
}

export interface RoadmapPhase {
  order: number;
  title: string;
  est_weeks: string;
  summary: string;
  learn: string[];
  checkpoint: string;
}

export interface Roadmap {
  title: string;
  subtitle: string;
  intro: string;
  phases: RoadmapPhase[];
}

export interface PrimerSection {
  order: number;
  title: string;
  body_md: string;
  code: string;
}

export interface Primer {
  language: string;
  language_name: string;
  tagline: string;
  intro: string;
  sections: PrimerSection[];
}

export interface PlanBundle {
  roadmap: Roadmap;
  topics: Topic[];
  primers: Record<string, Primer>;
  companies: string[];
  meta: { topicCount: number; problemCount: number; languages: string[] };
}

// Single import point for all authored content.
import bundle from '../../assets/data/plan.json';
export const plan: PlanBundle = bundle as PlanBundle;

// Stable global problem id = "<topicSlug>::<problemName>"
export const problemId = (topicSlug: string, name: string) => `${topicSlug}::${name}`;

export const allProblems = (): Array<Problem & { topicSlug: string; id: string }> =>
  plan.topics.flatMap((t) =>
    t.problems.map((p) => ({ ...p, topicSlug: t.slug, id: problemId(t.slug, p.name) }))
  );
