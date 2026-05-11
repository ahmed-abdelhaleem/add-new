/**
 * PRD §7 — anti-gaming verification stubs.
 *
 * TODO(integration:gps): Mobile app sends `{ lat, lng, durationMinutes }`
 * when the user logs a gym session. Verify the coordinates land within
 * the bounding box of a known SATS / Friskis & Svettis / Nordic Wellness
 * gym, and that the user stayed there ≥ 30 min. Use a static gym dataset
 * for MVP (~3,000 Swedish gyms) — server-side check, do not trust the
 * client's "verified" flag.
 *
 * TODO(integration:food_photo): For the meal-photo bonus, run the image
 * through Claude vision (anthropic.messages.create with type image_url)
 * and ask: "Is this a home-cooked meal? Yes / No / Unclear." Award bonus
 * only on Yes. Reject anything > 5MB or non-jpeg.
 *
 * TODO(integration:partner_verify): On partner invitation, send an email
 * with a tokenized link that the partner clicks to confirm. Verified flag
 * flips to true only on click (Resend / Postmark for delivery).
 */

export interface GymVerificationInput {
  lat?: number;
  lng?: number;
  durationMinutes?: number;
  // Bypass flag for the web prototype — user attests they went.
  attested?: boolean;
}

export interface GymVerificationResult {
  verified: boolean;
  reason: string;
  stub: boolean;
}

const STUB_REASON =
  "Stubbed for web prototype — production verifies via GPS + dwell time.";

export function verifyGymSession(input: GymVerificationInput): GymVerificationResult {
  if (input.attested) {
    return { verified: true, reason: "User-attested. " + STUB_REASON, stub: true };
  }
  if (input.lat != null && input.lng != null && (input.durationMinutes ?? 0) >= 30) {
    return {
      verified: true,
      reason: `GPS within bounding box + ${input.durationMinutes} min dwell. ${STUB_REASON}`,
      stub: true,
    };
  }
  return {
    verified: false,
    reason: "No GPS data and not attested.",
    stub: true,
  };
}

export interface FoodPhotoVerification {
  bonusEligible: boolean;
  reason: string;
  stub: boolean;
}

export function verifyFoodPhoto(_filename?: string): FoodPhotoVerification {
  return {
    bonusEligible: !!_filename,
    reason: `Stubbed — upload accepted; production runs Claude vision.`,
    stub: true,
  };
}

export interface ManualStepVerification {
  allowed: boolean;
  cappedPoints: number;
  reason: string;
}

export const MANUAL_STEPS_DAILY_CAP_POINTS = 500;

export function verifyManualSteps(currentDayManualPoints: number, requestedPoints: number): ManualStepVerification {
  const remaining = Math.max(0, MANUAL_STEPS_DAILY_CAP_POINTS - currentDayManualPoints);
  const capped = Math.min(requestedPoints, remaining);
  return {
    allowed: capped > 0,
    cappedPoints: capped,
    reason:
      capped < requestedPoints
        ? `Manual entries capped at ${MANUAL_STEPS_DAILY_CAP_POINTS} pts/day. Wearable preferred.`
        : "OK",
  };
}
