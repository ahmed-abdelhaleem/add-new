import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { respondAsAce } from "@/lib/ace";
import {
  deleteBinge,
  ensureMonthlyState,
  getUser,
  getUserSettings,
  insertBinge,
  listBehaviorsAll,
  listBinges,
  recordSpend,
  updateBinge,
} from "@/lib/db";
import { getUserId } from "@/lib/session";
import { computeEngagement } from "@/lib/decay";
import { monthKey } from "@/lib/time";
import type { BingeLog } from "@/lib/types";

export async function GET() {
  const userId = await getUserId();
  const settings = getUserSettings(userId);
  return NextResponse.json({
    logs: listBinges(userId, 100),
    settings: { bingeSubtractPoints: settings.bingeSubtractPoints },
  });
}

const createSchema = z.object({
  kind: z.enum(["shopping", "political", "scrolling", "food", "gambling", "porn", "search", "other"]),
  durationMinutes: z.number().int().min(1).max(720).optional(),
  triggerNote: z.string().max(280).optional(),
  reflection: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const userId = await getUserId();
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const settings = getUserSettings(userId);
  const mk = monthKey();
  ensureMonthlyState(userId, mk);

  // PRD-extension: opt-in points deduction. Default off.
  // Calibrated so a 30-minute scroll session is ~600 pts (matches a meal log),
  // longer sessions scale linearly up to 30 minutes ≈ baseline.
  const deduction = settings.bingeSubtractPoints
    ? Math.min(3000, Math.max(200, (parsed.data.durationMinutes ?? 15) * 20))
    : 0;

  const log: BingeLog = {
    id: randomUUID(),
    kind: parsed.data.kind,
    startedAt: new Date().toISOString(),
    durationMinutes: parsed.data.durationMinutes ?? null,
    triggerNote: parsed.data.triggerNote ?? null,
    reflection: parsed.data.reflection ?? null,
    pointsDeducted: deduction,
    aiPatternNote: null,
  };
  insertBinge(userId, log);
  if (deduction > 0) recordSpend(userId, mk, deduction);

  return NextResponse.json({ log, deducted: deduction });
}

const patchSchema = z.object({
  id: z.string(),
  durationMinutes: z.number().int().min(1).max(720).optional(),
  triggerNote: z.string().max(280).optional(),
  reflection: z.string().max(500).optional(),
});

export async function PATCH(req: Request) {
  const userId = await getUserId();
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  updateBinge(parsed.data.id, userId, parsed.data);
  return NextResponse.json({ ok: true });
}

const delSchema = z.object({ id: z.string() });

export async function DELETE(req: Request) {
  const userId = await getUserId();
  const parsed = delSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  deleteBinge(parsed.data.id, userId);
  return NextResponse.json({ ok: true });
}

const analyzeSchema = z.object({});

// One-shot AI pattern analysis across the user's binge log.
export async function PUT(req: Request) {
  await analyzeSchema.parseAsync(await req.json().catch(() => ({})));
  const userId = await getUserId();
  const user = getUser(userId);
  if (!user) return NextResponse.json({ error: "No user" }, { status: 404 });
  const logs = listBinges(userId, 50);
  if (logs.length === 0) {
    return NextResponse.json({ note: "No binge logs yet — nothing to analyze." });
  }
  const summary = logs.slice(0, 30).map((l) =>
    `${l.startedAt.slice(0, 10)} · ${l.kind} · ${l.durationMinutes ?? "?"} min · ${l.triggerNote ?? ""}`
  ).join("\n");
  const reply = await respondAsAce(
    `Please analyze the binge / spiral log below and surface ONE non-judgmental pattern + ONE small experiment to try this week.\n\n${summary}`,
    {
      userName: user.name,
      tier: user.tier,
      stakeSEK: user.stake_sek,
      monthHistory: listBehaviorsAll(userId),
      engagement: computeEngagement(listBehaviorsAll(userId)),
      recentMessages: [],
    }
  );
  return NextResponse.json({ analysis: reply });
}
