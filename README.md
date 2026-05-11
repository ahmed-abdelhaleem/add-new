# MOMENTUM

AI-powered behavioral consistency engine with real-money gamification.
Prototype implementation of the MOMENTUM PRD as a Next.js full-stack app.

## What this prototype is

A working vertical slice of the design that proves the core mechanics:

- **Points economy** (PRD §4): 4 stake tiers, 20 behaviors across 4 domains,
  domain caps, daily caps, streak multipliers (1.2×/1.4×/1.6×), comeback
  bonus (3×, cooldown-gated), month-end bonuses, and the Category A/B
  redemption split (100 vs 180 pts per SEK).
- **ACE — AI Consistency Engine** (PRD §5 Feature 2, §6): Anthropic SDK
  integration with a tone-constrained system prompt; falls back to a
  deterministic local responder when `ANTHROPIC_API_KEY` is absent so the
  prototype runs offline.
- **Decay detection** (PRD §5 Feature 2): 28-day baseline vs 7-day
  rolling, with the 3 / 5 / 7 / 10 consecutive-low-day escalation tiers.
- **Daily architecture** (PRD §5 Feature 3): morning energy + commitment
  → AI-selected 3 priorities; evening 3-state close-out that always awards
  show-up points.
- **Brain Dump** (PRD §5 Feature 4): single-textarea capture, AI
  categorization into action items / curiosity queue / wishlist /
  acknowledged.
- **Experience Vault** (PRD §5 Feature 6): curated catalog with redemption
  flow, Category B penalty surfaced inline, Category C refused with the
  72-hour cooling explanation.
- **Dashboard** (PRD §5 Feature 1): single focus surface, stake recovery
  bar, streak + next-multiplier, domain balance.

## What's deliberately not in the prototype

These need real-world integrations or production infrastructure and would
add no design insight at this stage:

- Stripe / Swish billing of the monthly stake.
- Charity disbursement.
- PSD2 / Tink bank integration (impulse interception).
- Apple Health / Google Fit / wearables.
- iOS / Android native shells.
- ACE voice accountability calls (Feature 7).
- Community challenges (Feature 7).
- B2B / employer wellness portal.

## Run

```bash
npm install
npm run dev          # http://localhost:3000
```

A demo user (`Saeed`, Standard tier, 1000 SEK stake, Läkare Utan Gränser)
is seeded on first boot.

### Tests

```bash
npm run test
```

The test suite locks the PRD §4 math: caps, multipliers, comeback gating,
SEK conversion, and the §4.5 standard-scenario point total.

### Environment

Copy `.env.example` → `.env.local` if you want ACE to use a real Claude
model. With no key, ACE uses a deterministic local fallback that still
respects the tone constraints in `lib/ace.ts`.

```
ANTHROPIC_API_KEY=sk-ant-…
ACE_MODEL=claude-sonnet-4-6
MOMENTUM_DB_PATH=./momentum.db
```

## Layout

```
app/                Next.js App Router pages + API routes
  page.tsx          Dashboard
  morning/          Morning check-in
  evening/          Evening close-out
  log/              Behavior logger
  dump/             Brain dump
  ace/              ACE chat
  vault/            Experience vault
  api/              POST handlers backing each surface
lib/
  economy.ts        Stake tiers, behavior catalog, caps, multipliers
  points.ts         Award math, streak / comeback logic, conversions
  decay.ts          Engagement signature + escalation tiers
  ace.ts            Anthropic SDK call + local fallback + categorizer
  db.ts             SQLite (better-sqlite3) schema and accessors
  catalog.ts        Curated Experience Vault items
  priorities.ts     Energy-aware priority picker
  time.ts           Date helpers
tests/
  points.test.ts    Locks the PRD §4 math
```
