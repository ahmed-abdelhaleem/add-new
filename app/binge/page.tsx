import { getUserSettings, listBinges } from "@/lib/db";
import { getUserId } from "@/lib/session";

import BingeClient from "./BingeClient";

export const dynamic = "force-dynamic";

export default async function BingePage() {
  const userId = await getUserId();
  return (
    <BingeClient
      initialLogs={listBinges(userId, 100)}
      initialSettings={getUserSettings(userId)}
    />
  );
}
