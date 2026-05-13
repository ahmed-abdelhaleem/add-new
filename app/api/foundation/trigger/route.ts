import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { BEHAVIOR_INDEX } from "@/lib/economy";
import { ensureMonthlyState, getFoundation, insertBehavior, insertTriggerLog, listTriggerLogs, recordEarn, updateTriggerLog } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { monthKey } from "@/lib/time";
import type { TriggerEmotion } from "@/lib/types";

const startSchema = z.object({ energyLevel: z.number().int().min(1).max(5).optional() });

// PRD §10.2 — one-tap urge interception. Earns 800 pts immediately
// and starts the 10-minute timer + ACE conversation server-side.
export async function POST(req: Request) {
  const userId = await getUserId();
  const parsed = startSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const f = getFoundation(userId);
  if (!f || f.deactivatedAt) {
    return NextResponse.json({ error: "Foundation Mode not active." }, { status: 409 });
  }

  const id = randomUUID();
  const now = new Date();
  insertTriggerLog(userId, {
    id,
    loggedAt: now.toISOString(),
    emotionUnderneath: null,
    energyLevel: parsed.data.energyLevel ?? null,
    redirectChosen: null,
    redirectCompletedAt: null,
  });

  const def = BEHAVIOR_INDEX.trigger_logged;
  const mk = monthKey(now);
  ensureMonthlyState(userId, mk);
  insertBehavior({
    id: randomUUID(),
    userId: userId,
    behavior: "trigger_logged",
    rawPoints: def.points,
    awardedPoints: def.points,
    multiplier: 1,
    loggedAt: now.toISOString(),
    note: "Urge intercepted",
  });
  recordEarn(userId, mk, def.points);
  return NextResponse.json({ id, awarded: def.points });
}

const annotateSchema = z.object({
  id: z.string(),
  emotionUnderneath: z.enum(["boredom", "loneliness", "restlessness", "anxious", "stressed", "other"]).optional(),
  redirectChosen: z.string().optional(),
  completed: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const userId = await getUserId();
  const parsed = annotateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const patch: Parameters<typeof updateTriggerLog>[1] = {};
  if (parsed.data.emotionUnderneath) patch.emotionUnderneath = parsed.data.emotionUnderneath as TriggerEmotion;
  if (parsed.data.redirectChosen != null) patch.redirectChosen = parsed.data.redirectChosen;
  if (parsed.data.completed != null) patch.redirectCompletedAt = parsed.data.completed ? new Date().toISOString() : null;
  updateTriggerLog(parsed.data.id, patch);

  let awarded = 0;
  if (parsed.data.completed) {
    const def = BEHAVIOR_INDEX.redirect_completed;
    const mk = monthKey();
    ensureMonthlyState(userId, mk);
    insertBehavior({
      id: randomUUID(),
      userId: userId,
      behavior: "redirect_completed",
      rawPoints: def.points,
      awardedPoints: def.points,
      multiplier: 1,
      loggedAt: new Date().toISOString(),
      note: `Redirect: ${parsed.data.redirectChosen ?? "unspecified"}`,
    });
    recordEarn(userId, mk, def.points);
    awarded = def.points;
  }
  return NextResponse.json({ ok: true, awarded });
}

export async function GET() {
  const userId = await getUserId();
  return NextResponse.json({ logs: listTriggerLogs(userId, 50) });
}
