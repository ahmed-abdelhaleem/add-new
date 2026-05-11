import { describe, expect, it } from "vitest";

import { firstWeekBonusUntil, isInFirstWeek, tierForStake, validateAnswers } from "../lib/onboarding";
import { lifetimeLevel, levelFromLifetimePoints, lifetimeThreshold, nextUnlock } from "../lib/levels";
import { activeEventMultiplier } from "../lib/events";
import { buildActivityHeatmap, intensityClass, moodIntensity } from "../lib/heatmap";
import { currentSeason } from "../lib/seasons";
import { MANUAL_STEPS_DAILY_CAP_POINTS, verifyGymSession, verifyManualSteps } from "../lib/verification";
import type { BonusEvent, LoggedBehavior, MoodLog } from "../lib/types";

describe("onboarding", () => {
  it("maps stakes to tiers", () => {
    expect(tierForStake(500)).toBe("Starter");
    expect(tierForStake(1000)).toBe("Standard");
    expect(tierForStake(2000)).toBe("Committed");
    expect(tierForStake(5000)).toBe("All-in");
    expect(tierForStake(250)).toBe("Starter");
  });

  it("first-week bonus window is exactly 7 days", () => {
    const start = new Date("2026-05-11T10:00:00Z");
    const end = firstWeekBonusUntil(start);
    expect((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)).toBe(7);
  });

  it("isInFirstWeek false when no flag", () => {
    expect(isInFirstWeek(null)).toBe(false);
  });

  it("isInFirstWeek true within window", () => {
    const start = new Date("2026-05-11T10:00:00Z");
    const until = firstWeekBonusUntil(start);
    expect(isInFirstWeek(until.toISOString(), new Date("2026-05-13T10:00:00Z"))).toBe(true);
  });

  it("validation requires the seven fields", () => {
    expect(validateAnswers({})).toBeTruthy();
    const full = {
      collapsePattern: "x",
      bestWeek: "x",
      energyWindow: "x",
      aspiration: "x",
      involvePartner: "no" as const,
      stakeSEK: 1000,
      charity: "x",
    };
    expect(validateAnswers(full)).toBeNull();
  });
});

describe("levels", () => {
  it("level 1 at 0 lifetime pts", () => {
    expect(levelFromLifetimePoints(0)).toBe(1);
  });

  it("level monotonically increases with points", () => {
    let prev = 1;
    for (let pts = 0; pts < 1_000_000; pts += 50_000) {
      const lvl = levelFromLifetimePoints(pts);
      expect(lvl).toBeGreaterThanOrEqual(prev);
      prev = lvl;
    }
  });

  it("nextUnlock returns null at level 50", () => {
    expect(nextUnlock(50)).toBeNull();
  });

  it("lifetimeThreshold is monotonic", () => {
    let prev = 0;
    for (let l = 1; l <= 50; l++) {
      const t = lifetimeThreshold(l);
      expect(t).toBeGreaterThanOrEqual(prev);
      prev = t;
    }
  });

  it("lifetimeLevel surfaces unlocked features at level 5", () => {
    const info = lifetimeLevel(lifetimeThreshold(5));
    expect(info.level).toBe(5);
    expect(info.unlockedAt).toContain("Standard tier");
  });
});

describe("event multiplier composition", () => {
  it("double_hour and rescue_week multiply together", () => {
    const events: BonusEvent[] = [
      {
        id: "a",
        userId: "u",
        kind: "double_hour",
        payload: { kind: "double_hour", multiplier: 2 },
        startsAt: "2026-05-11T00:00:00Z",
        endsAt: "2026-05-11T23:59:59Z",
      },
      {
        id: "b",
        userId: "u",
        kind: "rescue_week",
        payload: { kind: "rescue_week", multiplier: 1.5, reduceTo: 3 },
        startsAt: "2026-05-11T00:00:00Z",
        endsAt: "2026-05-18T00:00:00Z",
      },
    ];
    expect(activeEventMultiplier(events)).toBe(3);
  });

  it("returns 1× when no events", () => {
    expect(activeEventMultiplier([])).toBe(1);
  });
});

