# DSA Mastery — Product Spec (v2)

A cross-platform (iOS + Android) DSA learning + tracking app. Not just a
tracker: an authored roadmap, full-depth topic modules, a language primer,
company-wise interview sets, and progress tooling. Dark "paper" UI, red accent.

---

## 0. Decisions locked
- **Platforms:** iOS + Android via Expo (React Native, TypeScript).
- **UI:** Dark "paper" — layered charcoal surfaces, soft shadows, rounded
  cards, generous spacing, a single red accent (`#E5393B` family).
- **First language authored:** C++. Data model is multi-language from day one;
  Java / Python / JS added progressively without schema changes.
- **Topic depth:** Full — concept explainer, pattern notes, complexity,
  tiered problem ladder, and code (in the user's selected language).
- **v1 extra features:** Company-wise problem sets + progress heatmap.
- **Backend:** Supabase (auth + Postgres + RLS + sync).

## Open details — my default calls (veto any)
1. **Content is authored as reviewable JSON first**, then the app is built
   around it. Content is never blocked by app work.
2. **Code execution is out of scope** for v1 — problems deep-link to
   LeetCode/GFG editors. (In-app runner is a big future effort.)
3. **Spaced repetition + pattern library are deferred to v1.1** (kept in the
   data model so nothing needs re-architecting).
4. **Auth in v1** is email/password; Google sign-in later.
5. Offline-first: content ships bundled; progress caches locally and syncs.

---

## 1. The content (the heart of the app)

Authored by me before app-building. Deliverables, in order:

### 1a. DSA Roadmap
A guided path from zero to interview-ready: phases, what to learn in each,
prerequisites, "you're ready when…" checkpoints, and time estimates. This is
the narrative spine the topics hang off.

### 1b. Topic modules (full depth) — per topic:
- **Explainer** — what it is, mental model, when to use it.
- **Patterns** — the recurring problem shapes (e.g. two pointers, sliding
  window) with a reusable template.
- **Complexity** — time/space for every operation, in a quick table.
- **Code** — canonical implementations in the selected language (C++ first).
- **Problem ladder** — tiered: Warmup → Core → Interview → Hard, each linked
  to LeetCode/GFG, tagged by difficulty and company.

Topics: Basics/Patterns, Arrays, Binary Search, Strings, STL/Collections,
Recursion, Backtracking, Sorting & D&C, Linked Lists, Stacks & Queues, Trees,
BST, Heaps, Hashing, Greedy, Graphs, Dynamic Programming, Tries, Bit
Manipulation. (~19 modules.)

### 1c. Language primer ("enough to start DSA in X")
A short curriculum per language: setup, I/O, variables/types, control flow,
functions, arrays, the collections/STL toolkit, common gotchas. C++ first.

### 1d. Company interview sets
Curated problem lists per company (Amazon, Google, Microsoft, Adobe, Meta,
Flipkart, and India-mass-recruiter sets like TCS/Infosys/Wipro), each mapped
onto the topic problems so filters "just work."

### 1e. Cheatsheets
Master complexity table; STL/collection quick-reference.

**Quality bar:** every problem link verified before it ships. No fabricated
URLs. Explanations written to be genuinely useful, not filler.

---

## 2. Screens

Tab bar: **Home · Learn · Practice · Progress · Profile**

- **Home (Today):** current roadmap phase, today's focus, streak, quick jump
  to resume. A "what to do today" card.
- **Learn:** the roadmap + topic modules (explainer/patterns/complexity/code)
  + the language primer. This is the study surface.
- **Practice:** the full problem set. Filters: topic, difficulty, platform,
  **company**, status (unsolved/solved/revisit). Per-problem notes + flag.
- **Progress:** stats, **contribution heatmap**, per-topic completion,
  streak history, problems solved vs target.
- **Profile:** account, **language selector**, daily reminder time, GitHub
  handle, theme, reset.

Auth stack (sign in / up / reset) gates the app.

---

## 3. Data model (Supabase / Postgres)

Content tables are language-aware via a `code_snippets` table keyed by
language, so switching language swaps code without duplicating problems.

```
-- shared authored content (seeded, read-only to users)
roadmap_phases(id, order, title, summary, est_weeks, checkpoint)
topics(id, order, slug, title, explainer_md, patterns_md, complexity_md)
languages(id, code, name)                         -- cpp, java, py, js
code_snippets(id, topic_id, language_id, label, code)   -- topic code per language
lang_primer(id, language_id, order, section_title, body_md, code)
problems(id, topic_id, name, url, platform, difficulty, tier)  -- tier: warmup|core|interview|hard
companies(id, name)
problem_companies(problem_id, company_id)         -- many-to-many

-- per-user (RLS: user_id = auth.uid())
profiles(user_id, display_name, github_handle, language_id, reminder_time, theme)
problem_progress(user_id, problem_id, status, note, updated_at)
topic_progress(user_id, topic_id, completed, updated_at)
day_activity(user_id, date, solved_count)         -- powers the heatmap
streaks(user_id, current, longest, last_active_date)
```

Language switch = change `profiles.language_id`; all code snippets + primer
re-query. No content duplication.

---

## 4. Build order

- **M0 — Content authoring.** Roadmap, 19 topic modules (C++), language
  primer (C++), company sets, cheatsheets → finalized JSON, reviewed by you.
- **M1 — App foundation.** Expo app, dark-paper design system, navigation,
  all screens rendering bundled content offline. Language selector switches
  C++ content (single language present, mechanism proven).
- **M2 — Supabase.** Schema + RLS + seed from the JSON. Wire client.
- **M3 — Auth.** Email/password, session gating, profile creation.
- **M4 — Sync.** Progress/notes/status/heatmap persist + sync; offline cache.
- **M5 — Progress + heatmap + company filters.** Visualizations over real data.
- **M6 — Polish.** Reminders, streak edge cases, empty/loading/error states,
  icon/splash, design QA on both platforms.
- **M7 — Ship.** EAS builds (Android APK + iOS via TestFlight if Apple acct).
- **v1.1+** — Java/Python/JS content, spaced repetition, pattern library,
  bookmarks, snippet vault, mock mode, Google sign-in.

---

## 5. Design system (dark paper)
- Surfaces: 3 charcoal elevations (`#141416`, `#1B1B1E`, `#232327`) with soft
  ambient shadows to imply layered paper.
- Accent: red `#E5393B`, used sparingly (active states, progress, streak).
- Type: one condensed display face for headers, one clean sans/mono for body
  + code. Generous line height, roomy padding.
- Components: rounded cards (16–20px), pill filters, tactile toggles, subtle
  press animations. Code blocks in a monospace on a slightly raised surface.
- Accessibility: legible contrast, large tap targets, dynamic type friendly.

---

## 6. Effort reality
This is a multi-milestone product, not a one-message build. Every milestone is
independently runnable. M0 (content) is the biggest lift and the differentiator
— we do it first and get it genuinely excellent before touching app polish.
