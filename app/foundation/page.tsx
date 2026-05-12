import {
  DEMO_USER_ID,
  getFoundation,
  listReadinessScores,
  listTriggerLogs,
} from "@/lib/db";
import {
  deactivationHoursRemaining,
  deactivationReady,
} from "@/lib/foundation";

import FoundationClient from "./FoundationClient";

export const dynamic = "force-dynamic";

export default function FoundationPage() {
  const state = getFoundation(DEMO_USER_ID);
  const triggerLogs = listTriggerLogs(DEMO_USER_ID, 50);
  const readiness = listReadinessScores(DEMO_USER_ID);
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
