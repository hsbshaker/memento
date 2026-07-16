import assert from "node:assert/strict";
import test from "node:test";

import { computeStaleness } from "./staleness";

const now = new Date("2026-07-15T00:00:00Z");
const daysAgo = (days: number) =>
  new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

const base = {
  now,
  cadenceDays: 7,
  consecutiveFailureCount: 0,
  failureThreshold: 3,
  hasOpenProposals: false,
};

test("state boundaries around the cadence multipliers", () => {
  assert.equal(computeStaleness({ ...base, lastVerifiedAt: daysAgo(3) }), "current");
  assert.equal(computeStaleness({ ...base, lastVerifiedAt: daysAgo(10) }), "current");
  assert.equal(computeStaleness({ ...base, lastVerifiedAt: daysAgo(11) }), "verification_due");
  assert.equal(computeStaleness({ ...base, lastVerifiedAt: daysAgo(21) }), "verification_due");
  assert.equal(computeStaleness({ ...base, lastVerifiedAt: daysAgo(22) }), "stale");
});

test("never-verified sources are verification_due", () => {
  assert.equal(computeStaleness({ ...base, lastVerifiedAt: null }), "verification_due");
  assert.equal(computeStaleness({ ...base, lastVerifiedAt: "garbage" }), "verification_due");
});

test("repeated failures dominate freshness", () => {
  assert.equal(
    computeStaleness({ ...base, lastVerifiedAt: daysAgo(1), consecutiveFailureCount: 3 }),
    "source_unavailable",
  );
});

test("open proposals dominate everything", () => {
  assert.equal(
    computeStaleness({
      ...base,
      lastVerifiedAt: daysAgo(1),
      consecutiveFailureCount: 5,
      hasOpenProposals: true,
    }),
    "review_required",
  );
});
