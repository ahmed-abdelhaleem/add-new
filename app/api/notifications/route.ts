import { NextResponse } from "next/server";
import { z } from "zod";

import {
  DEMO_USER_ID,
  getNotificationPrefs,
  listNotifications,
  markNotificationDismissed,
  markNotificationOpened,
  upsertNotificationPrefs,
} from "@/lib/db";
import {
  anchorCopy,
  dispatch,
  momentCopy,
  rescueCopy,
  surpriseCopy,
} from "@/lib/notifications";
import { currentStreak, summarizeMonth, pointsToSEK } from "@/lib/points";
import { listBehaviorsAll } from "@/lib/db";

export async function GET() {
  return NextResponse.json({
    prefs: getNotificationPrefs(DEMO_USER_ID),
    history: listNotifications(DEMO_USER_ID, 40),
  });
}

const prefsSchema = z.object({
  anchorEnabled: z.boolean().optional(),
  anchorTimeHHMM: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  momentsEnabled: z.boolean().optional(),
  surprisesEnabled: z.boolean().optional(),
  rescueEnabled: z.boolean().optional(),
});

export async function PUT(req: Request) {
  const parsed = prefsSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const current = getNotificationPrefs(DEMO_USER_ID);
  upsertNotificationPrefs(DEMO_USER_ID, { ...current, ...parsed.data });
  return NextResponse.json({ ok: true });
}

const dispatchSchema = z.object({
  type: z.enum(["anchor", "moment", "surprise", "rescue"]),
  variant: z.string().optional(),
  // For testing — caller can specify opensToday to override cap.
  opensToday: z.number().int().min(0).optional(),
});

// Trigger a notification — used for the prototype's "send a test" buttons.
// Production: cron + decay detector trigger these without UI involvement.
export async function POST(req: Request) {
  const parsed = dispatchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const prefs = getNotificationPrefs(DEMO_USER_ID);
  const history = listBehaviorsAll(DEMO_USER_ID);
  const streak = currentStreak(history);
  const summary = summarizeMonth(history);
  const recovered = Math.round(pointsToSEK(summary.total));

  let intent;
  switch (parsed.data.type) {
    case "anchor":
      intent = { type: "anchor" as const, ...anchorCopy({ streak, priorityCount: 3 }) };
      break;
    case "moment":
      intent = {
        type: "moment" as const,
        ...momentCopy((parsed.data.variant as "streak_7") ?? "streak_7", { value: recovered }),
      };
      break;
    case "surprise":
      intent = {
        type: "surprise" as const,
        ...surpriseCopy((parsed.data.variant as "double_hour") ?? "double_hour", {
          endsAt: new Date(Date.now() + 60 * 60 * 1000),
        }),
      };
      break;
    case "rescue":
      intent = { type: "rescue" as const, ...rescueCopy((parsed.data.variant as "still_here") ?? "still_here") };
      break;
  }
  const res = dispatch(DEMO_USER_ID, { ...intent, opensToday: parsed.data.opensToday }, prefs);
  return NextResponse.json(res);
}

const actSchema = z.object({ id: z.string(), action: z.enum(["open", "dismiss"]) });

export async function PATCH(req: Request) {
  const parsed = actSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.action === "open") markNotificationOpened(parsed.data.id);
  else markNotificationDismissed(parsed.data.id);
  return NextResponse.json({ ok: true });
}
