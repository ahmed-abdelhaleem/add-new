import { listCalls } from "@/lib/db";
import { getUserId } from "@/lib/session";

import CallClient from "./CallClient";

export const dynamic = "force-dynamic";

export default async function CallPage() {
  const userId = await getUserId();
  return <CallClient initialCalls={listCalls(userId)} />;
}
