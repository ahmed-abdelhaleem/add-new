import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserSettings, updateUserSettings } from "@/lib/db";
import { getUserId } from "@/lib/session";

export async function GET() {
  const userId = await getUserId();
  return NextResponse.json({ settings: getUserSettings(userId) });
}

const schema = z.object({
  bingeSubtractPoints: z.boolean().optional(),
  aceVoiceEnabled: z.boolean().optional(),
  defaultChartPeriod: z.enum(["day", "week", "month"]).optional(),
  confirmBeforeLog: z.boolean().optional(),
});

export async function POST(req: Request) {
  const userId = await getUserId();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  updateUserSettings(userId, parsed.data);
  return NextResponse.json({ ok: true, settings: getUserSettings(userId) });
}
