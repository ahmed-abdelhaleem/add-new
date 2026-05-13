import { listActiveTrackEnrollments, listAllTrackEnrollments } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { TRACKS } from "@/lib/tracks";
import { BEHAVIOR_INDEX } from "@/lib/economy";

import TracksClient from "./TracksClient";

export const dynamic = "force-dynamic";

export default async function TracksPage() {
  const userId = await getUserId();
  const active = listActiveTrackEnrollments(userId);
  const history = listAllTrackEnrollments(userId);
  const trackInfo = TRACKS.map((t) => ({
    ...t,
    behaviorLabels: t.behaviors.map((b) => BEHAVIOR_INDEX[b]?.label ?? b),
  }));
  return <TracksClient tracks={trackInfo} active={active} history={history} />;
}
