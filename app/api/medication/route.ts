import { NextResponse } from "next/server";
import { z } from "zod";

import { listMedication, upsertMedication } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { dayKey } from "@/lib/time";

const schema = z.object({
  taken: z.boolean(),
  date: z.string().optional(),
  note: z.string().max(280).optional(),
});

export async function GET() {
  const userId = await getUserId();
  return NextResponse.json({ logs: listMedication(userId) });
}

export async function POST(req: Request) {
  const userId = await getUserId();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  upsertMedication(userId, {
    date: parsed.data.date ?? dayKey(),
    taken: parsed.data.taken,
    note: parsed.data.note,
  });
  return NextResponse.json({ ok: true });
}
