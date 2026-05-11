import { NextResponse } from "next/server";
import { z } from "zod";

import {
  DEMO_USER_ID,
  completeTrack,
  insertTrackEnrollment,
  listActiveTrackEnrollments,
  listAllTrackEnrollments,
} from "@/lib/db";
import { TRACK_INDEX, TRACKS } from "@/lib/tracks";

export async function GET() {
  return NextResponse.json({
    tracks: TRACKS,
    active: listActiveTrackEnrollments(DEMO_USER_ID),
    history: listAllTrackEnrollments(DEMO_USER_ID),
  });
}

const enrollSchema = z.object({ trackKey: z.string() });

export async function POST(req: Request) {
  const parsed = enrollSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const track = TRACK_INDEX[parsed.data.trackKey];
  if (!track) return NextResponse.json({ error: "Unknown track" }, { status: 404 });

  const enrolledAt = new Date();
  const endsAt = new Date(enrolledAt);
  endsAt.setDate(endsAt.getDate() + track.durationDays);

  const enrollment = insertTrackEnrollment({
    userId: DEMO_USER_ID,
    trackKey: track.key,
    enrolledAt: enrolledAt.toISOString(),
    endsAt: endsAt.toISOString(),
  });
  return NextResponse.json({ enrollment });
}

const completeSchema = z.object({ id: z.string() });

export async function PATCH(req: Request) {
  const parsed = completeSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  completeTrack(parsed.data.id);
  return NextResponse.json({ ok: true });
}
