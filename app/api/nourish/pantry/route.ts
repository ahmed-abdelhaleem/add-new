import { NextResponse } from "next/server";
import { z } from "zod";

import { addPantryItem, listPantry, removePantryItem } from "@/lib/db";
import { getUserId } from "@/lib/session";

export async function GET() {
  const userId = await getUserId();
  return NextResponse.json({ items: listPantry(userId) });
}

const schema = z.object({ name: z.string().min(1).max(80), action: z.enum(["add", "remove"]) });

export async function POST(req: Request) {
  const userId = await getUserId();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.action === "add") addPantryItem(userId, parsed.data.name.toLowerCase());
  else removePantryItem(userId, parsed.data.name.toLowerCase());
  return NextResponse.json({ ok: true });
}