describe("heatmap", () => {
  it("builds 84 cells", () => {
    const cells = buildActivityHeatmap([], 84, new Date("2026-05-11"));
    expect(cells.length).toBe(84);
  });

  it("counts events per day", () => {
    const history: LoggedBehavior[] = [
      {
        id: "x",
        userId: "u",
        behavior: "gym_session",
        rawPoints: 2500,
        awardedPoints: 2500,
        multiplier: 1,
        loggedAt: "2026-05-10T10:00:00Z",
      },
    ];
    const cells = buildActivityHeatmap(history, 7, new Date("2026-05-11"));
    const yesterday = cells.find((c) => c.date === "2026-05-10");
    expect(yesterday?.count).toBe(1);
    expect(yesterday?.points).toBe(2500);
  });

  it("intensityClass scales with count", () => {
    expect(intensityClass(0)).toContain("bg-ink");
    expect(intensityClass(10)).toContain("flame");
  });

  it("moodIntensity handles 1-5", () => {
    expect(moodIntensity(1)).toContain("flame");
    expect(moodIntensity(5)).toContain("mint");
  });
});

describe("seasons", () => {
  it("June is Summer Streak", () => {
    expect(currentSeason(new Date("2026-06-15"))?.key).toBe("summer_streak");
  });
  it("November is Dark Month", () => {
    expect(currentSeason(new Date("2026-11-15"))?.key).toBe("dark_month");
  });
  it("January is New Year", () => {
    expect(currentSeason(new Date("2026-01-15"))?.key).toBe("new_year");
  });
  it("Other months return null", () => {
    expect(currentSeason(new Date("2026-03-15"))).toBeNull();
  });
});

describe("verification", () => {
  it("attested gym is allowed (stub)", () => {
    expect(verifyGymSession({ attested: true }).verified).toBe(true);
  });
  it("GPS-only with no duration is not verified", () => {
    expect(verifyGymSession({ lat: 59.3, lng: 18.1 }).verified).toBe(false);
  });
  it("Manual steps cap at 500/day", () => {
    const v = verifyManualSteps(0, 1200);
    expect(v.cappedPoints).toBe(MANUAL_STEPS_DAILY_CAP_POINTS);
  });
  it("Manual steps already at cap awards 0", () => {
    const v = verifyManualSteps(MANUAL_STEPS_DAILY_CAP_POINTS, 100);
    expect(v.allowed).toBe(false);
  });
});

describe("accountability", () => {
  it("builds a digest containing the partner name", async () => {
    const { buildWeeklyDigest } = await import("../lib/accountability");
    const out = buildWeeklyDigest({ userName: "Saeed", partnerName: "Pat", history: [] });
    expect(out).toMatch(/Pat/);
    expect(out).toMatch(/Active days this week/);
  });
});

describe("payments helpers", () => {
  it("totalSEKThisYear returns zero with no payments", async () => {
    // db.ts seeds a single user with no payments; just verify the math.
    const { totalSEKThisYear } = await import("../lib/payments");
    const { DEMO_USER_ID } = await import("../lib/db");
    const y = totalSEKThisYear(DEMO_USER_ID);
    expect(y.charged).toBe(0);
    expect(y.donated).toBe(0);
  });
});

describe("first-week multiplier in award", () => {
  it("multiplies into awarded points", async () => {
    const { awardForBehavior } = await import("../lib/points");
    const a = awardForBehavior({
      behavior: "gym_session",
      loggedAt: new Date(),
      monthHistory: [],
      firstWeekMultiplier: 1.5,
    });
    expect(a.awardedPoints).toBe(2500 * 1.5);
  });
});

describe("mood log shape", () => {
  it("accepts 1-5 mood values", () => {
    const m: MoodLog = { date: "2026-05-11", mood: 4 };
    expect(m.mood).toBe(4);
  });
});
