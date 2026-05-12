import { NextResponse } from "next/server";

import { WEEKLY_DEALS } from "@/lib/nourish";

// PRD §11.1 DEALS — auto-pulled from ICA, Coop, Lidl, Willys.
// TODO(integration:deals): replace static seed with a scraper or partner
// API call refreshed every Monday at 06:00 (cron).
export async function GET() {
  return NextResponse.json({ deals: WEEKLY_DEALS });
}
