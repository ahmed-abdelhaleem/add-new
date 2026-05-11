import { randomUUID } from "node:crypto";

import { insertHealthSample, listHealthSamples, updateUser } from "./db";
import type { HealthSample } from "./types";

/**
 * PRD §5 Feature 9 + §8 — wearable / health integration.
 *
 * TODO(integration:apple_health): Wrap the HealthKit framework in the iOS
 * app. Request these read permissions on first launch:
 *   HKQuantityTypeIdentifierStepCount
 *   HKCategoryTypeIdentifierSleepAnalysis
 *   HKQuantityTypeIdentifierHeartRate
 *   HKQuantityTypeIdentifierActiveEnergyBurned
 * Use HKObserverQuery for background updates; push samples to this endpoint.
 *
 * TODO(integration:google_fit): On Android, use Health Connect (the new
 * unified API) with the corresponding aggregate types. Background sync via
 * WorkManager every 30 minutes.
 *
 * TODO(integration:garmin/fitbit/polar): OAuth + their REST APIs. Garmin
 * needs the Connect IQ developer agreement. Fitbit has a 150 req/h limit
 * per user — back off accordingly.
 *
 * For the web prototype: connectHealthProvider() flags the user, and
 * recordSample() accepts manual entries or simulated webhook deliveries.
 */
export function connectHealthProvider(
  userId: string,
  provider: HealthSample["source"]
) {
  updateUser(userId, { health_provider: provider });
}

export function disconnectHealthProvider(userId: string) {
  updateUser(userId, { health_provider: null });
}

export function recordSample(opts: {
  userId: string;
  kind: HealthSample["kind"];
  value: number;
  unit?: string;
  source?: HealthSample["source"];
  sampledAt?: string;
}): HealthSample {
  const unit =
    opts.unit ??
    (opts.kind === "steps"
      ? "count"
      : opts.kind === "sleep"
        ? "hours"
        : opts.kind === "hr"
          ? "bpm"
          : "minutes");
  const sample: HealthSample = {
    id: randomUUID(),
    userId: opts.userId,
    kind: opts.kind,
    value: opts.value,
    unit,
    sampledAt: opts.sampledAt ?? new Date().toISOString(),
    source: opts.source ?? "manual",
  };
  insertHealthSample(sample);
  return sample;
}

export function dailyTotal(
  userId: string,
  kind: HealthSample["kind"],
  date: string
): number {
  const samples = listHealthSamples(userId, kind).filter((s) =>
    s.sampledAt.startsWith(date)
  );
  if (kind === "sleep" || kind === "hr") {
    if (samples.length === 0) return 0;
    return samples.reduce((s, x) => s + x.value, 0) / samples.length;
  }
  return samples.reduce((s, x) => s + x.value, 0);
}
