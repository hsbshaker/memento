import assert from "node:assert/strict";
import test from "node:test";

import { computeNextCheckAt, computeRetryAt, isMonthlyVerificationDue } from "./scheduling";

const now = new Date("2026-07-15T12:00:00Z");
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

test("success advances by the cadence", () => {
  assert.equal(computeNextCheckAt(now, 7).getTime(), now.getTime() + 7 * DAY);
  assert.equal(computeNextCheckAt(now, 0).getTime(), now.getTime() + 1 * DAY);
});

test("failure backoff grows exponentially and is capped", () => {
  assert.equal(computeRetryAt(now, 1, 7).getTime(), now.getTime() + 2 * HOUR);
  assert.equal(computeRetryAt(now, 3, 7).getTime(), now.getTime() + 8 * HOUR);
  assert.equal(computeRetryAt(now, 10, 7).getTime(), now.getTime() + 24 * HOUR);
  // Cap also respects short cadences (a daily source retries within a day).
  assert.equal(computeRetryAt(now, 10, 1).getTime(), now.getTime() + 24 * HOUR);
});

test("monthly verification due at >30 days, never verified, or bad timestamps", () => {
  const daysAgo = (days: number) => new Date(now.getTime() - days * DAY).toISOString();
  assert.equal(isMonthlyVerificationDue(now, daysAgo(10)), false);
  assert.equal(isMonthlyVerificationDue(now, daysAgo(31)), true);
  assert.equal(isMonthlyVerificationDue(now, null), true);
  assert.equal(isMonthlyVerificationDue(now, "garbage"), true);
});
