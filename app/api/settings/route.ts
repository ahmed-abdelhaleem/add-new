import { NextResponse } from "next/server";
import { z } from "zod";

import { DEMO_USER_ID, updateUser } from "@/lib/db";
import { tierForStake } from "@/lib/onboarding";

const schema = z.object({
  name: z.string().min(1).max(60).optional(),
  stakeSEK: z.number().int().min(100).max(50000).optional(),
  charity: z.string().min(1).max(120).optional(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const userId = DEMO_USER_ID;
  const patch: Parameters<typeof updateUser>[1] = {};
  if (parsed.data.name) patch.name = parsed.data.name;
  if (parsed.data.charity) patch.charity = parsed.data.charity;
  if (parsed.data.stakeSEK) {
    patch.stake_sek = parsed.data.stakeSEK;
    patch.tier = tierForStake(parsed.data.stakeSEK);
  }
  updateUser(userId, patch);
  return NextResponse.json({ ok: true, applied: patch });
}
