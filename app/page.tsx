import Link from "next/link";

import { BEHAVIOR_INDEX, ROUTINE_BEHAVIORS, STAKE_RING_PRE_MONTHEND_CAP_PCT, STAKE_TIERS, STREAK_RULES } from "@/lib/economy";
import { computeEngagement, decayMessage } from "@/lib/decay";
import { ensureMonthlyState, getDailyPlan, getEveningLog, getFoundation, getMealPlanForDate, getShoppingListForPlan, getUser, listActiveBonusEvents, listActiveTrackEnrollments, listBehaviorsAll, listBehaviorsForMonth, listMealLogs, listReadinessScores, listWishlist } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { listOpenIntercepts } from "@/lib/bank";
import { currentStreak, pointsToSEK, sekToPoints, summarizeMonth } from "@/lib/points";
import { buildFeed, relativeTime } from "@/lib/feed";
import { describeEvent } from "@/lib/events";
import { lifetimeLevel } from "@/lib/levels";
import { mealStreak } from "@/lib/nourish";
import { isInFirstWeek } from "@/lib/onboarding";
import { currentSeason } from "@/lib/seasons";
import { dayKey, isBefore11am, monthKey } from "@/lib/time";
import { TRACK_INDEX } from "@/lib/tracks";

export const dynamic = "force-dynamic";

function nextStreakThreshold(streak: number) {
  for (const rule of STREAK_RULES) {
    if (streak < rule.days) return rule;
  }
  return null;
}

function isMonthEnd(d: Date): boolean {
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return d.getDate() === last;
}

