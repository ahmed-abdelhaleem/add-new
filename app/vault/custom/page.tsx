import { listVaultCustom } from "@/lib/db";
import { getUserId } from "@/lib/session";

import VaultCustomClient from "./VaultCustomClient";

export const dynamic = "force-dynamic";

export default async function VaultCustomPage() {
  const userId = await getUserId();
  return <VaultCustomClient initialItems={listVaultCustom(userId)} />;
}
