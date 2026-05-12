import { NextResponse } from "next/server";
import { z } from "zod";

import {
  DEMO_USER_ID,
  activateFoundation,
  completeFoundationDeactivation,
  getFoundation,
  getUser,
  listReadinessScores,
  listTriggerLogs,
  startFoundationDeactivation,
  updateUser,
} from "@/lib/db";
import {
  FOUNDATION_DEFAULT_DAYS,
  deactivationHoursRemaining,
  deactivationReady,
} from "@/lib/foundation";
import { FOUNDATION_STAKE_SURCHARGE_SEK } from "@/lib/economy";

export async function GET() {
  const f = getFoundation(DEMO_USER_ID);
  if (!f) {
    return NextResponse.json({ active: false });
  }
  const active = !f.deactivatedAt;
  const triggerLogs = listTriggerLogs(DEMO_USER_ID, 100);
  const readiness = listReadinessScores(DEMO_USER_ID);
  return NextResponse.json({
    active,
    state: f,
    deactivationReady: deactivationReady(f),
    deactivationHoursRemaining: deactivationHoursRemaining(f),
    triggerLogs,
    readiness,
  });
}

const activateSchema = z.object({
  commitment: z.string().min(10).max(280),
  durationDays: z.number().int().min(30).max(365).optional(),
});

export async function POST(req: Request) {
  const parsed = activateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const user = getUser(DEMO_USER_ID)!;
  const state = activateFoundation({
    userId: DEMO_USER_ID,
    commitment: parsed.data.commitment,
    originalStakeSEK: user.stake_sek,
    surchargeSEK: FOUNDATION_STAKE_SURCHARGE_SEK,
    durationDays: parsed.data.durationDays ?? FOUNDATION_DEFAULT_DAYS,
  });
  // Bump stake by surcharge while Foundation Mode is on.
  updateUser(DEMO_USER_ID, { stake_sek: user.stake_sek + FOUNDATION_STAKE_SURCHARGE_SEK });
  return NextResponse.json({ state });
}

const deactivateSchema = z.object({ action: z.enum(["start", "complete", "cancel"]) });

export async function PATCH(req: Request) {
  const parsed = deactivateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const f = getFoundation(DEMO_USER_ID);
  if (!f) return NextResponse.json({ error: "Not active" }, { status: 404 });

  if (parsed.data.action === "start") {
    startFoundationDeactivation(DEMO_USER_ID);
    return NextResponse.json({
      ok: true,
      message: `72-hour reflection window started. Re-evaluate before completing.`,
    });
  }
  if (parsed.data.action === "complete") {
    if (!deactivationReady(f)) {
      return NextResponse.json(
        { error: `Still ${Math.ceil(deactivationHoursRemaining(f))} hours of reflection remaining.` },
        { status: 409 }
      );
    }
    completeFoundationDeactivation(DEMO_USER_ID);
    // Remove the surcharge from the stake.
    const user = getUser(DEMO_USER_ID)!;
    const restored = Math.max(0, user.stake_sek - f.surchargeSEK);
    updateUser(DEMO_USER_ID, { stake_sek: restored });
    return NextResponse.json({ ok: true });
  }
  // cancel
  // null out deactivation_started_at by re-activating
  activateFoundation({
    userId: DEMO_USER_ID,
    commitment: f.commitment,
    originalStakeSEK: f.originalStakeSEK,
    surchargeSEK: f.surchargeSEK,
    durationDays: f.durationDays,
  });
  return NextResponse.json({ ok: true });
}
