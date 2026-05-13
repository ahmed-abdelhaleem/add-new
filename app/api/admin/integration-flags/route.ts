import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { setIntegrationFlag } from "@/lib/db";
import type { IntegrationKey } from "@/lib/integrations";

const keySchema = z.enum([
  "google_oauth",
  "anthropic",
  "payments",
  "health_wearables",
  "bank_linking",
  "voice_tts",
]);

const bodySchema = z.object({
  key: keySchema,
  enabled: z.boolean(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  setIntegrationFlag(parsed.data.key as IntegrationKey, parsed.data.enabled);
  return NextResponse.json({ ok: true });
}
