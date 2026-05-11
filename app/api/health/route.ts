import { NextResponse } from "next/server";
import { z } from "zod";

import {
  DEMO_USER_ID,
  getUser,
  listHealthSamples,
} from "@/lib/db";
import {
  connectHealthProvider,
  disconnectHealthProvider,
  recordSample,
} from "@/lib/health";

export async function GET() {
  const user = getUser(DEMO_USER_ID)!;
  return NextResponse.json({
    provider: user.health_provider,
    samples: {
      steps: listHealthSamples(DEMO_USER_ID, "steps"),
      sleep: listHealthSamples(DEMO_USER_ID, "sleep"),
      hr: listHealthSamples(DEMO_USER_ID, "hr"),
      workout: listHealthSamples(DEMO_USER_ID, "workout"),
    },
  });
}

const connectSchema = z.object({
  action: z.enum(["connect", "disconnect"]),
  provider: z.enum(["apple_health", "google_fit", "garmin", "fitbit"]).optional(),
});

export async function POST(req: Request) {
  const parsed = connectSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.action === "connect") {
    if (!parsed.data.provider) return NextResponse.json({ error: "Provider required" }, { status: 400 });
    connectHealthProvider(DEMO_USER_ID, parsed.data.provider);
  } else {
    disconnectHealthProvider(DEMO_USER_ID);
  }
  return NextResponse.json({ ok: true });
}

const sampleSchema = z.object({
  kind: z.enum(["steps", "sleep", "hr", "workout"]),
  value: z.number().min(0),
  unit: z.string().optional(),
  source: z.enum(["apple_health", "google_fit", "garmin", "fitbit", "manual"]).optional(),
});

export async function PUT(req: Request) {
  const parsed = sampleSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const sample = recordSample({ userId: DEMO_USER_ID, ...parsed.data });
  return NextResponse.json({ sample });
}
