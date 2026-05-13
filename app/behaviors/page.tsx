import { listBehaviorOverrides, listCustomBehaviors } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { BEHAVIORS } from "@/lib/economy";

import BehaviorsClient from "./BehaviorsClient";

export const dynamic = "force-dynamic";

export default async function BehaviorsPage() {
  const userId = await getUserId();
  return (
    <BehaviorsClient
      builtIn={BEHAVIORS}
      custom={listCustomBehaviors(userId)}
      overrides={listBehaviorOverrides(userId)}
    />
  );
}
