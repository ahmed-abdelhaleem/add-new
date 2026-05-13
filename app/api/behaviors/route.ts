import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import {
  deleteCustomBehavior,
  insertCustomBehavior,
  listBehaviorOverrides,
  listCustomBehaviors,
  upsertBehaviorOverride,
  deleteBehaviorOverride,
  updateCustomBehavior,
} from "@/lib/db";
import { getUserId } from "@/lib/session";
import { BEHAVIORS } from "@/lib/economy";

export async function GET() {
  const userId = await getUserId();
  return NextResponse.json({
    builtIn: BEHAVIORS,
    custom: listCustomBehaviors(userId),
    overrides: listBehaviorOverrides(userId),
  });
}

const createSchema = z.object({
  slug: z.string().min(2).max(40).regex(/^[a-z0-9_]+$/, "lowercase, digits, underscore"),
  label: z.string().min(1).max(80),
  notes: z.string().max(200).optional(),
  domain: z.enum(["physical", "mental", "social", "regulation", "foundation", "nourish"]),
  points: z.number().int().min(0).max(20000),
  dailyCap: z.number().int().min(1).max(20).optional(),
  routine: z.enum(["morning", "midday", "evening"]).nullable().optional(),
});

export async function POST(req: Request) {
  const userId = await getUserId();
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const now = new Date().toISOString();
  insertCustomBehavior({
    id: randomUUID(),
    userId,
    slug: parsed.data.slug,
    label: parsed.data.label,
    notes: parsed.data.notes,
    domain: parsed.data.domain,
    points: parsed.data.points,
    dailyCap: parsed.data.dailyCap ?? null,
    enabled: true,
    routine: parsed.data.routine ?? null,
    createdAt: now,
  });
  return NextResponse.json({ ok: true });
}

const patchSchema = z.object({
  id: z.string().optional(),
  // For custom behaviors:
  label: z.string().min(1).max(80).optional(),
  points: z.number().int().min(0).max(20000).optional(),
  dailyCap: z.number().int().min(1).max(20).nullable().optional(),
  enabled: z.boolean().optional(),
  routine: z.enum(["morning", "midday", "evening"]).nullable().optional(),
  // For built-in overrides:
  behaviorKey: z.string().optional(),
  overridePoints: z.number().int().min(0).max(20000).nullable().optional(),
  overrideDailyCap: z.number().int().min(1).max(20).nullable().optional(),
  dailyCapActive: z.boolean().optional(),
  overrideEnabled: z.boolean().optional(),
  clearOverride: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const userId = await getUserId();
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.behaviorKey) {
    if (parsed.data.clearOverride) {
      deleteBehaviorOverride(userId, parsed.data.behaviorKey);
      return NextResponse.json({ ok: true });
    }
    upsertBehaviorOverride(userId, {
      behaviorKey: parsed.data.behaviorKey,
      points: parsed.data.overridePoints ?? null,
      dailyCap: parsed.data.overrideDailyCap ?? null,
      dailyCapActive: parsed.data.dailyCapActive ?? true,
      enabled: parsed.data.overrideEnabled ?? true,
    });
    return NextResponse.json({ ok: true });
  }
  if (parsed.data.id) {
    updateCustomBehavior(parsed.data.id, {
      label: parsed.data.label,
      points: parsed.data.points,
      dailyCap: parsed.data.dailyCap === undefined ? undefined : parsed.data.dailyCap,
      enabled: parsed.data.enabled,
      routine: parsed.data.routine,
    });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Specify id or behaviorKey" }, { status: 400 });
}

const deleteSchema = z.object({ id: z.string() });

export async function DELETE(req: Request) {
  const userId = await getUserId();
  const parsed = deleteSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  deleteCustomBehavior(parsed.data.id, userId);
  return NextResponse.json({ ok: true });
}
