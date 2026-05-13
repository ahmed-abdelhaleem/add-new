import { getUser, listHealthSamples } from "@/lib/db";
import { getUserId } from "@/lib/session";

import HealthClient from "./HealthClient";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const userId = await getUserId();
  const user = getUser(userId)!;
  const samples = {
    steps: listHealthSamples(userId, "steps"),
    sleep: listHealthSamples(userId, "sleep"),
    hr: listHealthSamples(userId, "hr"),
    workout: listHealthSamples(userId, "workout"),
  };
  return <HealthClient provider={user.health_provider} samples={samples} />;
}
