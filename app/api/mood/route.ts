import { NextResponse } from "next/server";
import { z } from "zod";

import { listMood, upsertMood } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { dayKey } from "@/lib/time";

const schema = z.object({
  mood: z.number().int().min(1).max(5),
  note: z.string().max(280).optional(),
  date: z.string().optional(),
});

export async function GET() {
  const userId = await getUserId();
  return NextResponse.json({ logs: listMood(userId) });
}

export async function POST(req: Request) {
  const userId = await getUserId();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  upsertMood(userId, {
    date: parsed.data.date ?? dayKey(),
    mood: parsed.data.mood as 1 | 2 | 3 | 4 | 5,
    note: parsed.data.note,
  });
  return NextResponse.json({ ok: true });
}
