import { NextResponse } from "next/server";
import { z } from "zod";

import { enrollInChallenge, isEnrolledInChallenge, listCommunityChallenges, unenrollFromChallenge } from "@/lib/db";
import { getUserId } from "@/lib/session";

export async function GET() {
  const userId = await getUserId();
  const challenges = listCommunityChallenges();
  const enrollment: Record<string, boolean> = {};
  for (const c of challenges) {
    enrollment[c.id] = isEnrolledInChallenge(c.id, userId);
  }
  return NextResponse.json({ challenges, enrollment });
}

const schema = z.object({ challengeId: z.string(), action: z.enum(["join", "leave"]) });

export async function POST(req: Request) {
  const userId = await getUserId();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.action === "join") {
    enrollInChallenge(parsed.data.challengeId, userId);
  } else {
    unenrollFromChallenge(parsed.data.challengeId, userId);
  }
  return NextResponse.json({ ok: true });
}
