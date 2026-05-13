import { isEnrolledInChallenge, listCommunityChallenges } from "@/lib/db";
import { getUserId } from "@/lib/session";

import CommunityClient from "./CommunityClient";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const userId = await getUserId();
  const challenges = listCommunityChallenges();
  const enrollment: Record<string, boolean> = {};
  for (const c of challenges) {
    enrollment[c.id] = isEnrolledInChallenge(c.id, userId);
  }
  return <CommunityClient challenges={challenges} enrollment={enrollment} />;
}
