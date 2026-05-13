import { listAceMessages, listBehaviorsAll } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { computeEngagement, decayMessage } from "@/lib/decay";

import AceClient from "./AceClient";

export const dynamic = "force-dynamic";

export default async function AcePage() {
  const userId = await getUserId();
  const messages = listAceMessages(userId, 30)
    .reverse()
    .map((m) => ({ id: m.id, role: m.role, content: m.content, createdAt: m.created_at }));
  const engagement = computeEngagement(listBehaviorsAll(userId));
  const decay = decayMessage(engagement.decayTier);

  return <AceClient initialMessages={messages} decayTier={engagement.decayTier} decay={decay} />;
}
