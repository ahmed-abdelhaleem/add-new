import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";

// Liveness + readiness check for Railway.
// 200 means the process is up AND the DB connection is healthy.
// This is intentionally separate from /api/health, which is the Health
// Integration feature (Apple Health / Google Fit / Garmin samples).
export async function GET() {
  try {
    const row = getDb().prepare("SELECT 1 as ok").get() as { ok: number };
    return NextResponse.json({
      status: "ok",
      db: row?.ok === 1,
      uptime: Math.round(process.uptime()),
      version: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
    });
  } catch (e) {
    return NextResponse.json(
      { status: "degraded", error: e instanceof Error ? e.message : String(e) },
      { status: 503 }
    );
  }
}
