import { DEMO_USER_ID, isEnrolledInChallenge, listCommunityChallenges } from "@/lib/db";

import CommunityClient from "./CommunityClient";

export const dynamic = "force-dynamic";

export default function CommunityPage() {
  const challenges = listCommunityChallenges();
  const enrollment: Record<string, boolean> = {};
  for (const c of challenges) {
    enrollment[c.id] = isEnrolledInChallenge(c.id, DEMO_USER_ID);
  }
  return <CommunityClient challenges={challenges} enrollment={enrollment} />;
}
