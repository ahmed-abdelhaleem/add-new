import { getFoundation, listReadinessScores, listTriggerLogs } from "@/lib/db";
import { getUserId } from "@/lib/session";
import {
  deactivationHoursRemaining,
  deactivationReady,
} from "@/lib/foundation";

import FoundationClient from "./FoundationClient";

export const dynamic = "force-dynamic";

export default async function FoundationPage() {
  const userId = await getUserId();
  const state = getFoundation(userId);
  const triggerLogs = listTriggerLogs(userId, 50);
  const readiness = listReadinessScores(userId);
  return (
    <FoundationClient
      state={state ?? null}
      triggerLogs={triggerLogs}
      readiness={readiness}
      deactivationReady={state ? deactivationReady(state) : false}
      deactivationHoursRemaining={state ? deactivationHoursRemaining(state) : 72}
    />
  );
}
