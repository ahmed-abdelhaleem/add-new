import { NextResponse } from "next/server";

import { DEMO_USER_ID, listMemoryCards } from "@/lib/db";

export async function GET() {
  return NextResponse.json({ cards: listMemoryCards(DEMO_USER_ID) });
}
