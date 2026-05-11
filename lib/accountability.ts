import { BEHAVIOR_INDEX } from "./economy";
import { currentStreak, pointsToSEK, summarizeMonth } from "./points";
import type { LoggedBehavior } from "./types";

/**
 * Weekly partner digest (PRD §5 Feature 7).
 *
 * The partner sees a SUMMARY ONLY — no granular behavioral data.
 * Hits 6/10 targets, current streak, headline.
 *
 * TODO(integration:email): Send this via Resend or Postmark. Schedule
 * weekly via Vercel Cron at /api/partner/digest. Template the body to
 * include the one-tap "Send a Boost" link that round-trips through
 * /api/partner/boost?token=...
 */
export function buildWeeklyDigest(opts: {
  userName: string;
  partnerName: string;
  history: LoggedBehavior[];
}): string {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const weekHistory = opts.history.filter((h) => new Date(h.loggedAt) >= weekAgo);
  const monthSummary = summarizeMonth(opts.history.filter((h) => h.loggedAt.startsWith(now.toISOString().slice(0, 7))));
  const recoveredSEK = pointsToSEK(monthSummary.total).toFixed(0);
  const streak = currentStreak(opts.history);

  const distinctDays = new Set(weekHistory.map((h) => h.loggedAt.slice(0, 10))).size;
  const top = weekHistory.length === 0
    ? "no activity"
    : Object.entries(
        weekHistory.reduce<Record<string, number>>((a, h) => {
          a[h.behavior] = (a[h.behavior] || 0) + 1;
          return a;
        }, {})
      )
        .sort((a, b) => b[1] - a[1])[0]
        ?.map((v, i) => (i === 0 ? BEHAVIOR_INDEX[v as keyof typeof BEHAVIOR_INDEX]?.label : v))
        .join(" ×") ?? "n/a";

  return `Hey ${opts.partnerName},

Quick update on ${opts.userName} for the week:

- Active days this week: ${distinctDays}/7
- Current streak: ${streak} days
- Stake recovered this month: ${recoveredSEK} SEK
- Most-logged behavior this week: ${top}

No further detail than that — they get privacy on the specifics.

If you'd like to send a one-tap boost (worth 1,000 bonus pts), reply with "BOOST"
or use the button in the app.

— MOMENTUM`;
}

export const PARTNER_BOOST_POINTS = 1000;
