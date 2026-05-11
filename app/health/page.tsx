import { DEMO_USER_ID, getUser, listHealthSamples } from "@/lib/db";

import HealthClient from "./HealthClient";

export const dynamic = "force-dynamic";

export default function HealthPage() {
  const user = getUser(DEMO_USER_ID)!;
  const samples = {
    steps: listHealthSamples(DEMO_USER_ID, "steps"),
    sleep: listHealthSamples(DEMO_USER_ID, "sleep"),
    hr: listHealthSamples(DEMO_USER_ID, "hr"),
    workout: listHealthSamples(DEMO_USER_ID, "workout"),
  };
  return <HealthClient provider={user.health_provider} samples={samples} />;
}
