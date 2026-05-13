import { NextResponse } from "next/server";
import { z } from "zod";

import { getMonthlyReport, getUser, listBehaviorsForMonth, listMedication, listMood, listMonthlyReports, upsertMonthlyReport } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { generateMonthlyReport } from "@/lib/reports";
import { monthKey } from "@/lib/time";

export async function GET() {
  const userId = await getUserId();
  return NextResponse.json({ reports: listMonthlyReports(userId) });
}

const schema = z.object({ monthKey: z.string().optional() });

export async function POST(req: Request) {
  const userId = await getUserId();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const mk = parsed.data.monthKey ?? monthKey();
  const existing = getMonthlyReport(userId, mk);
  if (existing) return NextResponse.json({ report: existing, cached: true });

  const user = getUser(userId)!;
  const report = await generateMonthlyReport({
    userName: user.name,
    monthKey: mk,
    history: listBehaviorsForMonth(userId, mk),
    mood: listMood(userId).filter((m) => m.date.startsWith(mk)),
    medication: listMedication(userId).filter((m) => m.date.startsWith(mk)),
  });
  upsertMonthlyReport(userId, report);
  return NextResponse.json({ report, cached: false });
}
