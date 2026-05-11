import { DEMO_USER_ID, getUser } from "@/lib/db";

import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const user = getUser(DEMO_USER_ID)!;
  return (
    <SettingsClient
      initial={{
        name: user.name,
        stakeSEK: user.stake_sek,
        charity: user.charity,
        tier: user.tier,
      }}
    />
  );
}
