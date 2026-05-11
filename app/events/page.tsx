import { DEMO_USER_ID, listActiveBonusEvents, listAllBonusEvents } from "@/lib/db";

import EventsClient from "./EventsClient";

export const dynamic = "force-dynamic";

export default function EventsPage() {
  return (
    <EventsClient
      active={listActiveBonusEvents(DEMO_USER_ID)}
      history={listAllBonusEvents(DEMO_USER_ID)}
    />
  );
}
