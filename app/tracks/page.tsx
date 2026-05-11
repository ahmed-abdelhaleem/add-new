import {
  DEMO_USER_ID,
  listActiveTrackEnrollments,
  listAllTrackEnrollments,
} from "@/lib/db";
import { TRACKS } from "@/lib/tracks";
import { BEHAVIOR_INDEX } from "@/lib/economy";

import TracksClient from "./TracksClient";

export const dynamic = "force-dynamic";

export default function TracksPage() {
  const active = listActiveTrackEnrollments(DEMO_USER_ID);
  const history = listAllTrackEnrollments(DEMO_USER_ID);
  const trackInfo = TRACKS.map((t) => ({
    ...t,
    behaviorLabels: t.behaviors.map((b) => BEHAVIOR_INDEX[b]?.label ?? b),
  }));
  return <TracksClient tracks={trackInfo} active={active} history={history} />;
}
