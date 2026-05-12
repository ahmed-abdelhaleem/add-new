import { BEHAVIOR_INDEX } from "./economy";
import type {
  BonusEvent,
  FeedItem,
  LoggedBehavior,
} from "./types";

/**
 * PRD §6.3 — Live Feed Strip. Recent activity ticker on the dashboard.
 *
 * Pulls from the behavior log and bonus events. Returns the most recent
 * `limit` items, newest first.
 */
export function buildFeed(opts: {
  behaviors: LoggedBehavior[];
  events: BonusEvent[];
  limit?: number;
}): FeedItem[] {
  const items: FeedItem[] = [];

  for (const b of opts.behaviors) {
    const def = BEHAVIOR_INDEX[b.behavior];
    items.push({
      id: `b_${b.id}`,
      kind: "behavior",
      text: `${def?.label ?? b.behavior} · +${b.awardedPoints} pts`,
      at: b.loggedAt,
      pointsDelta: b.awardedPoints,
    });
  }

  for (const e of opts.events) {
    items.push({
      id: `e_${e.id}`,
      kind: "event",
      text: e.payload.kind === "double_hour"
        ? "Double Points Hour"
        : e.payload.kind === "challenge_drop"
          ? `Challenge: ${e.payload.description}`
          : e.payload.kind === "rescue_week"
            ? "Rescue Week activated"
            : e.payload.kind === "seasonal"
              ? `Season: ${e.payload.description}`
              : "Track bonus",
      at: e.startsAt,
    });
  }

  return items.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, opts.limit ?? 30);
}

export function relativeTime(at: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(at).getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(at).toLocaleDateString();
}
