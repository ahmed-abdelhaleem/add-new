import { NextResponse } from "next/server";
import { z } from "zod";

import {
  DEMO_USER_ID,
  completeBonusEvent,
  insertBonusEvent,
  listActiveBonusEvents,
  listAllBonusEvents,
  listBehaviorsAll,
  recordBonus,
} from "@/lib/db";
import {
  generateChallengeDrop,
  generateDoublePointsHour,
  generateRescueWeek,
} from "@/lib/event-actions";
import { computeEngagement } from "@/lib/decay";
import { currentSeason, seasonalEndDate } from "@/lib/seasons";
import { monthKey } from "@/lib/time";

export async function GET() {
  return NextResponse.json({
    active: listActiveBonusEvents(DEMO_USER_ID),
    history: listAllBonusEvents(DEMO_USER_ID, 20),
  });
}

const generateSchema = z.object({
  kind: z.enum(["double_hour", "challenge_drop", "rescue_week", "seasonal"]),
});

// Manual trigger for the prototype. Production: a cron job evaluates the
// engagement signature daily and decides which (if any) events to fire.
// TODO(integration:scheduler): wire to Inngest / Trigger.dev / Vercel Cron.
export async function POST(req: Request) {
  const parsed = generateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  let evt;
  switch (parsed.data.kind) {
    case "double_hour":
      evt = generateDoublePointsHour(DEMO_USER_ID);
      break;
    case "challenge_drop":
      evt = generateChallengeDrop(DEMO_USER_ID);
      break;
    case "rescue_week":
      // Should only fire when decay tier ≥ 7, but allow manual override for demo.
      const _engagement = computeEngagement(listBehaviorsAll(DEMO_USER_ID));
      evt = generateRescueWeek(DEMO_USER_ID);
      break;
    case "seasonal":
      const season = currentSeason();
      if (!season) {
        return NextResponse.json({ error: "No active season for this date." }, { status: 400 });
      }
      const ends = seasonalEndDate();
      evt = insertBonusEvent({
        userId: DEMO_USER_ID,
        kind: "seasonal",
        payload: season.payload,
        startsAt: new Date().toISOString(),
        endsAt: ends.toISOString(),
      });
      break;
  }
  return NextResponse.json({ event: evt });
}

const completeSchema = z.object({ id: z.string(), bonusPoints: z.number().int().min(0) });

export async function PATCH(req: Request) {
  const parsed = completeSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  completeBonusEvent(parsed.data.id, parsed.data.bonusPoints);
  if (parsed.data.bonusPoints > 0) {
    recordBonus(DEMO_USER_ID, monthKey(), parsed.data.bonusPoints);
  }
  return NextResponse.json({ ok: true });
}
