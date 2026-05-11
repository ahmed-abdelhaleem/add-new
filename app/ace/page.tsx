import {
  DEMO_USER_ID,
  listAceMessages,
  listBehaviorsAll,
} from "@/lib/db";
import { computeEngagement, decayMessage } from "@/lib/decay";

import AceClient from "./AceClient";

export const dynamic = "force-dynamic";

export default function AcePage() {
  const messages = listAceMessages(DEMO_USER_ID, 30)
    .reverse()
    .map((m) => ({ id: m.id, role: m.role, content: m.content, createdAt: m.created_at }));
  const engagement = computeEngagement(listBehaviorsAll(DEMO_USER_ID));
  const decay = decayMessage(engagement.decayTier);

  return <AceClient initialMessages={messages} decayTier={engagement.decayTier} decay={decay} />;
}
