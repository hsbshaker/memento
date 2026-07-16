import assert from "node:assert/strict";
import test from "node:test";

import { isStrongerEvidence } from "./evidence-strength";

const previous = {
  confidence: 0.7,
  evidenceExcerpt: "The credit amount is changing for eligible cards.",
  sourceId: "source-1",
};

test("identical evidence from the same source is not stronger", () => {
  const result = isStrongerEvidence(previous, { ...previous });
  assert.equal(result.stronger, false);
  assert.deepEqual(result.reasons, []);
});

test("materially higher confidence is stronger; marginal is not", () => {
  assert.equal(
    isStrongerEvidence(previous, { ...previous, confidence: 0.85 }).stronger,
    true,
  );
  assert.equal(
    isStrongerEvidence(previous, { ...previous, confidence: 0.8 }).stronger,
    false,
  );
});

test("newly present (non-negated) discontinuation language is stronger", () => {
  const result = isStrongerEvidence(previous, {
    ...previous,
    evidenceExcerpt: "This benefit is discontinued effective March 1.",
  });
  assert.equal(result.stronger, true);
  assert.ok(result.reasons.includes("discontinuation_language_new"));

  const negated = isStrongerEvidence(previous, {
    ...previous,
    evidenceExcerpt: "This benefit is not discontinued.",
  });
  assert.equal(negated.stronger, false);
});

test("corroboration from a different source is stronger", () => {
  const result = isStrongerEvidence(previous, { ...previous, sourceId: "source-2" });
  assert.equal(result.stronger, true);
  assert.ok(result.reasons.includes("corroborating_source"));
});

test("no upgrade when previous evidence already had discontinuation language", () => {
  const prevWithLanguage = {
    ...previous,
    evidenceExcerpt: "The benefit has been removed from this card.",
  };
  const result = isStrongerEvidence(prevWithLanguage, {
    ...prevWithLanguage,
    evidenceExcerpt: "The benefit is discontinued.",
  });
  assert.equal(result.stronger, false);
});
