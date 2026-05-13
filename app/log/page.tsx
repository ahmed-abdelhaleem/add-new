import { listBehaviorOverrides, listCustomBehaviors, getUserSettings } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { BEHAVIORS } from "@/lib/economy";

import LogClient from "./LogClient";

export const dynamic = "force-dynamic";

export default async function LogPage() {
  const userId = await getUserId();
  return (
    <LogClient
      behaviors={BEHAVIORS}
      overrides={listBehaviorOverrides(userId)}
      custom={listCustomBehaviors(userId)}
      confirmBeforeLog={getUserSettings(userId).confirmBeforeLog}
    />
  );
}
