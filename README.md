# DSA Mastery

An offline-first DSA learning and tracking app for Android and iOS. Not just a
tracker — it ships an authored roadmap, full-depth topic modules, primers for five languages,
and 139 company-tagged interview problems, with the progress system built around
them.

Built with Expo + React Native + TypeScript, backed by Supabase.

---

## 📱 Download

<table>
<tr>
<td width="220" align="center">
<img src="docs/install-qr.png" width="200" alt="QR code linking to the DSA Mastery Android install page">
<br><sub><b>Scan to install</b></sub>
</td>
<td>

**[⬇ Download the APK directly](https://expo.dev/artifacts/eas/EnSZILV4fPNDpwdUIPWEap0kNWZfgrcrLNS15N5USZI.apk)**

or open the **[install page](https://expo.dev/accounts/imsky1812/projects/dsa-mastery/builds/896e07ac-20e2-4a56-aa50-3a652421adb5)**
on your phone.

1. Tap the APK to download it.
2. Allow *"Install unknown apps"* for your browser when Android asks.
3. Open the downloaded file and install.

Android only. Every build is signed with the same EAS-managed keystore, so a
new version installs straight over the old one — no uninstall needed.

</td>
</tr>
</table>

> The direct artifact link belongs to one specific build and will not last
> forever; the install page is the durable reference. To cut a fresh APK, see
> [Building an APK](#building-an-apk).

iOS builds need an Apple Developer account ($99/yr). The codebase is
cross-platform and ready for it.

---

## What it's for

The app is the study surface *and* the progress system for someone grinding DSA
for placements and interviews.

**Learn the material.** An 8-phase roadmap takes you from "still fighting
syntax" to interview-ready. It reads as a journey rather than a table of
contents: each stage reports real completion from the topics assigned to it, a
rail fills in behind you, and exactly one stage is marked **Now** and opens to
show what's left in it. Nineteen topic modules each carry a written explainer,
the patterns that topic is really about, a complexity table, idiomatic C++, and
a problem ladder tiered *warmup → core → interview → hard*. Each of five languages —
C++, Java, Python, C and Go — gets a ten-section primer and its own snippets
per topic, switchable from Profile.

**Practise deliberately.** All 139 problems in one list, filterable by status,
difficulty, platform, company, and topic. Every link was verified — no
fabricated URLs. Tap a problem to open it on LeetCode or GFG; tap its circle to
cycle *unsolved → solved → revisit*; keep a note per problem for the approach,
the gotcha, the complexity. Stuck on one? **Watch** opens a video explanation
for that exact problem (see [Explanation videos](#explanation-videos)).

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
| **Content** | 8-phase roadmap · 19 topic modules · 139 verified problems · 124 code samples |
| **Languages** | C++, Java, Python, C, Go — a 10-section primer each, snippets per topic |
| **Companies** | Amazon, Google, Microsoft, Meta, Adobe, Uber, LinkedIn, Flipkart, TCS, Infosys, Wipro |
| **Tracking** | contribution heatmap · streaks · per-problem notes · revisit flags · topic completion |
| **Filtering** | status · difficulty · platform · company · topic |
| **Accounts** | email/password sign-up, sign-in, password reset — or use it with no account at all |
| **Sync** | progress mirrors to Supabase and reconciles across devices |
| **Reminders** | one local daily notification at a time you choose |
| **Stuck?** | 42 problems have a verified explanation video; the rest fall back to a scoped search |
| **Roadmap** | a progress journey — per-stage completion, one stage marked *Now* |

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
   - `supabase/migrations/002_phase_topics_and_video.sql`
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

Each roadmap phase declares the topics that belong to it (`topics` in
`roadmap.json`). The build script enforces that every topic is assigned to
**exactly one** phase — unmapped, unknown, or duplicated slugs fail the build —
because the journey view would otherwise quietly hide or double-count a topic.

### Explanation videos

Every problem has a **Watch** link, but no video ids are hardcoded. A problem
may carry an optional `video`; when it's absent — which is currently always —
the app builds a YouTube **search** from the problem name and its topic:

```
https://www.youtube.com/results?search_query=Two%20Sum%20arrays%20dsa%20explained%20solution
```

This is deliberate. Hardcoding 139 specific video ids would mean inventing them,
which is exactly the fabricated URL this repo forbids, and a dead video is worse
than no video. A search always resolves, needs no maintenance, and improves on
its own as better explanations get published.

To curate one, set `video` on the problem in `src/data/topics/*.json` and re-run
`npm run content`. It takes precedence automatically, and the generator rejects
anything that isn't a real `youtube.com/watch?v=` or `youtu.be/` link.

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
for Play.

After a build, point the README's QR at it:

```bash
npm run qr -- https://expo.dev/accounts/<you>/projects/dsa-mastery/builds/<id>
```

That regenerates `docs/install-qr.png`, then **decodes the PNG it just wrote**
and refuses to leave it in place unless it scans back to exactly that URL. A QR
in a README is a link people follow without being able to read it, so it should
never be an image nobody has verified.

Icons and splash are generated too:

```bash
npm run icons   # icon / adaptive-icon / splash / favicon
```

`scripts/make-icons.mjs` is a small PNG encoder over `zlib` — deliberately no
`sharp`/`canvas` dependency, so there's no native build step to break on CI.

---

## Design

Warm, soft and light — one palette, tuned once.

- The ground is a warm sand (`#F6F3ED`), not white. Paper you'd want to work on
  for hours, rather than a spreadsheet.
- A single terracotta accent (`#D2593C`) carries every primary action; a muted
  sage marks completion and a warm amber marks in-progress. Nothing saturated.
- Text is a deep warm brown (`#2A2420`) rather than black, so it belongs to the
  ground instead of punching through it.
- Generous radii. Cards are soft; anything interactive is a pill or a circle.
  The tab bar floats as a pill with a filled circle behind the active icon.
- Type is Archivo (display/heading/body) + JetBrains Mono (code/labels).
- Icons are Feather — a single-weight line set that ships with Expo.
- The contribution heatmap is the signature element, and the app icon is that
  same grid.

There is one palette by decision, not omission: a single set means every
surface, shadow and contrast pair is actually checked, rather than two
half-tuned ones. Colour is still read through `useColors()` /
`useThemedStyles()` (`src/theme/theme.ts`) and styles are built inside
components rather than at module scope, so adding a second palette later is a
token change rather than a rewrite. Never hardcode a hex in a screen.

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
| M6 Polish | reminders, local-timezone streaks, icon/splash, warm light theme |
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
