# MOMENTUM

AI-powered behavioral consistency engine with real-money gamification.
Working web implementation of the MOMENTUM PRD.

## What's implemented

All design surfaces from the PRD that can be built in code without
external integrations live behind real APIs and persistence. The
external-service edges (Stripe/Swish, PSD2, HealthKit, GPS verification,
email, voice TTS, scheduled cron) are isolated behind named modules
with `TODO(integration:*)` comments documenting exactly what each one
needs.

### Features (52 routes, 9 server modules, 18 lib modules)

- **Points economy** (PRD §4): 4 stake tiers, 20 capped behaviors,
  streak multipliers (1.2/1.4/1.6×), 3× comeback bonus with 14-day
  cooldown, month-end bonuses, Category A/B redemption split,
  first-week 1.5× onboarding bonus, event multipliers compounding with
  track + seasonal multipliers.
- **ACE** (Claude API): tone-constrained system prompt, brain-dump
  categorizer, accountability-call replies. Local deterministic
  fallback when `ANTHROPIC_API_KEY` is unset.
- **Decay detection**: 28-day baseline vs 7-day rolling, 3/5/7/10
  escalation tiers, automatic Rescue Week.
- **Onboarding** (§9): 7 conversational questions, charity last,
  first-week comp, tier auto-selected from stake.
- **Daily architecture**: morning energy + commitment + 3 priorities;
  evening close-out always awards show-up points.
- **Brain Dump → fan-out**: action items, curiosity queue, wishlist
  (24-h cooling), anxious-acknowledged.
- **Experience Vault + Wishlist**: curated catalog + user-added items
  with cooling and category-B penalty.
- **Bonus events**: Double Points Hour, Challenge Drop, Rescue Week,
  Seasonal Events. Manual triggers in `/events`; production runs from
  a cron.
- **Challenge Tracks**: 5 rotating 3-week themed programs with track
  multiplier on enrolled behaviors.
- **Community Challenges**: opt-in anonymous leaderboard with
  participation count.
- **Level system**: 1–50 lifetime-points levels with unlocks at
  5/10/15/20/25/30/40/50.
- **Accountability Partner**: invite + verify (stub), weekly digest
  preview, 1,000-pt one-tap boost.
- **AI Accountability Call**: 5-min voice check-in using the browser's
  Web Speech API (recognition + synthesis); awards 1,500 bonus pts.
- **Pattern Insight Reports**: monthly behavioral summaries via ACE
  (or local fallback), backed by `monthly_reports` table.
- **Mood + medication logs**: private, surfaced as 12-week heatmap.
- **Health integration**: provider connect/disconnect, manual sample
  entry. Wire `apple_health` / `google_fit` / `garmin` / `fitbit` on
  the mobile shell.
- **Bank integration**: PSD2 connect/disconnect, simulated incoming
  transactions for the impulse interception UX. Cancelling a
  detected delivery transaction awards the `no_delivery_today` points
  immediately.
- **Stake & Payments**: Swish/Stripe stub `chargeMonthlyStake` +
  `disburseToCharity`. Yearly summary (charged / recovered / donated).
- **Settings, History (activity + mood heatmap), Level page,
  Curiosity Queue, Action Items, More-page directory.**
- **Anti-gaming verification stubs**: GPS-bounded gym verification,
  food-photo verification (vision), manual-step daily cap (500 pts).

### Tests

46 Vitest cases across the points engine, onboarding, levels, event
multiplier composition, seasons, heatmap, verification stubs,
accountability digest, payments helpers, and the first-week multiplier
integration in `awardForBehavior`.

```bash
npm install
npm run test
npm run build
npm run dev    # http://localhost:3000
```

A demo user (`Saeed`, Standard tier, 1000 SEK stake, Läkare Utan Gränser)
is seeded on first boot. Visit `/onboarding` to re-run the conversational
intake.

## What's not implemented (TODO markers in code)

Every external-integration surface is gated behind a module that
exports a stubbed function with a `TODO(integration:*)` comment
listing the production work:

| Module | TODO key | What's missing |
|---|---|---|
| `lib/payments.ts` | `swish` | Getswish API: `POST /api/v2/paymentrequests`, polling/callbacks. |
| `lib/payments.ts` | `stripe` | Stripe Subscriptions, Elements at onboarding, webhook handler. |
| `lib/payments.ts` | `disbursement` | Bankgirot / SEPA payout integration. |
| `lib/bank.ts` | `tink` | Tink Link aggregation + transaction polling / webhooks. |
| `lib/bank.ts` | `aiia` | Alternative Nordic PSD2 provider. |
| `lib/bank.ts` | `tink_webhook` | Signature verification on incoming webhook. |
| `lib/health.ts` | `apple_health` | HealthKit wrapper in the iOS shell. |
| `lib/health.ts` | `google_fit` | Health Connect on Android. |
| `lib/health.ts` | `garmin/fitbit/polar` | Vendor REST APIs. |
| `lib/verification.ts` | `gps` | Bounded-box check against a Swedish gym dataset. |
| `lib/verification.ts` | `food_photo` | Claude vision call on uploaded meal photos. |
| `lib/verification.ts` | `partner_verify` | Tokenized email verification. |
| `lib/accountability.ts` | `email` | Resend / Postmark scheduled digest. |
| `lib/call/route.ts` | `tts` | ElevenLabs / Cartesia for server-side TTS. |
| `app/api/events/route.ts` | `scheduler` | Inngest / Trigger.dev / Vercel Cron. |
| `app/api/onboarding/route.ts` | `cron` | Monthly stake-charge scheduler. |

Mobile shells (iOS, Android) are out of scope of this web build but the
business logic is provider-agnostic and ready to back a React Native
client.

## Environment

```
ANTHROPIC_API_KEY=         # optional — ACE uses local fallback otherwise
ACE_MODEL=claude-sonnet-4-6
MOMENTUM_DB_PATH=          # defaults to ./momentum.db
```

## Layout

```
app/
  page.tsx                  Dashboard (decay + events + intercepts + level)
  more/                     Directory page (links to all 17 surfaces)
  onboarding/               7-question conversational intake
  morning/ evening/         Daily architecture
  log/ dump/                Behavior logger + Brain Dump
  ace/                      ACE chat
  call/                     Voice accountability call (Web Speech API)
  vault/ wishlist/          Redemption surfaces
  curiosity/ actions/       Brain-dump fan-out
  mood/ health/             Wellbeing logs + integrations
  bank/ payments/           Money flows
  partner/ community/       Accountability layer
  tracks/ events/ reports/  Novelty engine + insights
  level/ settings/ history/ Misc
  api/                      All POST/PATCH/PUT/DELETE handlers
lib/
  economy.ts points.ts      §4 catalog + math
  decay.ts events.ts        Decay detection + event multipliers (pure)
  event-actions.ts          Server-only event generators (DB writes)
  ace.ts reports.ts         Claude integrations
  tracks.ts seasons.ts      Novelty engine data
  levels.ts heatmap.ts      Level math, calendar visualizations
  onboarding.ts             Question schema + first-week math
  payments.ts bank.ts       Money + impulse interception stubs
  health.ts                 Wearable / Health Kit stubs
  verification.ts           Anti-gaming stubs (GPS, photo, manual caps)
  accountability.ts         Weekly digest builder
  catalog.ts                Curated Vault items
  db.ts                     SQLite schema + accessors (better-sqlite3)
  time.ts types.ts          Shared helpers
tests/
  points.test.ts            §4 math
  extras.test.ts            All new modules
```
