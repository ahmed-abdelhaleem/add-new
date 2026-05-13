import { NextResponse } from "next/server";
import { z } from "zod";

import { completeActionItem, insertActionItem, listActionItems } from "@/lib/db";
import { getUserId } from "@/lib/session";

const schema = z.object({ text: z.string().min(1).max(280) });

export async function GET() {
  const userId = await getUserId();
  return NextResponse.json({ items: listActionItems(userId) });
}

export async function POST(req: Request) {
  const userId = await getUserId();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  return NextResponse.json({ item: insertActionItem(userId, parsed.data.text) });
}

const patchSchema = z.object({ id: z.string() });

export async function PATCH(req: Request) {
  const userId = await getUserId();
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  completeActionItem(parsed.data.id, userId);
  return NextResponse.json({ ok: true });
}
