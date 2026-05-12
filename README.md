# MOMENTUM

AI-powered behavioral consistency engine with real-money gamification.
Working web implementation of MOMENTUM Master PRD v2.0.

## Scope

Every PRD surface that can be built in code now exists with real APIs
and persistence. External-service edges (Stripe/Swish, PSD2, HealthKit,
GPS verification, email, voice TTS, scheduled cron, store deal scrapers)
are isolated behind named modules with `TODO(integration:*)` comments.

### v2 additions (this build)

- **Feature 10 — Foundation Mode**: 6-month readiness protocol.
  Activation with written commitment, +500 SEK stake surcharge,
  one-tap urge interception ("Urge hit" → +800 pts + 10-min timer +
  ACE check-in), redirect menu (time-of-day + energy aware,
  +0–1,500 pts on completion), weekly Readiness Score (0–100 across
  4 pillars at 25% each, narrated as Foundation/Building/Momentum/
  Ready), 72-hour reflection window for deactivation.
- **Feature 11 — NourishPlan**: 4 sub-views (Today, Plan, Shop,
  Deals). Energy forecast → 3 options per slot → confirmation
  (+600 pts). Shopping list auto-generated, pantry-aware, 1–2 days
  only, exact quantities, grouped by section. One-tap send to ICA /
  Coop / Mathem (stubbed). Separate meal streak counter (decoupled
  from main streak) with 3-day (+1,500) and 7-day (+4,000)
  milestones. Static deal seed for ICA/Coop/Lidl/Willys; suggestions
  already incorporate deals so users never browse.
- **Section 7 — Notification System**: 4 types (Anchor, Moment,
  Surprise, Rescue), hard frequency caps (≤2/day, ≤8/week, 3-hour
  minimum gap, 21:30–08:00 quiet hours, 0 on days the user opened
  the app 2+ times), banned-phrase guards, copy-test enforcement,
  granular opt-down per type, full dispatch + history UI.
- **Dashboard upgrades**: 95% ring cap with "on track" until
  month-end (PRD §6.3); live CSS streak flame that scales with
  streak length and turns amber-red when at-risk; Live Feed Strip;
  near-miss labels ("X pts to Level Y"); NourishPlan status badge;
  "You're X pts away from Y" wishlist preview; Foundation Readiness
  card; shimmering priority action cards.
- **Memory Gallery**: every Category-A Vault redemption now writes a
  permanent memory card.
- **Floating Brain Dump button**: persistent on every screen,
  full-screen overlay, slow-blinking cursor (PRD §6.5), Web Speech
  voice input, 8-second idle "Done? Save & close" prompt.
- **Morning check-in NourishPlan question**: "Did you eat roughly
  as planned yesterday?" (+400 pts for any answer).
