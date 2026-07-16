import assert from "node:assert/strict";
import test from "node:test";

import type { BenefitCanonicalState } from "@/lib/benefits/benefit-fields";
import { canonicalStateHash, computeProposalDedupeKey } from "./dedupe-key";

const after: BenefitCanonicalState = {
  benefit_name: "Airline Fee Credit",
  benefit_value: "Up to $200 annually",
  cadence: "annual",
  reset_timing: "calendar year",
  enrollment_required: true,
  requires_setup: false,
  display_description: null,
};

const base = {
  cardId: "card-1",
  benefitId: "benefit-1",
  operation: "modify" as const,
  after,
  effectiveDate: null,
  candidateName: "Airline Fee Credit",
};

test("dedupe key is stable across reruns", () => {
  assert.equal(computeProposalDedupeKey(base), computeProposalDedupeKey({ ...base }));
});

test("dedupe key changes with the proposed after-state", () => {
  const changed = computeProposalDedupeKey({
    ...base,
    after: { ...after, benefit_value: "Up to $250 annually" },
  });
  assert.notEqual(computeProposalDedupeKey(base), changed);
});

test("operations are distinct for the same benefit", () => {
  const modify = computeProposalDedupeKey(base);
  const remove = computeProposalDedupeKey({ ...base, operation: "remove", after: null });
  const expire = computeProposalDedupeKey({
    ...base,
    operation: "expire",
    after: null,
    effectiveDate: "2026-09-01",
  });
  assert.notEqual(modify, remove);
  assert.notEqual(modify, expire);
  assert.notEqual(remove, expire);
});

test("expire keys differ by effective date; unknown date is its own key", () => {
  const dated = computeProposalDedupeKey({ ...base, operation: "expire", effectiveDate: "2026-09-01" });
  const otherDate = computeProposalDedupeKey({ ...base, operation: "expire", effectiveDate: "2026-10-01" });
  const unknown = computeProposalDedupeKey({ ...base, operation: "expire", effectiveDate: null });
  assert.notEqual(dated, otherDate);
  assert.notEqual(dated, unknown);
});

test("ADD identity derives from the candidate name slug", () => {
  const a = computeProposalDedupeKey({ ...base, benefitId: null, operation: "add" });
  const sameNameDifferentCase = computeProposalDedupeKey({
    ...base,
    benefitId: null,
    operation: "add",
    candidateName: "AIRLINE   Fee Credit®",
  });
  const differentName = computeProposalDedupeKey({
    ...base,
    benefitId: null,
    operation: "add",
    candidateName: "Hotel Credit",
  });
  assert.equal(a, sameNameDifferentCase);
  assert.notEqual(a, differentName);
});

test("canonicalStateHash treats null and missing uniformly and is order-stable", () => {
  const h1 = canonicalStateHash(after);
  const h2 = canonicalStateHash({ ...after });
  assert.equal(h1, h2);
  assert.notEqual(h1, canonicalStateHash({ ...after, display_description: "New copy" }));
});
