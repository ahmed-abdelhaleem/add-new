import { NextResponse } from "next/server";
import { z } from "zod";

import {
  DEMO_USER_ID,
  completeActionItem,
  insertActionItem,
  listActionItems,
} from "@/lib/db";

const schema = z.object({ text: z.string().min(1).max(280) });

export async function GET() {
  return NextResponse.json({ items: listActionItems(DEMO_USER_ID) });
}

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  return NextResponse.json({ item: insertActionItem(DEMO_USER_ID, parsed.data.text) });
}

const patchSchema = z.object({ id: z.string() });

export async function PATCH(req: Request) {
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  completeActionItem(parsed.data.id, DEMO_USER_ID);
  return NextResponse.json({ ok: true });
}