- **Design palette**: refreshed to warm gold (#C9962A) + amber
  (#E8C882) with `breathe` / `shimmer` / `flame` / `rollUp`
  animations.
- **ACE tone constraints**: now reject "bad", "unhealthy",
  "inappropriate", "failure", "wrong", and any exclamation mark.
  Foundation Mode framing and post-bariatric NourishPlan rules
  encoded in the system prompt.
- **Anti-gaming**: existing GPS, photo, manual-step verification
  stubs unchanged; bank-account tracking flagged in `lib/bank.ts`.

### v1 still in place

- Points economy (4 stake tiers, behaviors, caps, streaks, comeback,
  first-week 1.5×), ACE chat, decay detection, daily architecture,
  Vault, Wishlist, Curiosity Queue, Action Items, Mood + medication,
  Health stubs, Bank intercept simulator, Payments stub, Accountability
  partner + boost, Voice accountability call, Challenge tracks,
  Community challenges, Seasonal events, Pattern Insight Reports,
  Level system, History heatmap.

### Tests

77 Vitest cases across the points engine math (§4), onboarding,
levels, event-multiplier composition, seasons, verification stubs,
accountability digest, payments helpers, Foundation Mode readiness
+ phases + deactivation timer, NourishPlan suggestions / streak /
shopping-list dedup / plan-vs-delivery, notification copy tests +
quiet hours + banned phrases, near-miss labels, Live Feed shape and
relative-time formatting.

```bash
npm install
npm run test
npm run build
npm run dev    # http://localhost:3000
```

A demo user (`Saeed`, Standard tier, 1000 SEK stake, Läkare Utan
Gränser) is seeded on first boot. Visit `/onboarding` to re-run the
conversational intake.

## What's still external

Every external-integration surface is gated behind a module that
exports a stubbed function with a `TODO(integration:*)` comment
listing exactly the production work:

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
| `app/api/call/route.ts` | `tts` | ElevenLabs / Cartesia for server-side TTS. |
| `app/api/events/route.ts` | `scheduler` | Inngest / Trigger.dev / Vercel Cron. |
| `app/api/onboarding/route.ts` | `cron` | Monthly stake-charge scheduler. |
| `lib/nourish.ts` | `deals` | ICA / Coop / Lidl / Willys deal scraper. |
| `app/api/nourish/shop/route.ts` | `delivery` | ICA, Coop, Mathem cart API. |
| `lib/notifications.ts` | `push` | Web Push + VAPID; APNs/FCM on native. |
| `app/api/foundation/readiness/route.ts` | `therapy` | Therapy attendance log integration. |

Mobile shells (iOS, Android) are out of scope of this web build but
all business logic is provider-agnostic and ready to back a React
Native client.

## Environment

```
ANTHROPIC_API_KEY=         # optional — ACE uses local fallback otherwise
ACE_MODEL=claude-sonnet-4-6
MOMENTUM_DB_PATH=          # defaults to ./momentum.db
```

## Layout

```
app/
  page.tsx                  Dashboard (95% cap, flame, feed, badges)
  more/                     Directory of every surface
  onboarding/               7-question conversational intake
  morning/ evening/         Daily architecture (with Nourish question)
  log/ dump/                Behavior logger + dedicated brain dump page
  ace/                      ACE chat
  call/                     Voice accountability call (Web Speech API)
  vault/ wishlist/          Redemption surfaces
  memory/                   Memory Gallery
  curiosity/ actions/       Brain-dump fan-out
  mood/ health/             Wellbeing + integrations
  bank/ payments/           Money flows
  partner/ community/       Accountability layer
  tracks/ events/ reports/  Novelty engine + insights
  foundation/               Foundation Mode (Feature 10)
  nourish/                  NourishPlan (Feature 11), 4 tabs
  notifications/            Section 7 control panel
  level/ settings/ history/ Misc
  components/FloatingDump   Persistent brain-dump button
  api/                      All POST/PATCH/PUT/DELETE handlers
lib/
  economy.ts                Stake tiers, behavior catalog, caps, multipliers
  points.ts                 Award math (incl. first-week, event mult)
  decay.ts events.ts        Decay detection + event multipliers (pure)
  event-actions.ts          Server-only event generators
  ace.ts reports.ts         Claude integrations
  tracks.ts seasons.ts      Novelty engine data
  levels.ts heatmap.ts      Level math, calendar visualizations
  onboarding.ts             Question schema + first-week math
  payments.ts bank.ts       Money + impulse interception stubs
  health.ts                 Wearable / Health Kit stubs
  verification.ts           Anti-gaming stubs (GPS, photo, manual caps)
  accountability.ts         Weekly digest builder
  catalog.ts                Curated Vault items
  foundation.ts             Readiness score, redirect menu (PRD §10)
  nourish.ts                Meal options, plan/shop/streak math
  notifications.ts          4 types, caps, copy generators, banned phrases
  feed.ts                   Live Feed Strip builder
  speech.d.ts               Web Speech API shared types
  db.ts                     SQLite schema + accessors
  time.ts types.ts          Shared helpers
tests/
  points.test.ts            §4 math (18 cases)
  extras.test.ts            v1 modules (28 cases)
  v2.test.ts                v2 modules (31 cases)
```
