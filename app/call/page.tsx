import { DEMO_USER_ID, listCalls } from "@/lib/db";

import CallClient from "./CallClient";

export const dynamic = "force-dynamic";

export default function CallPage() {
  return <CallClient initialCalls={listCalls(DEMO_USER_ID)} />;
}
