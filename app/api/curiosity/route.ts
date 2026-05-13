import { NextResponse } from "next/server";
import { z } from "zod";

import { insertCuriosity, listCuriosity, resolveCuriosity } from "@/lib/db";
import { getUserId } from "@/lib/session";

const schema = z.object({ text: z.string().min(1).max(280) });

export async function GET() {
  const userId = await getUserId();
  return NextResponse.json({ items: listCuriosity(userId) });
}

export async function POST(req: Request) {
  const userId = await getUserId();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const item = insertCuriosity(userId, parsed.data.text);
  return NextResponse.json({ item });
}

const resolveSchema = z.object({ id: z.string() });

export async function PATCH(req: Request) {
  const userId = await getUserId();
  const parsed = resolveSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  resolveCuriosity(parsed.data.id, userId);
  return NextResponse.json({ ok: true });
}
