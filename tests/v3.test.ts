import { describe, expect, it } from "vitest";

import { BEHAVIOR_INDEX, ROUTINE_BEHAVIORS } from "../lib/economy";
import { awardForBehavior } from "../lib/points";
import type { LoggedBehavior } from "../lib/types";

describe("routine behaviors", () => {
  it("morning routine includes shower, brush, minoxidil, kelo-cote", () => {
    expect(ROUTINE_BEHAVIORS.morning).toEqual([
      "morning_shower",
      "morning_brush",
      "morning_minoxidil",
      "morning_kelo_cote",
    ]);
  });

  it("midday slot includes meditation / walk / breathwork", () => {
    expect(ROUTINE_BEHAVIORS.midday).toEqual([
      "midday_meditation",
      "midday_walk",
      "midday_breathwork",
    ]);
  });

  it("evening routine includes acne / keloid cream", () => {
    expect(ROUTINE_BEHAVIORS.evening).toContain("evening_acne_cream");
  });

  it("each routine behavior is in the BEHAVIOR_INDEX with daily cap 1", () => {
    const all = [
      ...ROUTINE_BEHAVIORS.morning,
      ...ROUTINE_BEHAVIORS.midday,
      ...ROUTINE_BEHAVIORS.evening,
    ];
    for (const k of all) {
      const def = BEHAVIOR_INDEX[k];
      expect(def).toBeDefined();
      expect(def.dailyCap).toBe(1);
    }
  });
});

describe("per-user override", () => {
  const log = (behavior: typeof BEHAVIOR_INDEX[keyof typeof BEHAVIOR_INDEX]["key"], at: string, awarded = 0): LoggedBehavior => ({
    id: `i-${at}`,
    userId: "u",
    behavior,
    rawPoints: 0,
    awardedPoints: awarded,
    multiplier: 1,
    loggedAt: at,
  });

  it("override.points wins over default points", () => {
    const res = awardForBehavior({
      behavior: "gym_session",
      loggedAt: new Date("2026-05-11T08:00:00Z"),
      monthHistory: [],
      override: { points: 5000 },
    });
    expect(res.awardedPoints).toBe(5000);
  });

  it("override.dailyCap raises the limit", () => {
    const day = "2026-05-11";
    // gym has no daily cap by default, so set a custom cap of 2.
    const history: LoggedBehavior[] = [
      log("gym_session", `${day}T08:00:00Z`, 2500),
      log("gym_session", `${day}T19:00:00Z`, 2500),
    ];
    const res = awardForBehavior({
      behavior: "gym_session",
      loggedAt: new Date(`${day}T22:00:00Z`),
      monthHistory: history,
      override: { dailyCap: 2 },
    });
    expect(res.hitDailyCap).toBe(true);
  });

  it("override.dailyCapActive=false disables a behavior's built-in cap", () => {
    const day = "2026-05-11";
    // steps_7k has a default daily cap of 1.
    const history: LoggedBehavior[] = [log("steps_7k", `${day}T08:00:00Z`, 800)];
    const blocked = awardForBehavior({
      behavior: "steps_7k",
      loggedAt: new Date(`${day}T19:00:00Z`),
      monthHistory: history,
    });
    expect(blocked.hitDailyCap).toBe(true);

    const unblocked = awardForBehavior({
      behavior: "steps_7k",
      loggedAt: new Date(`${day}T19:00:00Z`),
      monthHistory: history,
      override: { dailyCapActive: false },
    });
    expect(unblocked.hitDailyCap).toBe(false);
    expect(unblocked.awardedPoints).toBe(800);
  });
});

describe("binge points deduction math", () => {
  // Mirror the logic from /api/binge: 20 pts/min capped at 3000, floored at 200.
  const calcDeduction = (mins: number) => Math.min(3000, Math.max(200, mins * 20));

  it("10-minute spiral with subtraction ON deducts at least 200 pts", () => {
    expect(calcDeduction(10)).toBe(200);
  });

  it("30-minute spiral deducts 600 pts", () => {
    expect(calcDeduction(30)).toBe(600);
  });

  it("3-hour spiral caps at 3000 pts", () => {
    expect(calcDeduction(180)).toBe(3000);
  });
});

// Note: getUserId() relies on next-auth which doesn't load cleanly in
// vitest's node environment. Its fallback behavior is exercised
// implicitly by every API-route integration when auth env vars are
// unset (which is the default in CI).
