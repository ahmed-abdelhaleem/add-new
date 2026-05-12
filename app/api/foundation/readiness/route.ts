import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { BEHAVIOR_INDEX } from "@/lib/economy";
import {
  DEMO_USER_ID,
  ensureMonthlyState,
  getFoundation,
  insertBehavior,
  listBehaviorsAll,
  listMedication,
  listReadinessScores,
  listTriggerLogs,
  recordEarn,
  upsertReadinessScore,
} from "@/lib/db";
import { computeReadinessScore, weekKeyFor } from "@/lib/foundation";
import { monthKey } from "@/lib/time";

// Compute (or recompute) the current week's readiness score.
// Production: cron weekly. The manual trigger here demonstrates the flow.
export async function POST() {
  const f = getFoundation(DEMO_USER_ID);
  if (!f || f.deactivatedAt) {
    return NextResponse.json({ error: "Foundation Mode not active." }, { status: 409 });
  }
  const week = weekKeyFor(new Date());
  const score = computeReadinessScore({
    weekKey: week,
    history: listBehaviorsAll(DEMO_USER_ID),
    triggerLogs: listTriggerLogs(DEMO_USER_ID, 500),
    medicationDays: listMedication(DEMO_USER_ID).filter((m) =>
      m.taken && weekKeyFor(new Date(m.date)) === week
    ).length,
    // TODO(integration:therapy): pull from a future attendance log.
    therapyAttendance: 0,
  });
  upsertReadinessScore(DEMO_USER_ID, score);

  // Award the weekly readiness behavior (capped daily) — once per week
  // is enforced by the behavior's daily cap interacting with weekKey.
  const def = BEHAVIOR_INDEX.readiness_score_weekly;
  const mk = monthKey();
  ensureMonthlyState(DEMO_USER_ID, mk);
  insertBehavior({
    id: randomUUID(),
    userId: DEMO_USER_ID,
    behavior: "readiness_score_weekly",
    rawPoints: def.points,
    awardedPoints: def.points,
    multiplier: 1,
    loggedAt: new Date().toISOString(),
    note: `Readiness ${score.total} — ${score.phase}`,
  });
  recordEarn(DEMO_USER_ID, mk, def.points);

  return NextResponse.json({ score });
}

export async function GET() {
  return NextResponse.json({ history: listReadinessScores(DEMO_USER_ID) });
}
