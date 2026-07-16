import assert from "node:assert/strict";
import test from "node:test";

import { validateProposalEdit } from "./validate-proposal-edit";

test("accepts edits to canonical fields with correct types", () => {
  const result = validateProposalEdit({
    benefit_value: "Up to $250 annually",
    cadence: "annual",
    enrollment_required: true,
    display_description: null,
  });
  assert.equal(result.ok, true);
});

test("rejects unknown fields (lifecycle fields are not editable)", () => {
  for (const field of ["benefit_status", "retired_at", "content_version", "benefit_hash", "anything"]) {
    const result = validateProposalEdit({ [field]: "x" });
    assert.equal(result.ok, false, field);
    if (!result.ok) {
      assert.ok(result.errors.some((e) => e.includes("unknown field")), field);
    }
  }
});

test("rejects wrong types, invalid enums, blank strings, and empty edits", () => {
  assert.equal(validateProposalEdit({ enrollment_required: "yes" }).ok, false);
  assert.equal(validateProposalEdit({ cadence: "biweekly" }).ok, false);
  assert.equal(validateProposalEdit({ track_in_memento: "maybe" }).ok, false);
  assert.equal(validateProposalEdit({ benefit_name: "   " }).ok, false);
  assert.equal(validateProposalEdit({}).ok, false);
  assert.equal(validateProposalEdit(null).ok, false);
  assert.equal(validateProposalEdit([1, 2]).ok, false);
});

test("allows benefit_code and source_url edits (ADD naming / provenance fixes)", () => {
  const result = validateProposalEdit({
    benefit_code: "amex_platinum_new_credit",
    source_url: "https://www.americanexpress.com/us/credit-cards/card/platinum/",
    track_in_memento: "yes",
  });
  assert.equal(result.ok, true);
});
