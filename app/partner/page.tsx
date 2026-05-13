import { getPartner, listBehaviorsAll, listPartnerBoosts } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { buildWeeklyDigest } from "@/lib/accountability";
import { getUser } from "@/lib/db";

import PartnerClient from "./PartnerClient";

export const dynamic = "force-dynamic";

export default async function PartnerPage() {
  const userId = await getUserId();
  const partner = getPartner(userId);
  const boosts = listPartnerBoosts(userId);
  const user = getUser(userId)!;
  const digest = partner
    ? buildWeeklyDigest({
        userName: user.name,
        partnerName: partner.name,
        history: listBehaviorsAll(userId),
      })
    : null;
  return <PartnerClient initialPartner={partner ?? null} initialBoosts={boosts} digest={digest} />;
}
