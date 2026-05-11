import { NextResponse } from "next/server";
import { z } from "zod";

import {
  DEMO_USER_ID,
  insertCuriosity,
  listCuriosity,
  resolveCuriosity,
} from "@/lib/db";

const schema = z.object({ text: z.string().min(1).max(280) });

export async function GET() {
  return NextResponse.json({ items: listCuriosity(DEMO_USER_ID) });
}

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const item = insertCuriosity(DEMO_USER_ID, parsed.data.text);
  return NextResponse.json({ item });
}

const resolveSchema = z.object({ id: z.string() });

export async function PATCH(req: Request) {
  const parsed = resolveSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  resolveCuriosity(parsed.data.id, DEMO_USER_ID);
  return NextResponse.json({ ok: true });
}
