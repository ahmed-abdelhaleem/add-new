# Deploying MOMENTUM to Railway

Five clicks once you have a Railway account. The repo is already
configured (`railway.json`, `nixpacks.toml`, `engines: node >=20`,
`/api/healthz` endpoint, production-aware `MOMENTUM_DB_PATH`).

## Prerequisites

- A Railway account: <https://railway.com>
- The GitHub repo `ahmed-abdelhaleem/add-new` connected to Railway
  (Railway's GitHub App needs read access to it)
- An Anthropic API key (optional — ACE works without one, just uses
  the local deterministic fallback)

## Step 1 — Create the project

1. In Railway dashboard → **New Project** → **Deploy from GitHub repo**
2. Select `ahmed-abdelhaleem/add-new`
3. When asked which branch to deploy, pick **`claude/momentum-app-build-DgAan`**
   (Auto-deploy will fire on every push to that branch.)

Railway detects Next.js automatically and reads `railway.json` /
`nixpacks.toml`. Build = `npm run build`, Start = `npm start`, healthcheck
hits `/api/healthz`. First build takes ~3 minutes (better-sqlite3
compiles a native binding from source).

## Step 2 — Attach a Volume (for SQLite persistence)

Without this step, the DB resets on every redeploy.

1. In the service → **Settings** → **Volumes** → **+ New Volume**
2. **Mount path**: `/data`
3. **Size**: 1 GB is plenty
4. Save — Railway will restart the service

The app's DB path defaults to `/data/momentum.db` whenever
`NODE_ENV=production` (which Railway sets automatically), so no env-var
work is needed for this.

## Step 3 — Environment variables

In the service → **Variables**:

| Key | Value | Required |
|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Optional. Without it, ACE uses the local fallback. |
| `ACE_MODEL` | `claude-sonnet-4-6` | Optional. Override only if you want a different Claude. |
| `MOMENTUM_DB_PATH` | leave unset | Auto-resolves to `/data/momentum.db` in production. |

Don't set `PORT` — Railway injects it and `npm start` reads it.

## Step 4 — Generate a public domain

In the service → **Settings** → **Networking** → **Generate Domain**.
You'll get something like `momentum-production.up.railway.app`. Optional:
add a custom domain in the same panel.

## Step 5 — Verify

After the first successful deploy:

- Open the generated URL → Dashboard renders.
- `GET /api/healthz` → `{ "status": "ok", "db": true, ... }`
- Trigger a redeploy (push any change to `claude/momentum-app-build-DgAan`)
  and confirm the SQLite data persists.

## Troubleshooting

- **Build fails on better-sqlite3**: confirm `nixpacks.toml` is in the
  repo root and lists `python3`, `gcc`, `gnumake`. Railway will rebuild
  the native binding for its Linux container.
- **`/api/healthz` returns 503**: the Volume isn't mounted at `/data`.
  Check Settings → Volumes.
- **Health checks failing during deploy**: bump
  `healthcheckTimeout` in `railway.json` (currently 60 s).
- **Memory pressure**: SQLite + Next.js fits comfortably in Railway's
  free tier (512 MB). If you scale up, the Volume comes with you — only
  the compute resizes.

## Going to production for real

The web build is a prototype. Before charging actual users:

1. Migrate from SQLite to Postgres (Railway provides a Postgres add-on
   in one click; `lib/db.ts` is the only file that needs rewriting).
2. Replace every `TODO(integration:*)` marker (see `README.md` table)
   with real Swish / Stripe / Tink / HealthKit / etc. integrations.
3. Add real auth — the current build uses a hardcoded demo user
   (`user_demo`).
4. Move from manual cron triggers to a real scheduler (Inngest,
   Trigger.dev, or Vercel Cron equivalent).
5. Set up GDPR data export and deletion flows before launching in the
   EU (the data model is EU-residency clean since Railway has EU
   regions, but UX is still owed).

## Auto-deploys

Already wired. Every push to `claude/momentum-app-build-DgAan` triggers
a Railway build. Want a different branch as production? In Railway →
Settings → Service → Deployment Trigger, change the branch.
