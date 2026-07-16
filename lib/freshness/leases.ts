/**
 * Expiring-lease math for crash-safe claims on sources (fetch phase) and
 * extraction jobs. A claim is only visible work when unexpired; the start-of-
 * run recovery sweep releases expired claims, increments attempts, and
 * dead-letters work that exhausted its attempts.
 */

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

export function leaseExpiry(now: Date, leaseMinutes: number): Date {
  return new Date(now.getTime() + Math.max(leaseMinutes, 1) * MINUTE_MS);
}

export function isLeaseExpired(now: Date, leaseExpiresAt: string | null): boolean {
  if (!leaseExpiresAt) return true;
  const expiry = new Date(leaseExpiresAt).getTime();
  if (Number.isNaN(expiry)) return true;
  return expiry < now.getTime();
}

export function shouldDeadLetter(attemptCount: number, maxAttempts: number): boolean {
  return attemptCount >= Math.max(maxAttempts, 1);
}

/** Retry delay after a failed/expired attempt: 2^attempt hours capped at 24h. */
export function computeAttemptRetryAt(now: Date, attemptCount: number): Date {
  const hours = Math.min(2 ** Math.max(attemptCount, 1), 24);
  return new Date(now.getTime() + hours * HOUR_MS);
}

/** A run is stale when it has been `running` for more than 2× the time budget. */
export function isRunStale(now: Date, startedAt: string, timeBudgetMs: number): boolean {
  const started = new Date(startedAt).getTime();
  if (Number.isNaN(started)) return true;
  return now.getTime() - started > 2 * timeBudgetMs;
}
