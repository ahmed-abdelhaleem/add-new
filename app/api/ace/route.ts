import { NextResponse } from "next/server";
import { z } from "zod";

import { respondAsAce } from "@/lib/ace";
import {
  DEMO_USER_ID,
  getFoundation,
  getUser,
  insertAceMessage,
  listAceMessages,
  listBehaviorsAll,
  listMealLogs,
  listReadinessScores,
  listTriggerLogs,
} from "@/lib/db";
import { computeEngagement } from "@/lib/decay";
import { weekKeyFor } from "@/lib/foundation";
import { mealStreak, planVsDeliveryRatio } from "@/lib/nourish";
import { monthKey } from "@/lib/time";

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

  // Foundation context
  const foundationState = getFoundation(userId);
  let foundation;
  if (foundationState && !foundationState.deactivatedAt) {
    const week = weekKeyFor(new Date());
    const readinessRows = listReadinessScores(userId);
    const latest = readinessRows[readinessRows.length - 1];
    const triggers = listTriggerLogs(userId, 500);
    const triggersThisWeek = triggers.filter((t) => weekKeyFor(new Date(t.loggedAt)) === week);
    foundation = {
      active: true,
      daysSinceActivation: Math.floor(
        (Date.now() - new Date(foundationState.activatedAt).getTime()) / (1000 * 60 * 60 * 24)
      ),
      commitment: foundationState.commitment,
      readinessTotal: latest?.total ?? 0,
      readinessPhase: latest?.phase ?? "Foundation",
      triggersThisWeek: triggersThisWeek.length,
      redirectsCompletedThisWeek: triggersThisWeek.filter((t) => t.redirectCompletedAt).length,
    };
  }

  // Nourish context
  const mealLogs = listMealLogs(userId);
  const monthLogs = mealLogs.filter((l) => l.date.startsWith(monthKey()));
  const ratio = planVsDeliveryRatio(monthLogs);
  const nourish = {
    mealStreak: mealStreak(mealLogs),
    plannedDaysThisMonth: ratio.plannedDays,
    deliveryDaysThisMonth: ratio.deliveryDays,
  };

  const userMsg = insertAceMessage(userId, "user", parsed.data.message);
  const reply = await respondAsAce(parsed.data.message, {
    userName: user.name,
    tier: user.tier,
    stakeSEK: user.stake_sek,
    monthHistory: history,
    engagement,
    recentMessages: past,
    foundation,
    nourish,
  });
  const assistantMsg = insertAceMessage(userId, "assistant", reply);

  return NextResponse.json({ user: userMsg, assistant: assistantMsg, engagement });
}
