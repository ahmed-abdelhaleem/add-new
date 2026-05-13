import { NextResponse } from "next/server";

import { listActiveBonusEvents, listBehaviorsAll } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { buildFeed } from "@/lib/feed";

export async function GET() {
  const userId = await getUserId();
  const behaviors = listBehaviorsAll(userId).slice(-40);
  const events = listActiveBonusEvents(userId);
  return NextResponse.json({ items: buildFeed({ behaviors, events, limit: 30 }) });
}
