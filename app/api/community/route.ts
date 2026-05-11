import { NextResponse } from "next/server";
import { z } from "zod";

import {
  DEMO_USER_ID,
  enrollInChallenge,
  isEnrolledInChallenge,
  listCommunityChallenges,
  unenrollFromChallenge,
} from "@/lib/db";

export async function GET() {
  const challenges = listCommunityChallenges();
  const enrollment: Record<string, boolean> = {};
  for (const c of challenges) {
    enrollment[c.id] = isEnrolledInChallenge(c.id, DEMO_USER_ID);
  }
  return NextResponse.json({ challenges, enrollment });
}

const schema = z.object({ challengeId: z.string(), action: z.enum(["join", "leave"]) });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.action === "join") {
    enrollInChallenge(parsed.data.challengeId, DEMO_USER_ID);
  } else {
    unenrollFromChallenge(parsed.data.challengeId, DEMO_USER_ID);
  }
  return NextResponse.json({ ok: true });
}
