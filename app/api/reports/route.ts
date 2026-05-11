import { NextResponse } from "next/server";
import { z } from "zod";

import {
  DEMO_USER_ID,
  getMonthlyReport,
  getUser,
  listBehaviorsForMonth,
  listMedication,
  listMood,
  listMonthlyReports,
  upsertMonthlyReport,
} from "@/lib/db";
import { generateMonthlyReport } from "@/lib/reports";
import { monthKey } from "@/lib/time";

export async function GET() {
  return NextResponse.json({ reports: listMonthlyReports(DEMO_USER_ID) });
}

const schema = z.object({ monthKey: z.string().optional() });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const mk = parsed.data.monthKey ?? monthKey();
  const existing = getMonthlyReport(DEMO_USER_ID, mk);
  if (existing) return NextResponse.json({ report: existing, cached: true });

  const user = getUser(DEMO_USER_ID)!;
  const report = await generateMonthlyReport({
    userName: user.name,
    monthKey: mk,
    history: listBehaviorsForMonth(DEMO_USER_ID, mk),
    mood: listMood(DEMO_USER_ID).filter((m) => m.date.startsWith(mk)),
    medication: listMedication(DEMO_USER_ID).filter((m) => m.date.startsWith(mk)),
  });
  upsertMonthlyReport(DEMO_USER_ID, report);
  return NextResponse.json({ report, cached: false });
}
