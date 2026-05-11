import Link from "next/link";

import { BEHAVIOR_INDEX, STAKE_TIERS, STREAK_RULES } from "@/lib/economy";
import { computeEngagement, decayMessage } from "@/lib/decay";
import {
  DEMO_USER_ID,
  ensureMonthlyState,
  getDailyPlan,
  getEveningLog,
  getUser,
  listActiveBonusEvents,
  listActiveTrackEnrollments,
  listBehaviorsAll,
  listBehaviorsForMonth,
} from "@/lib/db";
import { listOpenIntercepts } from "@/lib/bank";
import { currentStreak, pointsToSEK, summarizeMonth } from "@/lib/points";
import { describeEvent } from "@/lib/events";
import { lifetimeLevel } from "@/lib/levels";
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

export default function Dashboard() {
  const userId = DEMO_USER_ID;
  const user = getUser(userId)!;

  // If never onboarded, redirect-ish: surface onboarding CTA. We don't hard
  // redirect — the demo seed marks `onboarded_at` already.
  const tier = STAKE_TIERS[user.tier];
  const now = new Date();
  const mk = monthKey(now);
  ensureMonthlyState(userId, mk);

  const monthHistory = listBehaviorsForMonth(userId, mk);
  const allHistory = listBehaviorsAll(userId);
  const summary = summarizeMonth(monthHistory);
  const recoveredSEK = pointsToSEK(summary.total);
  const recoveredPct = Math.min(100, (recoveredSEK / tier.stakeSEK) * 100);
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

  return (
    <div className="space-y-5">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Good {timeOfDay(now)}, {user.name}.</h1>
          <p className="text-sm text-ink-300">
            {tier.tier} tier · {tier.stakeSEK} SEK staked · Level {level.level}
          </p>
        </div>
        <span className="pill">{streak}d streak</span>
      </header>

      {inFirstWeek && (
        <div className="card border-mint/40 bg-mint/5">
          <p className="text-sm text-mint">First-week onboarding bonus active: 1.5× on everything, no stake charged yet.</p>
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

      <section className="card">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-ink-300">Stake recovered</span>
          <span className="text-sm text-ink-300">{recoveredPct.toFixed(0)}%</span>
        </div>
        <div className="mt-2 h-3 rounded-full bg-ink-700 overflow-hidden">
          <div
            className="h-full bg-flame transition-all"
            style={{ width: `${recoveredPct}%` }}
          />
        </div>
        <div className="mt-3 flex items-baseline justify-between text-sm">
          <span>
            <span className="text-2xl font-semibold text-ink-100">{recoveredSEK.toFixed(0)}</span>
            <span className="text-ink-300"> / {tier.stakeSEK} SEK</span>
          </span>
          <span className="text-ink-300">{summary.total.toLocaleString()} pts</span>
        </div>
        {nextRule && (
          <p className="mt-3 text-xs text-ink-300">
            Next streak multiplier at {nextRule.days} days ({nextRule.multiplier}× weekly bonus).
          </p>
        )}
      </section>

      {decay && (
        <div className="card border-flame/40 bg-flame/5">
          <p className="text-sm text-flame">{decay}</p>
        </div>
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
        <Link
          href="/morning"
          className="card block hover:bg-ink-700"
        >
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
                    className="flex items-center justify-between rounded-xl bg-ink-700 px-3 py-2"
                  >
                    <span>{def?.label ?? key}</span>
                    <span className="text-xs text-gold">+{def?.points ?? 0}</span>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="mt-2 text-sm text-ink-300">
            Set your three priorities for today.{" "}
            <Link className="text-flame" href="/morning">
              Morning check-in →
            </Link>
          </p>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Link href="/log" className="btn-primary">
          Log something now
        </Link>
        <Link href="/dump" className="btn-ghost">
          Brain dump
        </Link>
      </section>

      <section className="card">
        <h2 className="text-sm font-semibold text-ink-200">Domain balance</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {([
            ["physical", "Physical", 35000],
            ["mental", "Mental & Learning", 25000],
            ["social", "Social", 20000],
            ["regulation", "Self-Regulation", 15000],
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
