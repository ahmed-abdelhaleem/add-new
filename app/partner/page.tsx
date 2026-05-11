import {
  DEMO_USER_ID,
  getPartner,
  listBehaviorsAll,
  listPartnerBoosts,
} from "@/lib/db";
import { buildWeeklyDigest } from "@/lib/accountability";
import { getUser } from "@/lib/db";

import PartnerClient from "./PartnerClient";

export const dynamic = "force-dynamic";

export default function PartnerPage() {
  const partner = getPartner(DEMO_USER_ID);
  const boosts = listPartnerBoosts(DEMO_USER_ID);
  const user = getUser(DEMO_USER_ID)!;
  const digest = partner
    ? buildWeeklyDigest({
        userName: user.name,
        partnerName: partner.name,
        history: listBehaviorsAll(DEMO_USER_ID),
      })
    : null;
  return <PartnerClient initialPartner={partner ?? null} initialBoosts={boosts} digest={digest} />;
}
