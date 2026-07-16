import type { StalenessState } from "@/lib/constants/freshness-schema";

/**
 * Derived staleness for a source/benefit pairing. Priority order:
 * review_required > source_unavailable > stale > verification_due > current.
 * Never-verified entries are verification_due (they need a first semantic
 * verification, not an alarm).
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export const VERIFICATION_DUE_MULTIPLIER = 1.5;
export const STALE_MULTIPLIER = 3;

export interface StalenessInput {
  now: Date;
  lastVerifiedAt: string | null;
  cadenceDays: number;
  consecutiveFailureCount: number;
  failureThreshold: number;
  hasOpenProposals: boolean;
}

export function computeStaleness(input: StalenessInput): StalenessState {
  if (input.hasOpenProposals) return "review_required";
  if (input.consecutiveFailureCount >= input.failureThreshold) return "source_unavailable";

  if (!input.lastVerifiedAt) return "verification_due";

  const verifiedAt = new Date(input.lastVerifiedAt).getTime();
  if (Number.isNaN(verifiedAt)) return "verification_due";

  const ageMs = input.now.getTime() - verifiedAt;
  const cadenceMs = Math.max(input.cadenceDays, 1) * DAY_MS;

  if (ageMs > STALE_MULTIPLIER * cadenceMs) return "stale";
  if (ageMs > VERIFICATION_DUE_MULTIPLIER * cadenceMs) return "verification_due";
  return "current";
}
