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
  /**
   * Optional hand-curated explanation video. Left unset for now — see
   * problemVideoUrl() for why, and for what happens without it.
   */
  video?: string;
}

/** Languages the app has authored content for. */
export const LANGUAGES = [
  { code: 'cpp',  name: 'C++' },
  { code: 'java', name: 'Java' },
  { code: 'py',   name: 'Python' },
  { code: 'c',    name: 'C' },
  { code: 'go',   name: 'Go' },
] as const;

export type LangCode = (typeof LANGUAGES)[number]['code'];

export interface CodeBlock {
  /** Which language this snippet is written in. */
  lang: LangCode;
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
  /** Topic slugs belonging to this phase — drives the progress journey. */
  topics: string[];
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

/**
 * Snippets for one language, falling back to C++ when a language has no
 * snippet for this topic yet. Returning nothing would leave the Code tab blank
 * with no explanation; C++ is the reference implementation, so showing it
 * (clearly labelled by the caller) beats an empty screen.
 */
export const codeFor = (topic: Topic, lang: string): { blocks: CodeBlock[]; fellBack: boolean } => {
  const own = topic.code.filter((c) => c.lang === lang);
  if (own.length) return { blocks: own, fellBack: false };
  return { blocks: topic.code.filter((c) => c.lang === 'cpp'), fellBack: true };
};

/** Human name for a language code. */
export const langName = (code: string) =>
  LANGUAGES.find((l) => l.code === code)?.name ?? code.toUpperCase();

export const allProblems = (): Array<Problem & { topicSlug: string; id: string }> =>
  plan.topics.flatMap((t) =>
    t.problems.map((p) => ({ ...p, topicSlug: t.slug, id: problemId(t.slug, p.name) }))
  );

/**
 * Where "Watch" sends the user for a problem they're stuck on.
 *
 * If a video has been curated for the problem, that wins. Otherwise this
 * returns a YouTube *search* for the problem, scoped by its topic.
 *
 * That fallback is deliberate. Hardcoding 139 specific video ids would mean
 * inventing them — the repo's rule is that a link is verified or it does not
 * ship (see CLAUDE.md), and a dead video is worse than no video. A search URL
 * is honest about what it is, always resolves, and self-heals as better
 * explanations get published. Curate `video` per problem over time and it takes
 * precedence automatically.
 */
export const problemVideoUrl = (
  problem: Pick<Problem, 'name' | 'video'>,
  topicSlug?: string
): string => {
  if (problem.video) return problem.video;
  const topic = topicSlug ? ` ${topicSlug.replace(/-/g, ' ')}` : '';
  const query = `${problem.name}${topic} dsa explained solution`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
};

/** True when the link is a curated video rather than a search fallback. */
export const hasCuratedVideo = (problem: Pick<Problem, 'video'>) => Boolean(problem.video);
