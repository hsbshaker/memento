import assert from "node:assert/strict";
import test from "node:test";

import { evaluateRemovalGate, REMOVAL_GATE_VERSION } from "./removal-gate";

const base = {
  removalClaim: true,
  matchedExistingBenefit: true,
  evidenceVerified: true,
  confidence: 0.9,
};

test("explicit discontinuation language passes the gate", () => {
  const result = evaluateRemovalGate({
    ...base,
    evidenceExcerpt:
      "Effective January 1, 2027, the airline fee credit is no longer available on this card.",
  });
  assert.equal(result.passed, true);
  assert.equal(result.version, REMOVAL_GATE_VERSION);
  assert.ok(result.matched_phrases.some((p) => /no longer available/i.test(p)));
  assert.deepEqual(result.reasons, []);
});

test("negated discontinuation language fails the gate", () => {
  const cases = [
    "This benefit is not discontinued and remains part of your card.",
    "The hotel credit will not end this year.",
    "Your credit hasn’t been removed from the account.",
  ];
  for (const evidenceExcerpt of cases) {
    const result = evaluateRemovalGate({ ...base, evidenceExcerpt });
    assert.equal(result.passed, false, evidenceExcerpt);
    assert.ok(
      result.reasons.includes("discontinuation_language_negated") ||
        result.reasons.includes("no_discontinuation_language"),
      `${evidenceExcerpt} → ${result.reasons.join(",")}`,
    );
    assert.equal(result.matched_phrases.length, 0, evidenceExcerpt);
  }
});

test("mixed evidence: a genuine phrase passes even when another is negated", () => {
  const result = evaluateRemovalGate({
    ...base,
    evidenceExcerpt:
      "The lounge benefit is not discontinued; however, the airline fee credit has been removed.",
  });
  assert.equal(result.passed, true);
  assert.ok(result.negated_phrases.length > 0);
  assert.ok(result.matched_phrases.length > 0);
});

test("each precondition is enforced and reported", () => {
  const evidenceExcerpt = "This benefit is discontinued as of March 1.";

  const noClaim = evaluateRemovalGate({ ...base, removalClaim: false, evidenceExcerpt });
  assert.ok(!noClaim.passed && noClaim.reasons.includes("no_removal_claim"));

  const noMatch = evaluateRemovalGate({ ...base, matchedExistingBenefit: false, evidenceExcerpt });
  assert.ok(!noMatch.passed && noMatch.reasons.includes("no_matched_benefit"));

  const noEvidence = evaluateRemovalGate({ ...base, evidenceVerified: false, evidenceExcerpt });
  assert.ok(!noEvidence.passed && noEvidence.reasons.includes("evidence_not_verified"));

  const lowConfidence = evaluateRemovalGate({ ...base, confidence: 0.6, evidenceExcerpt });
  assert.ok(!lowConfidence.passed && lowConfidence.reasons.includes("confidence_below_threshold"));

  const noLanguage = evaluateRemovalGate({
    ...base,
    evidenceExcerpt: "Enjoy up to $200 in credits annually.",
  });
  assert.ok(!noLanguage.passed && noLanguage.reasons.includes("no_discontinuation_language"));
});

test("gate result is versioned", () => {
  const result = evaluateRemovalGate({ ...base, evidenceExcerpt: "discontinued" });
  assert.equal(typeof result.version, "number");
  assert.equal(result.version, REMOVAL_GATE_VERSION);
});
