// Roadmap progress — which phase the user is in, and how far through each.
//
// Today and Learn both answer "where am I?". They used to compute it two
// different ways (Today from the share of topics marked done, Learn from the
// phase -> topic mapping), so the two screens could name different phases at
// the same moment. Both now read from here.

import { plan, problemId, Topic } from './content';
import type { ProblemStatus } from './content';

export interface PhaseProgress {
  order: number;
  title: string;
  est_weeks: string;
  summary: string;
  checkpoint: string;
  topics: Topic[];
  solved: number;
  problemCount: number;
  topicsDone: number;
  /** 0-100, weighted 70% problems solved + 30% topics marked complete. */
  pct: number;
  done: boolean;
}

export function phaseProgress(
  problemStatus: Record<string, ProblemStatus>,
  topicDone: Record<string, boolean>
): { phases: PhaseProgress[]; currentIdx: number; overall: number } {
  const phases = plan.roadmap.phases.map((ph) => {
    const topics = ph.topics
      .map((slug) => plan.topics.find((t) => t.slug === slug))
      .filter((t): t is Topic => Boolean(t));

    const problems = topics.flatMap((t) => t.problems.map((p) => problemId(t.slug, p.name)));
    const solved = problems.filter((id) => problemStatus[id] === 'solved').length;
    const topicsDone = topics.filter((t) => topicDone[t.slug]).length;

    const pct = problems.length
      ? Math.round(((solved / problems.length) * 0.7 + (topicsDone / topics.length) * 0.3) * 100)
      : 0;

    return {
      order: ph.order,
      title: ph.title,
      est_weeks: ph.est_weeks,
      summary: ph.summary,
      checkpoint: ph.checkpoint,
      topics,
      solved,
      problemCount: problems.length,
      topicsDone,
      pct,
      done: pct >= 100,
    };
  });

  // The first unfinished phase is "now". -1 means every phase is complete.
  const currentIdx = phases.findIndex((p) => !p.done);
  const overall = phases.length
    ? Math.round(phases.reduce((n, p) => n + p.pct, 0) / phases.length)
    : 0;

  return { phases, currentIdx, overall };
}
