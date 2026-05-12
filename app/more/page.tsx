import Link from "next/link";

import {
  DEMO_USER_ID,
  getFoundation,
  getUser,
  listActiveBonusEvents,
  listActiveTrackEnrollments,
  listMealLogs,
  listNotifications,
  listReadinessScores,
} from "@/lib/db";
import { listOpenIntercepts } from "@/lib/bank";
import { lifetimeLevel } from "@/lib/levels";
import { mealStreak } from "@/lib/nourish";
import { currentSeason } from "@/lib/seasons";

export const dynamic = "force-dynamic";

interface Item {
  href: string;
  label: string;
  hint: string;
  badge?: string;
}

export default function MorePage() {
  const user = getUser(DEMO_USER_ID)!;
  const level = lifetimeLevel(user.total_lifetime_points);
  const events = listActiveBonusEvents(DEMO_USER_ID);
  const tracks = listActiveTrackEnrollments(DEMO_USER_ID);
  const season = currentSeason();
  const openIntercepts = listOpenIntercepts(DEMO_USER_ID);
  const foundation = getFoundation(DEMO_USER_ID);
  const foundationActive = foundation && !foundation.deactivatedAt;
  const readiness = foundationActive ? listReadinessScores(DEMO_USER_ID) : [];
  const latestReadiness = readiness[readiness.length - 1];
  const mealS = mealStreak(listMealLogs(DEMO_USER_ID));
  const unreadNotifs = listNotifications(DEMO_USER_ID).filter((n) => !n.openedAt && !n.dismissedAt).length;

  const items: Item[] = [
    { href: "/foundation", label: "Foundation Mode", hint: "6-month readiness protocol", badge: foundationActive ? (latestReadiness ? `${latestReadiness.total}/100` : "active") : undefined },
    { href: "/nourish", label: "NourishPlan", hint: "Plan / Shop / Today / Deals", badge: mealS > 0 ? `${mealS}d streak` : undefined },
    { href: "/morning", label: "Morning check-in", hint: "Energy + commitment + priorities" },
    { href: "/evening", label: "Evening log", hint: "Close the day" },
    { href: "/vault", label: "The Vault", hint: "Spend points on experiences" },
    { href: "/memory", label: "Memory Gallery", hint: "What consistency produced" },
    { href: "/wishlist", label: "Wishlist", hint: "24-h cooling before redeem" },
    { href: "/curiosity", label: "Curiosity Queue", hint: "Defer the rabbit holes" },
    { href: "/actions", label: "Action items", hint: "Captured from brain dumps" },
    { href: "/history", label: "History heatmap", hint: "Last 12 weeks" },
    { href: "/mood", label: "Mood + medication", hint: "Private — pattern only" },
    { href: "/health", label: "Health integration", hint: user.health_provider ? `Connected: ${user.health_provider}` : "Apple Health / Google Fit" },
    { href: "/bank", label: "Bank integration", hint: user.bank_connected === 1 ? "Connected" : "Impulse interception", badge: openIntercepts.length ? `${openIntercepts.length} open` : undefined },
    { href: "/payments", label: "Stake & payments", hint: "Charge, recover, donate" },
    { href: "/partner", label: "Accountability partner", hint: "Weekly digest + boosts" },
    { href: "/call", label: "Accountability call", hint: "5-min voice check-in", badge: "voice" },
    { href: "/tracks", label: "Challenge tracks", hint: "3-week rotating programs", badge: tracks.length ? `${tracks.length} active` : undefined },
    { href: "/events", label: "Bonus events", hint: "Double hours, drops, rescue", badge: events.length ? `${events.length} active` : undefined },
    { href: "/community", label: "Community challenges", hint: "Opt-in anonymous leaderboard" },
    { href: "/reports", label: "Monthly pattern reports", hint: "Behavioral summary, not diagnosis" },
    { href: "/notifications", label: "Notifications", hint: "Four types · granular control", badge: unreadNotifs > 0 ? String(unreadNotifs) : undefined },
    { href: "/level", label: `Level ${level.level}`, hint: `${user.total_lifetime_points.toLocaleString()} lifetime pts` },
    { href: "/settings", label: "Settings", hint: "Tier, charity, profile" },
    { href: "/onboarding", label: "Re-run onboarding", hint: "The 7-question conversation" },
  ];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">More</h1>
        <p className="text-sm text-ink-300">Everything else.</p>
      </header>

      {season && (
        <div className="card border-mint/40 bg-mint/5">
          <p className="text-sm text-mint">
            {season.label} — {season.payload.description}
          </p>
        </div>
      )}

      <ul className="grid grid-cols-1 gap-2">
        {items.map((it) => (
          <li key={it.href}>
            <Link
              href={it.href}
              className="flex items-center justify-between rounded-xl bg-ink-800 border border-ink-700 px-4 py-3 hover:bg-ink-700"
            >
              <div>
                <p className="text-sm font-medium">{it.label}</p>
                <p className="text-xs text-ink-400">{it.hint}</p>
              </div>
              {it.badge && <span className="pill text-amber">{it.badge}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
