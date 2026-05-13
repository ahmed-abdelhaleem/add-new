import { NextResponse } from "next/server";
import { z } from "zod";

import { getUser, listHealthSamples } from "@/lib/db";
import { isHealthWearablesIntegrationEnabled } from "@/lib/integrations";
import { getUserId } from "@/lib/session";
import {
  connectHealthProvider,
  disconnectHealthProvider,
  recordSample,
} from "@/lib/health";

export async function GET() {
  const userId = await getUserId();
  const user = getUser(userId)!;
  return NextResponse.json({
    provider: user.health_provider,
    samples: {
      steps: listHealthSamples(userId, "steps"),
      sleep: listHealthSamples(userId, "sleep"),
      hr: listHealthSamples(userId, "hr"),
      workout: listHealthSamples(userId, "workout"),
    },
  });
}

const connectSchema = z.object({
  action: z.enum(["connect", "disconnect"]),
  provider: z.enum(["apple_health", "google_fit", "garmin", "fitbit"]).optional(),
});

export async function POST(req: Request) {
  const userId = await getUserId();
  const parsed = connectSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.action === "connect") {
    if (!isHealthWearablesIntegrationEnabled()) {
      return NextResponse.json({ error: "Health / wearables integration is disabled in admin settings." }, { status: 503 });
    }
    if (!parsed.data.provider) return NextResponse.json({ error: "Provider required" }, { status: 400 });
    connectHealthProvider(userId, parsed.data.provider);
  } else {
    disconnectHealthProvider(userId);
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
  const userId = await getUserId();
  const parsed = sampleSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const sample = recordSample({ userId: userId, ...parsed.data });
  return NextResponse.json({ sample });
}
