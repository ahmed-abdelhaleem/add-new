import { NextResponse } from "next/server";
import { z } from "zod";

import { activateFoundation, completeFoundationDeactivation, getFoundation, getUser, listReadinessScores, listTriggerLogs, startFoundationDeactivation, updateUser } from "@/lib/db";
import { getUserId } from "@/lib/session";
import {
  FOUNDATION_DEFAULT_DAYS,
  deactivationHoursRemaining,
  deactivationReady,
} from "@/lib/foundation";
import { FOUNDATION_STAKE_SURCHARGE_SEK } from "@/lib/economy";

export async function GET() {
  const userId = await getUserId();
  const f = getFoundation(userId);
  if (!f) {
    return NextResponse.json({ active: false });
  }
  const active = !f.deactivatedAt;
  const triggerLogs = listTriggerLogs(userId, 100);
  const readiness = listReadinessScores(userId);
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
  const userId = await getUserId();
  const parsed = activateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const user = getUser(userId)!;
  const state = activateFoundation({
    userId: userId,
    commitment: parsed.data.commitment,
    originalStakeSEK: user.stake_sek,
    surchargeSEK: FOUNDATION_STAKE_SURCHARGE_SEK,
    durationDays: parsed.data.durationDays ?? FOUNDATION_DEFAULT_DAYS,
  });
  // Bump stake by surcharge while Foundation Mode is on.
  updateUser(userId, { stake_sek: user.stake_sek + FOUNDATION_STAKE_SURCHARGE_SEK });
  return NextResponse.json({ state });
}

const deactivateSchema = z.object({ action: z.enum(["start", "complete", "cancel"]) });

export async function PATCH(req: Request) {
  const userId = await getUserId();
  const parsed = deactivateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const f = getFoundation(userId);
  if (!f) return NextResponse.json({ error: "Not active" }, { status: 404 });

  if (parsed.data.action === "start") {
    startFoundationDeactivation(userId);
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
    completeFoundationDeactivation(userId);
    // Remove the surcharge from the stake.
    const user = getUser(userId)!;
    const restored = Math.max(0, user.stake_sek - f.surchargeSEK);
    updateUser(userId, { stake_sek: restored });
    return NextResponse.json({ ok: true });
  }
  // cancel
  // null out deactivation_started_at by re-activating
  activateFoundation({
    userId: userId,
    commitment: f.commitment,
    originalStakeSEK: f.originalStakeSEK,
    surchargeSEK: f.surchargeSEK,
    durationDays: f.durationDays,
  });
  return NextResponse.json({ ok: true });
}
