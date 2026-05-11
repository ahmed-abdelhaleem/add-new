import { NextResponse } from "next/server";
import { z } from "zod";

import { respondAsAce } from "@/lib/ace";
import {
  DEMO_USER_ID,
  getUser,
  insertAceMessage,
  listAceMessages,
  listBehaviorsAll,
} from "@/lib/db";
import { computeEngagement } from "@/lib/decay";

const schema = z.object({
  message: z.string().min(1).max(2000),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const userId = DEMO_USER_ID;
  const user = getUser(userId);
  if (!user) return NextResponse.json({ error: "No user" }, { status: 404 });

  const history = listBehaviorsAll(userId);
  const engagement = computeEngagement(history);

  const past = listAceMessages(userId, 12)
    .reverse()
    .map((m) => ({ role: m.role, content: m.content }));

  const userMsg = insertAceMessage(userId, "user", parsed.data.message);
  const reply = await respondAsAce(parsed.data.message, {
    userName: user.name,
    tier: user.tier,
    stakeSEK: user.stake_sek,
    monthHistory: history,
    engagement,
    recentMessages: past,
  });
  const assistantMsg = insertAceMessage(userId, "assistant", reply);

  return NextResponse.json({ user: userMsg, assistant: assistantMsg, engagement });
}
