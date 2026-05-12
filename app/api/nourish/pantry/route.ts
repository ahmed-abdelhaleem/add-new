import { NextResponse } from "next/server";
import { z } from "zod";

import { DEMO_USER_ID, addPantryItem, listPantry, removePantryItem } from "@/lib/db";

export async function GET() {
  return NextResponse.json({ items: listPantry(DEMO_USER_ID) });
}

const schema = z.object({ name: z.string().min(1).max(80), action: z.enum(["add", "remove"]) });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.action === "add") addPantryItem(DEMO_USER_ID, parsed.data.name.toLowerCase());
  else removePantryItem(DEMO_USER_ID, parsed.data.name.toLowerCase());
  return NextResponse.json({ ok: true });
}
