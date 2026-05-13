import { listActiveBonusEvents, listAllBonusEvents } from "@/lib/db";
import { getUserId } from "@/lib/session";

import EventsClient from "./EventsClient";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const userId = await getUserId();
  return (
    <EventsClient
      active={listActiveBonusEvents(userId)}
      history={listAllBonusEvents(userId)}
    />
  );
}
