/**
 * Source scheduling math: cadence advancement on success, capped exponential
 * backoff on failure, and monthly full-verification due checks.
 */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const MONTHLY_VERIFICATION_DAYS = 30;

export function computeNextCheckAt(now: Date, cadenceDays: number): Date {
  return new Date(now.getTime() + Math.max(cadenceDays, 1) * DAY_MS);
}

/**
 * Failure backoff: 2^attempt hours, capped at the source cadence (a failing
 * source is never retried less often than its normal schedule) and at 24h.
 */
export function computeRetryAt(now: Date, attemptCount: number, cadenceDays: number): Date {
  const backoffHours = Math.min(2 ** Math.max(attemptCount, 1), 24, Math.max(cadenceDays, 1) * 24);
  return new Date(now.getTime() + backoffHours * HOUR_MS);
}

export function isMonthlyVerificationDue(
  now: Date,
  lastContentVerifiedAt: string | null,
): boolean {
  if (!lastContentVerifiedAt) return true;
  const verifiedAt = new Date(lastContentVerifiedAt).getTime();
  if (Number.isNaN(verifiedAt)) return true;
  return now.getTime() - verifiedAt > MONTHLY_VERIFICATION_DAYS * DAY_MS;
}
