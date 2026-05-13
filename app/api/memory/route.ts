import { NextResponse } from "next/server";

import { listMemoryCards } from "@/lib/db";
import { getUserId } from "@/lib/session";

export async function GET() {
  const userId = await getUserId();
  return NextResponse.json({ cards: listMemoryCards(userId) });
}
