# DSA Mastery

An offline-first DSA learning and tracking app for Android and iOS. Not just a
tracker — it ships an authored roadmap, full-depth topic modules, a C++ primer,
and 139 company-tagged interview problems, with the progress system built around
them.

Built with Expo + React Native + TypeScript, backed by Supabase.

---

## 📱 Download

**[Install the Android APK](https://expo.dev/artifacts/eas/Nzl8y0px4Xm6T0__cDaqsTYz_ftuk1WtHzNNg9kLAuY.apk)**

Or open the [build page](https://expo.dev/accounts/imsky1812/projects/dsa-mastery/builds/8981ab2b-ee37-4728-8809-07427f74084d)
on your phone to scan a QR code.

**Installing:** tap the APK, and allow *"Install unknown apps"* for your browser
when Android prompts. Every build is signed with the same EAS-managed keystore,
so new versions install straight over the old one.

> Direct artifact links are tied to a specific build and are not permanent — the
> build page is the durable reference. To produce a fresh APK, see
> [Building an APK](#building-an-apk).

iOS builds need an Apple Developer account ($99/yr); the codebase is
cross-platform and ready for it.

---

## What it's for

The app is the study surface *and* the progress system for someone grinding DSA
for placements and interviews.

**Learn the material.** An 8-phase roadmap takes you from "still fighting
syntax" to interview-ready, with a stated checkpoint for each phase so you know
when to move on. Nineteen topic modules each carry a written explainer, the
patterns that topic is really about, a complexity table, idiomatic C++, and a
problem ladder tiered *warmup → core → interview → hard*. A ten-section C++
primer covers the language itself.

**Practise deliberately.** All 139 problems in one list, filterable by status,
difficulty, platform, company, and topic. Every link was verified — no
fabricated URLs. Tap a problem to open it on LeetCode or GFG; tap its circle to
cycle *unsolved → solved → revisit*; keep a note per problem for the approach,
the gotcha, the complexity.

**See where you actually are.** A GitHub-style contribution heatmap, streaks
that respect your local timezone, and breakdowns by difficulty, by topic, and by
company. The company view is the placement-prep lens: tap *Amazon* and land in a
practice list filtered to Amazon's tagged set.

**Keep it wherever you are.** Progress syncs to your account across devices, and
the entire app keeps working with no signal — see [Offline-first](#offline-first).

---

## Features

| | |
|---|---|
| **Content** | 8-phase roadmap · 19 topic modules · 10-section C++ primer · 139 verified problems · 48 code samples |
| **Companies** | Amazon, Google, Microsoft, Meta, Adobe, Uber, LinkedIn, Flipkart, TCS, Infosys, Wipro |
| **Tracking** | contribution heatmap · streaks · per-problem notes · revisit flags · topic completion |
| **Filtering** | status · difficulty · platform · company · topic |
| **Accounts** | email/password sign-up, sign-in, password reset — or use it with no account at all |
| **Sync** | progress mirrors to Supabase and reconciles across devices |
| **Reminders** | one local daily notification at a time you choose |
| **Theming** | light and dark, following your phone's setting |

---

## Offline-first

This is a hard requirement, not a nice-to-have — it shapes the architecture.

- **Content is bundled, never fetched.** Every topic, problem and code sample
  ships inside the app. Nothing you read requires a network.
- **Writes never wait on the network.** Marking a problem solved updates local
  state synchronously and queues a background upload. The queue is persisted, so
  it survives force-quits and drains when you're back online.
- **No account required.** Signing up needs a network, so someone with neither
  can still choose *"Continue without an account"* and use everything. When they
  do sign in later, the local work is merged up rather than discarded.
- **Progress is keyed by content, not by database ids.** A problem's identity is
  `"<topic slug>::<problem name>"`, derivable from bundled content, so a fresh
  install can record progress offline with no lookup round-trip.
- **Conflicts resolve last-write-wins** on `updated_at`. Day counts merge by
  `max`, never by sum, so re-syncing can't inflate the heatmap.

---

## Running it locally

Requires Node.js and the **Expo Go** app on your phone.

```bash
npm install
npx expo start
```

Scan the QR with Expo Go (Android) or the Camera app (iOS).

Without a `.env` the app runs fully local — no backend, no accounts, all content
available. That's a legitimate way to use it.

---

## Backend setup

Only needed for accounts and cross-device sync.

1. Create a free [Supabase](https://supabase.com/dashboard) project.
2. In the SQL editor run, in order:
   - `supabase/schema.sql` — tables, row-level security, on-signup trigger
   - `supabase/seed.sql` — the content
   - `supabase/migrations/001_progress_natural_keys.sql`
3. Turn **off** Authentication → Providers → Email → *Confirm email* (otherwise
   sign-up returns no session and first login is blocked by an email round-trip).
4. Wire up your keys:

```bash
cp .env.example .env      # fill in EXPO_PUBLIC_SUPABASE_URL + ..._ANON_KEY
npm run verify:supabase   # checks all 8 content tables against the bundle
```

All SQL files are safe to re-run. With `.env` populated, `supabaseEnabled` flips
true, auth activates, and a **Backend** card on the Profile screen runs the same
check live in the app.

The anon key is a public client-side key and is safe to ship in the binary —
row-level security is what protects user data. The `service_role` key must never
appear in `.env` or the repo.

---

## Editing content

`src/data/*.json` is the source of truth. The pipeline is:

```
src/data/*.json  →  assets/data/plan.json  →  supabase/seed.sql
```

```bash
npm run content         # regenerate both outputs
npm run content:check   # CI-style check that they're current
```

The generator validates each problem URL's shape and rejects a problem name
pointing at two different URLs. It **cannot** confirm a link resolves, so any
newly added problem still needs a manual check before it lands.

The data model is multi-language from day one — code is keyed by language — so
adding Java/Python/JS means adding snippets and a primer, never duplicating
topics or problems.

---

## Tests

```bash
npm test              # 38 tests: merge logic, date/streak logic, content freshness
npm run test:merge    # reconciliation (17)
npm run test:dates    # local-day + streak decay (21), re-run under TZ=Asia/Kolkata
npx tsc --noEmit      # typecheck — must stay clean
```

The two tested modules — `src/lib/merge.ts` and `src/lib/dates.ts` — are pure
functions with no React Native or Supabase imports, precisely so they can be
tested without a device. They're also where a bug is most expensive: both fail
*silently*, by losing progress or mis-drawing a streak rather than throwing.

Three further scripts exercise the **live** Supabase project end to end. They
create throwaway accounts — delete them under Authentication → Users afterwards.

```bash
npm run verify:supabase          # content tables match the bundle + RLS holds
npm run verify:auth  <email>     # signup → trigger rows → RLS isolation → signin
npm run verify:sync  <email>     # natural-key writes, FK integrity, last-write-wins
```

---

## Building an APK

`.env` is gitignored and therefore **not** uploaded to a cloud build. Register
the two values as EAS secrets once:

```bash
npx eas-cli login
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "<url>" --type string
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<anon key>" --type string

npx eas-cli build -p android --profile preview
```

The `preview` profile emits an installable APK; `production` emits an app bundle
for Play. Icons and splash screens are generated, not hand-drawn:

```bash
npm run icons   # writes icon / adaptive-icon / splash (light + dark) / favicon
```

`scripts/make-icons.mjs` is a small PNG encoder over `zlib` — deliberately no
`sharp`/`canvas` dependency, so there's no native build step to break on CI.

---

## Design

Two palettes, one shape language. The app follows your phone's colour scheme.

- **Light** is a warm off-white (`#F4F2EE`) rather than pure white — paper, not
  a spreadsheet — with its own heat ramp so an empty day reads as empty.
- **Dark** is layered charcoal (`#0E0E10` → `#17171A` → `#202024`).
- A single red accent, used sparingly.
- Generous radii; anything interactive is a pill or a circle. The tab bar floats
  as a pill with a filled circle behind the active icon.
- Type is Archivo (display/heading/body) + JetBrains Mono (code/labels).
- The contribution heatmap is the signature element.

Shape and typography are deliberately **not** themed — a card has the same
radius and rhythm in both modes; only colour moves. All tokens live in
`src/theme/tokens.ts`; screens read them through `useColors()` /
`useThemedStyles()` in `src/theme/theme.ts`. Never hardcode a hex in a screen.

---

## Project structure

```
app/                        # Expo Router
  _layout.tsx               # fonts, splash, auth gate, sync + reminder startup
  (auth)/                   # sign-in / sign-up / reset
  (tabs)/
    _layout.tsx             # floating pill tab bar
    index.tsx               # Today — phase, focus, streak, progress
    learn.tsx               # roadmap · topics · language primer
    practice.tsx            # full problem list + filters + notes
    progress.tsx            # heatmap + difficulty/company/topic breakdowns
    profile.tsx             # account, sync, language, reminder, reset
  topic/[slug].tsx          # topic detail (outside the tab group — it's a
                            #   pushed detail screen, not a tab)
src/
  theme/tokens.ts           # light + dark palettes, spacing, radius, type
  theme/theme.ts            # useColors / useThemedStyles / useIsLight
  lib/content.ts            # content types, loader, problemId(), allProblems()
  lib/supabase.ts           # client — inert until env keys exist
  lib/auth.ts               # auth actions with humanized errors
  lib/sync.ts               # push/pull primitives (never throw)
  lib/syncManager.ts        # queue driver — debounce, backoff, flush triggers
  lib/merge.ts              # PURE reconciliation logic (tested)
  lib/dates.ts              # local-day keys + streak decay (tested)
  lib/notifications.ts      # daily reminder scheduling
  store/progress.ts         # Zustand + AsyncStorage — the store screens use
  store/session.ts          # session + local-only mode
  components/               # ui, auth-ui, Heatmap
  data/                     # authored source JSON
assets/data/plan.json       # bundled content the app imports
scripts/                    # content pipeline, verifiers, tests, icon generator
supabase/                   # schema, seed, migrations
```

---

## Stack

Expo SDK 51 · React Native 0.74.5 · TypeScript (strict) · Expo Router ·
Zustand + AsyncStorage · Supabase (Postgres + Auth + RLS) · EAS Build

## Status

All milestones complete — content, app, backend, auth, sync, progress views,
polish, and a shipping Android build.

| | |
|---|---|
| M0 Content | 19 topics, 139 verified problems, C++ primer |
| M1 App | five screens, offline-first, heatmap + streaks |
| M2 Supabase | schema + seed deployed and verified |
| M3 Auth | email/password, route gate, local-only mode |
| M4 Sync | write-through queue, last-write-wins, offline-safe |
| M5 Progress | per-company breakdown → filtered practice |
| M6 Polish | reminders, local-timezone streaks, icon/splash, theming |
| M7 Ship | Android APK via EAS |

### Known limitations

- **iOS is unbuilt.** The code is cross-platform; it needs an Apple Developer
  account to produce an installable build.
- **Java / Python / JS are stubs.** The data model supports them; the content
  isn't authored yet, so they show as *soon* in the language picker.
- **Amazon is tagged on 137 of 139 problems**, which makes that particular
  company filter close to a no-op. A content-tagging call, not a bug.
- **`SCHEDULE_EXACT_ALARM`** is requested in `app.json`. Google Play restricts
  it and will ask for justification; the daily reminder doesn't need exact
  timing, so drop it before any Play submission. Harmless for a sideloaded APK.
