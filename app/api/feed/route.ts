import { NextResponse } from "next/server";

import {
  DEMO_USER_ID,
  listActiveBonusEvents,
  listBehaviorsAll,
} from "@/lib/db";
import { buildFeed } from "@/lib/feed";

export async function GET() {
  const behaviors = listBehaviorsAll(DEMO_USER_ID).slice(-40);
  const events = listActiveBonusEvents(DEMO_USER_ID);
  return NextResponse.json({ items: buildFeed({ behaviors, events, limit: 30 }) });
}
