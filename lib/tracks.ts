import type { BehaviorKey, ChallengeTrack } from "./types";

// PRD §5 Feature 8 — 3-week rotating tracks. Each adds 3 supplementary
// behaviors to the daily earning menu and applies a 1.5× track multiplier
// to those behaviors for the enrollment window.
export const TRACKS: ChallengeTrack[] = [
  {
    key: "morning_person",
    title: "The Morning Person Track",
    description: "Earlier energy peak, more morning workouts.",
    behaviors: ["sleep_7_9", "gym_session", "swedish_study"] as BehaviorKey[],
    durationDays: 21,
    trackMultiplier: 1.5,
  },
  {
    key: "stockholm_explorer",
    title: "The Stockholm Explorer Track",
    description: "Six outings, four new neighborhoods.",
    behaviors: ["left_apartment_social", "group_event", "personal_connect"] as BehaviorKey[],
    durationDays: 21,
    trackMultiplier: 1.5,
  },
  {
    key: "chef",
    title: "The Chef Track",
    description: "Home cooking replaces delivery.",
    behaviors: ["home_cooked_meal", "no_delivery_today", "reading_20"] as BehaviorKey[],
    durationDays: 21,
    trackMultiplier: 1.5,
  },
  {
    key: "language_sprint",
    title: "The Language Sprint",
    description: "Three weeks of Swedish daily.",
    behaviors: ["swedish_study", "course_lesson", "reading_20"] as BehaviorKey[],
    durationDays: 21,
    trackMultiplier: 1.5,
  },
  {
    key: "outdoor_january",
    title: "The Outdoor January",
    description: "Dark months: more outdoor steps, more daylight.",
    behaviors: ["steps_10k", "sport_session", "left_apartment_social"] as BehaviorKey[],
    durationDays: 21,
    trackMultiplier: 1.5,
  },
];

export const TRACK_INDEX: Record<string, ChallengeTrack> = Object.fromEntries(
  TRACKS.map((t) => [t.key, t])
);
