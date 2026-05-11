import { NextResponse } from "next/server";
import { z } from "zod";

import { DEMO_USER_ID, listMedication, upsertMedication } from "@/lib/db";
import { dayKey } from "@/lib/time";

const schema = z.object({
  taken: z.boolean(),
  date: z.string().optional(),
  note: z.string().max(280).optional(),
});

export async function GET() {
  return NextResponse.json({ logs: listMedication(DEMO_USER_ID) });
}

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  upsertMedication(DEMO_USER_ID, {
    date: parsed.data.date ?? dayKey(),
    taken: parsed.data.taken,
    note: parsed.data.note,
  });
  return NextResponse.json({ ok: true });
}
