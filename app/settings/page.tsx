import { getUser, getUserSettings } from "@/lib/db";
import { getUserId } from "@/lib/session";

import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const userId = await getUserId();
  const user = getUser(userId)!;
  return (
    <SettingsClient
      initial={{
        name: user.name,
        stakeSEK: user.stake_sek,
        charity: user.charity,
        tier: user.tier,
      }}
      settings={getUserSettings(userId)}
    />
  );
}
