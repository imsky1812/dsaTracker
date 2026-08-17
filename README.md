# DSA Mastery

A cross-platform (iOS + Android) DSA learning and tracking app built with Expo +
React Native + TypeScript. Authored roadmap, 19 full-depth topic modules in C++,
a C++ language primer, 139 curated + company-tagged interview problems, progress
tracking with a contribution heatmap, and a backend-ready architecture.

## What's in this build (M0 + M1 complete)

- **M0 — Content**: all authored and bundled in `assets/data/plan.json`
  - 8-phase roadmap (zero → interview-ready)
  - 19 topic modules, each with explainer, patterns, complexity table, C++ code, and a tiered problem ladder (warmup → core → interview → hard)
  - C++ language primer (10 sections)
  - 139 problems, every link verified, tagged by difficulty, platform, and company (Amazon, Google, Microsoft, Meta, Adobe, Uber, LinkedIn, Flipkart, TCS, Infosys, Wipro)
- **M1 — App foundation** (runnable now, fully offline):
  - Five screens: Today, Learn, Practice, Progress, Profile
  - Topic detail with tabbed explainer / patterns / complexity / code / problems
  - Dark "paper" design system (layered charcoal surfaces, red accent, Archivo + JetBrains Mono)
  - Progress persists on-device (Zustand + AsyncStorage), works with no signal
  - Contribution heatmap, streak tracking, per-problem notes, revisit flags, full filtering (topic / difficulty / platform / company / status)
  - Language selector wired (C++ live; Java/Python/JS slots ready)
- **M2 groundwork**: `supabase/schema.sql` (tables + row-level security) and `supabase/seed.sql` (generated from the real content) are ready to run.

## Run it

You need Node.js and the **Expo Go** app on your phone.

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS). The app loads
fully offline — no backend or accounts required for this build.

`npm install` runs clean with native scripts enabled. (It used to fail on
`react-native-screens@3.31.0`, whose published `postinstall` calls `bob`, a tool
consumers don't have. Pinned to 3.31.1, which Expo SDK 51 expects anyway.)

## Backend setup (M2)

```bash
cp .env.example .env        # then fill in your Supabase URL + anon key
npm run verify:supabase     # checks the deployed content against the bundle
```

In the Supabase SQL editor run `supabase/schema.sql`, then `supabase/seed.sql`.
Both files are safe to re-run. With `.env` populated, `supabaseEnabled` flips
true and a **Backend** card appears on the Profile screen showing the same check
live in the app.

Content still renders from the bundled `assets/data/plan.json`, not over the
network — offline-first is a hard requirement, and per-user progress (M4) is the
part that actually syncs.

## Editing content

`src/data/*.json` is the source of truth. After any edit:

```bash
npm run content         # regenerates assets/data/plan.json + supabase/seed.sql
npm run content:check   # CI-style check that both outputs are current
```

The generator validates every problem URL's shape and rejects a problem name
pointing at two different URLs. It cannot confirm a link resolves, so newly
added problems still need a manual check.

## Project structure

```
app/                      # Expo Router screens
  _layout.tsx             # root: font loading + splash
  (tabs)/
    _layout.tsx           # tab bar (Today/Learn/Practice/Progress/Profile)
    index.tsx             # Today
    learn.tsx             # roadmap + topics + language primer
    topic/[slug].tsx      # topic detail (explainer/patterns/complexity/code/problems)
    practice.tsx          # full problem list + filters + notes
    progress.tsx          # heatmap + stats + per-topic completion
    profile.tsx           # language, reminder, github, reset
src/
  theme/tokens.ts         # dark-paper design system
  lib/content.ts          # content types + loader
  lib/supabase.ts         # client (inert until keys added)
  store/progress.ts       # Zustand + AsyncStorage persistence
  components/ui.tsx        # Card, Pill, Markdown, CodeBlock, ProgressRing
  components/Heatmap.tsx   # signature contribution grid
  data/                   # authored source JSON (topics, roadmap, primer)
assets/data/plan.json     # bundled content the app imports
supabase/
  schema.sql              # tables + RLS
  seed.sql                # content seed (generated)
```

## Status

M0–M6 complete. M7 (EAS build) is the last step.

| | |
|---|---|
| M0 Content | 19 topics, 139 verified problems, C++ primer |
| M1 App | five screens, offline-first, heatmap + streaks |
| M2 Supabase | schema + seed deployed, content verified |
| M3 Auth | email/password, `(auth)` gate, local-only mode |
| M4 Sync | write-through queue, last-write-wins, offline-safe |
| M5 Progress | per-company breakdown → filtered practice |
| M6 Polish | daily reminder, local-timezone streaks, icon/splash |
| M7 Ship | `eas build -p android --profile preview` |

## Tests

```bash
npm test                  # merge logic + date/streak logic + content freshness
npx tsc --noEmit          # typecheck
```

`scripts/verify-*.mjs` run against the live Supabase project (they create
throwaway accounts — delete them under Authentication → Users afterwards).

## Building an APK

`.env` is gitignored, so it is **not** uploaded to a cloud build. Register the
two values as EAS secrets once:

```bash
npx eas-cli login
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "<url>" --type string
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<anon key>" --type string
npx eas-cli build -p android --profile preview
```

The `preview` profile emits an installable APK. iOS device builds need an Apple
Developer account ($99/yr).

## Notes on the content

Every problem URL was verified before shipping — no fabricated links. Code is
idiomatic, canonical C++. The data model is multi-language from day one
(code lives keyed by language), so adding Java/Python/JS later needs no
re-architecting.
