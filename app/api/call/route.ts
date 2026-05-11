import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { respondAsAce } from "@/lib/ace";
import {
  DEMO_USER_ID,
  getUser,
  insertCall,
  listBehaviorsAll,
  listCalls,
  recordBonus,
} from "@/lib/db";
import { computeEngagement } from "@/lib/decay";
import { monthKey } from "@/lib/time";

const CALL_BONUS_POINTS = 1500;

// Optional weekly check-in (PRD §5 Feature 7). 5 min max, awards bonus on
// completion. Client uses the browser's Web Speech API to capture turns.
// TODO(integration:tts): For server-driven voice we'd add ElevenLabs /
// Cartesia TTS for ACE replies and stream PCM via a WebSocket. For now the
// client speaks the text replies via window.speechSynthesis.

export async function GET() {
  return NextResponse.json({ calls: listCalls(DEMO_USER_ID) });
}

const schema = z.object({
  transcript: z.array(
    z.object({
      role: z.enum(["user", "ace"]),
      text: z.string().min(1).max(2000),
      at: z.string(),
    })
  ).min(2),
  startedAt: z.string(),
  endedAt: z.string(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const id = randomUUID();
  insertCall(DEMO_USER_ID, {
    id,
    startedAt: parsed.data.startedAt,
    endedAt: parsed.data.endedAt,
    transcript: parsed.data.transcript,
    awardedPoints: CALL_BONUS_POINTS,
  });
  recordBonus(DEMO_USER_ID, monthKey(), CALL_BONUS_POINTS);
  return NextResponse.json({ id, awarded: CALL_BONUS_POINTS });
}

const replySchema = z.object({ text: z.string().min(1).max(2000) });

// One-turn ACE reply for the call surface. Reuses the regular ACE
// system prompt but caps length tighter — these get spoken aloud.
export async function PUT(req: Request) {
  const parsed = replySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const user = getUser(DEMO_USER_ID)!;
  const history = listBehaviorsAll(DEMO_USER_ID);
  const engagement = computeEngagement(history);
  const reply = await respondAsAce(parsed.data.text, {
    userName: user.name,
    tier: user.tier,
    stakeSEK: user.stake_sek,
    monthHistory: history,
    engagement,
    recentMessages: [],
  });
  return NextResponse.json({ reply });
}
