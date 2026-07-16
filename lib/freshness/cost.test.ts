import assert from "node:assert/strict";
import test from "node:test";

import { estimateCostUsd } from "./cost";

test("returns null when rates are not configured", () => {
  const usage = { inputTokens: 1000, outputTokens: 1000, cacheReadTokens: 0 };
  assert.equal(estimateCostUsd(usage, { inputPerMTok: null, outputPerMTok: null }), null);
  assert.equal(estimateCostUsd(usage, { inputPerMTok: 3, outputPerMTok: null }), null);
  assert.equal(estimateCostUsd(usage, { inputPerMTok: null, outputPerMTok: 15 }), null);
});

test("computes input + output + discounted cache-read cost", () => {
  const cost = estimateCostUsd(
    { inputTokens: 1_000_000, outputTokens: 200_000, cacheReadTokens: 500_000 },
    { inputPerMTok: 3, outputPerMTok: 15 },
  );
  // 3 + 3 + 0.15 = 6.15
  assert.equal(cost, 6.15);
});

test("zero usage costs zero when rates are set", () => {
  assert.equal(
    estimateCostUsd(
      { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 },
      { inputPerMTok: 3, outputPerMTok: 15 },
    ),
    0,
  );
});
