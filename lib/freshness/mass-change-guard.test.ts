import assert from "node:assert/strict";
import test from "node:test";

import { evaluateMassChangeGuard } from "./mass-change-guard";

const limits = { cardChangeRatio: 0.4, minTripCount: 3, maxProposalsPerRun: 25 };

test("high change ratio on a card halts the run", () => {
  const result = evaluateMassChangeGuard({
    cardProposalCount: 6,
    cardBenefitCount: 10,
    runProposalsSoFar: 0,
    limits,
  });
  assert.equal(result.halted, true);
  assert.ok(result.reason?.includes("card_change_ratio_exceeded"));
});

test("min-count floor: 2 changes on a 3-benefit card does not false-trip", () => {
  const result = evaluateMassChangeGuard({
    cardProposalCount: 2,
    cardBenefitCount: 3,
    runProposalsSoFar: 0,
    limits,
  });
  assert.equal(result.halted, false);
});

test("ratio at or under the limit passes", () => {
  const result = evaluateMassChangeGuard({
    cardProposalCount: 4,
    cardBenefitCount: 10,
    runProposalsSoFar: 0,
    limits,
  });
  assert.equal(result.halted, false);
});

test("run-total limit halts across cards", () => {
  const result = evaluateMassChangeGuard({
    cardProposalCount: 2,
    cardBenefitCount: 20,
    runProposalsSoFar: 24,
    limits,
  });
  assert.equal(result.halted, true);
  assert.ok(result.reason?.includes("run_proposal_limit_exceeded"));
});

test("zero proposals never halts", () => {
  const result = evaluateMassChangeGuard({
    cardProposalCount: 0,
    cardBenefitCount: 0,
    runProposalsSoFar: 25,
    limits,
  });
  assert.equal(result.halted, false);
});