export default async function Dashboard() {
  const userId = await getUserId();
  const user = getUser(userId)!;
  const tier = STAKE_TIERS[user.tier];
  const now = new Date();
  const mk = monthKey(now);
  ensureMonthlyState(userId, mk);

  const monthHistory = listBehaviorsForMonth(userId, mk);
  const allHistory = listBehaviorsAll(userId);
  const summary = summarizeMonth(monthHistory);

  // PRD §4.1 — when Foundation Mode is active, the displayed stake target
  // is base + surcharge.
  const foundation = getFoundation(userId);
  const foundationActive = foundation && !foundation.deactivatedAt;
  const effectiveStakeSEK = user.stake_sek; // already updated when Foundation activated

  const recoveredSEK = pointsToSEK(summary.total);
  const rawPct = (recoveredSEK / effectiveStakeSEK) * 100;
  // PRD §6.3 — cap at 95% until month-end. Preserves pull.
  const displayPct = isMonthEnd(now) ? Math.min(100, rawPct) : Math.min(STAKE_RING_PRE_MONTHEND_CAP_PCT, rawPct);
  const onTrack = !isMonthEnd(now) && rawPct >= 95;

  const streak = currentStreak(allHistory, now);
  const nextRule = nextStreakThreshold(streak);
  const engagement = computeEngagement(allHistory, now);
  const decay = decayMessage(engagement.decayTier);
  const events = listActiveBonusEvents(userId, now);
  const tracks = listActiveTrackEnrollments(userId, now);
  const intercepts = listOpenIntercepts(userId);
  const level = lifetimeLevel(user.total_lifetime_points);
  const season = currentSeason(now);
  const inFirstWeek = isInFirstWeek(user.first_week_bonus_until, now);

  const today = dayKey(now);
  const plan = getDailyPlan(userId, today);
  const evening = getEveningLog(userId, today);
  const morningOverdue = !plan && !isBefore11am(now);

  // NourishPlan status badge
  const mealPlan = getMealPlanForDate(userId, today);
  const shop = mealPlan ? getShoppingListForPlan(mealPlan.id) : null;
  const mealS = mealStreak(listMealLogs(userId), now);
  const nourishStatus = mealPlan
    ? shop && shop.items.every((i) => i.checked || shop.sentTo)
      ? "Plan ready"
      : "Shop needed"
    : "Plan tonight";

  // Wishlist "X pts away" preview — most recent un-redeemed wishlist item.
  const wishlist = listWishlist(userId);
  const wishlistTarget = wishlist.find((w) => !w.redeemedAt && w.costSEK > 0);
  const targetCost = wishlistTarget ? sekToPoints(wishlistTarget.costSEK, wishlistTarget.rate as "A" | "B") : null;
  const ptsAway = wishlistTarget && targetCost ? Math.max(0, targetCost - summary.total) : null;

  // Readiness latest
  const readinessRows = foundationActive ? listReadinessScores(userId) : [];
  const latestReadiness = readinessRows[readinessRows.length - 1];

  // Live feed
  const feed = buildFeed({
    behaviors: allHistory.slice(-20),
    events,
    limit: 20,
  });

  // Streak flame scale + at-risk
  const flameScale = Math.min(2.4, 0.7 + streak * 0.07);
  const flameAtRisk = streak > 0 && now.getHours() >= 18 && !evening && !plan;

  return (
    <div className="space-y-5">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">
            Good {timeOfDay(now)}, {user.name}.
          </h1>
          <p className="text-sm text-ink-300">
            {tier.tier} tier · {effectiveStakeSEK} SEK staked · Level {level.level}
            {foundationActive && <span className="text-amber"> · Foundation Mode</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`streak-flame ${flameAtRisk ? "at-risk" : ""}`}
            style={{ ["--flame-scale" as string]: String(flameScale) }}
            aria-hidden
          />
          <span className="pill">{streak}d</span>
        </div>
      </header>

      {inFirstWeek && (
        <div className="card border-mint/40 bg-mint/5">
          <p className="text-sm text-mint">First-week onboarding bonus: 1.5× on everything. No stake charged yet.</p>
        </div>
      )}

      {intercepts.length > 0 && (
        <Link href="/bank" className="card block border-flame/40 bg-flame/5 hover:bg-flame/10">
          <p className="text-sm text-flame">
            {intercepts.length} pending bank intercept{intercepts.length === 1 ? "" : "s"} — cancel to keep the points.
          </p>
        </Link>
      )}

      {season && (
        <Link href="/events" className="card block hover:bg-ink-700">
          <p className="text-sm text-mint">{season.label} — {season.payload.description}</p>
        </Link>
      )}

      <section className="card animate-breathe">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-ink-300">Stake recovered</span>
          <span className="text-sm text-ink-300">
            {onTrack ? `95% — on track` : `${displayPct.toFixed(0)}%`}
          </span>
        </div>
        <div className="mt-2 h-3 rounded-full bg-ink-700 overflow-hidden">
          <div
            className="h-full bg-gold transition-all"
            style={{ width: `${displayPct}%` }}
          />
        </div>
        <div className="mt-3 flex items-baseline justify-between text-sm">
          <span>
            <span className="text-2xl font-display font-semibold text-ink-100">{recoveredSEK.toFixed(0)}</span>
            <span className="text-ink-300"> / {effectiveStakeSEK} SEK</span>
          </span>
          <span className="text-ink-300">{summary.total.toLocaleString()} pts</span>
        </div>
        {nextRule && (
          <p className="mt-3 text-xs text-ink-300">
            {nextRule.days - streak} days to {nextRule.multiplier}× streak multiplier.
          </p>
        )}
      </section>

      {/* Wishlist "X pts away" preview (PRD §5 Feature 6) */}
      {wishlistTarget && targetCost && ptsAway !== null && (
        <Link href="/wishlist" className="card block hover:bg-ink-700">
          <p className="text-xs text-ink-400">Closest reward</p>
          {ptsAway === 0 ? (
            <p className="text-sm text-mint">
              You can redeem {wishlistTarget.title} now ({targetCost.toLocaleString()} pts).
            </p>
          ) : (
            <p className="text-sm text-amber">
              {ptsAway.toLocaleString()} pts to {wishlistTarget.title}
            </p>
          )}
        </Link>
      )}

      {/* NourishPlan badge (PRD §5 Feature 1 + Feature 11) */}
      <Link href="/nourish" className="card block hover:bg-ink-700">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-ink-200">NourishPlan</p>
          <span className="pill text-amber">{nourishStatus}</span>
        </div>
        <p className="mt-1 text-xs text-ink-400">Meal streak {mealS} days</p>
      </Link>

      {decay && (
        <div className="card border-amber/40 bg-amber/5">
          <p className="text-sm text-amber">{decay}</p>
        </div>
      )}

      {foundationActive && latestReadiness && (
        <Link href="/foundation" className="card block hover:bg-ink-700">
          <div className="flex items-baseline justify-between">
            <p className="text-sm text-ink-200">Readiness Score</p>
            <span className="text-xs text-amber">{latestReadiness.phase}</span>
          </div>
          <p className="mt-1 text-2xl font-display font-semibold text-gold">{latestReadiness.total}/100</p>
        </Link>
      )}

      {events.length > 0 && (
        <section className="card">
          <h2 className="text-sm font-semibold text-ink-200">Active right now</h2>
          <ul className="mt-2 space-y-1 text-sm text-mint">
            {events.map((e) => (
              <li key={e.id}>· {describeEvent(e)}</li>
            ))}
          </ul>
        </section>
      )}

      {tracks.length > 0 && (
        <section className="card">
          <h2 className="text-sm font-semibold text-ink-200">Track enrolment</h2>
          <ul className="mt-2 text-xs text-ink-300">
            {tracks.map((t) => (
              <li key={t.id}>
                · {TRACK_INDEX[t.trackKey]?.title ?? t.trackKey} — ends {new Date(t.endsAt).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </section>
      )}

      {morningOverdue && (
        <Link href="/morning" className="card block hover:bg-ink-700">
          <p className="text-sm text-ink-200">Still time for a good day. What&apos;s one thing?</p>
          <p className="mt-1 text-xs text-ink-400">Start the morning check-in →</p>
        </Link>
      )}

      <section className="card">
        <h2 className="text-sm font-semibold text-ink-200">Today&apos;s priority actions</h2>
        {plan ? (
          <>
            <p className="mt-1 text-xs text-ink-400">Energy: {plan.energy}/5 · &ldquo;{plan.commitment}&rdquo;</p>
            <ul className="mt-3 space-y-2">
              {plan.priorityActions.map((key) => {
                const def = BEHAVIOR_INDEX[key];
                return (
                  <li
                    key={key}
                    className="relative flex items-center justify-between rounded-xl bg-ink-700 px-3 py-2 overflow-hidden"
                  >
                    <span className="relative z-10">{def?.label ?? key}</span>
                    <span className="relative z-10 text-xs text-gold">+{def?.points ?? 0}</span>
                    <div className="absolute inset-0 shimmer" aria-hidden />
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="mt-2 text-sm text-ink-300">
            Set your three priorities for today.{" "}
            <Link className="text-gold" href="/morning">
              Morning check-in →
            </Link>
          </p>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Link href="/log" className="btn-primary">
          Log something now
        </Link>
        {foundationActive ? (
          <Link href="/foundation" className="btn-danger">
            Urge hit
          </Link>
        ) : (
          <Link href="/foundation" className="btn-ghost">
            Foundation
          </Link>
        )}
      </section>

      {/* Routine sections — morning / midday / evening. One-tap log. */}
      <RoutineSection slot="morning" history={monthHistory} />
      <RoutineSection slot="midday" history={monthHistory} />
      <RoutineSection slot="evening" history={monthHistory} />

      {/* Live Feed Strip (PRD §6.3) */}
      <section className="card">
        <h2 className="text-xs font-semibold text-ink-200 uppercase tracking-wider">Live</h2>
        {feed.length === 0 ? (
          <p className="mt-2 text-xs text-ink-400">Quiet — log anything to start the feed.</p>
        ) : (
          <ul className="mt-2 -mx-2 flex gap-2 overflow-x-auto pb-1">
            {feed.map((f) => (
              <li
                key={f.id}
                className="shrink-0 rounded-lg bg-ink-700 px-3 py-2 text-xs min-w-[180px] animate-rollUp"
              >
                <p className="text-ink-100">{f.text}</p>
                <p className="text-ink-400">{relativeTime(f.at)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="text-sm font-semibold text-ink-200">Domain balance</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {([
            ["physical", "Physical", 35000],
            ["mental", "Mental & Learning", 25000],
            ["social", "Social", 20000],
            ["regulation", "Self-Regulation", 15000],
            ["nourish", "NourishPlan", 20000],
          ] as const).map(([key, label, cap]) => {
            const v = summary.byDomain[key];
            const pct = Math.min(100, (v / cap) * 100);
            return (
              <li key={key}>
                <div className="flex justify-between text-xs text-ink-300">
                  <span>{label}</span>
                  <span>
                    {v.toLocaleString()} / {cap.toLocaleString()}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-ink-700">
                  <div
                    className="h-full rounded-full bg-mint"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {!evening && plan && (
        <Link href="/evening" className="card block hover:bg-ink-700">
          <p className="text-sm text-ink-200">Two minutes. Close out the day.</p>
          <p className="mt-1 text-xs text-ink-400">Evening log →</p>
        </Link>
      )}
    </div>
  );
}

function timeOfDay(d: Date): string {
  const h = d.getHours();
  if (h < 5) return "night";
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

function RoutineSection({
  slot,
  history,
}: {
  slot: "morning" | "midday" | "evening";
  history: ReturnType<typeof listBehaviorsForMonth>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const keys = ROUTINE_BEHAVIORS[slot];
  const titles = { morning: "Morning routine", midday: "Midday reset", evening: "Evening routine" };
  return (
    <section className="card">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-ink-200">{titles[slot]}</h2>
        <span className="text-xs text-ink-400">tap to log</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {keys.map((k) => {
          const def = BEHAVIOR_INDEX[k];
          if (!def) return null;
          const doneToday = history.some(
            (h) => h.behavior === k && h.loggedAt.slice(0, 10) === today
          );
          return (
            <RoutineButton key={k} behaviorKey={k} label={def.label} points={def.points} doneToday={doneToday} />
          );
        })}
      </div>
    </section>
  );
}

// Server component renders a thin client button that POSTs to /api/log.
function RoutineButton({
  behaviorKey,
  label,
  points,
  doneToday,
}: {
  behaviorKey: string;
  label: string;
  points: number;
  doneToday: boolean;
}) {
  return (
    <RoutineButtonClient
      behaviorKey={behaviorKey}
      label={label}
      points={points}
      doneToday={doneToday}
    />
  );
}

import RoutineButtonClient from "./components/RoutineButton";
