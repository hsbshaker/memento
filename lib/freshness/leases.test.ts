import assert from "node:assert/strict";
import test from "node:test";

import {
  computeAttemptRetryAt,
  isLeaseExpired,
  isRunStale,
  leaseExpiry,
  shouldDeadLetter,
} from "./leases";

const now = new Date("2026-07-15T12:00:00Z");
const HOUR = 60 * 60 * 1000;

test("leaseExpiry adds the configured minutes", () => {
  assert.equal(leaseExpiry(now, 10).getTime(), now.getTime() + 10 * 60 * 1000);
  assert.equal(leaseExpiry(now, 0).getTime(), now.getTime() + 60 * 1000);
});

test("isLeaseExpired handles live, expired, missing, and malformed leases", () => {
  assert.equal(isLeaseExpired(now, new Date(now.getTime() + HOUR).toISOString()), false);
  assert.equal(isLeaseExpired(now, new Date(now.getTime() - 1000).toISOString()), true);
  assert.equal(isLeaseExpired(now, null), true);
  assert.equal(isLeaseExpired(now, "garbage"), true);
});

test("dead-letter threshold", () => {
  assert.equal(shouldDeadLetter(4, 5), false);
  assert.equal(shouldDeadLetter(5, 5), true);
  assert.equal(shouldDeadLetter(6, 5), true);
});

test("attempt retry backoff is exponential and capped at 24h", () => {
  assert.equal(computeAttemptRetryAt(now, 1).getTime(), now.getTime() + 2 * HOUR);
  assert.equal(computeAttemptRetryAt(now, 4).getTime(), now.getTime() + 16 * HOUR);
  assert.equal(computeAttemptRetryAt(now, 10).getTime(), now.getTime() + 24 * HOUR);
});

test("stale-run detection uses 2× the time budget", () => {
  const budget = 250_000;
  const fresh = new Date(now.getTime() - budget).toISOString();
  const stale = new Date(now.getTime() - 3 * budget).toISOString();
  assert.equal(isRunStale(now, fresh, budget), false);
  assert.equal(isRunStale(now, stale, budget), true);
  assert.equal(isRunStale(now, "garbage", budget), true);
});
