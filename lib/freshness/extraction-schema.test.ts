import assert from "node:assert/strict";
import test from "node:test";

import { BENEFIT_CANONICAL_FIELDS } from "@/lib/benefits/benefit-fields";
import { EXTRACTION_TOOL_SCHEMA, validateExtractionOutput } from "./extraction-schema";

const validCandidate = {
  matched_benefit_code: "amex_platinum_airline_fee_credit",
  benefit_name: "Airline Fee Credit",
  benefit_value: "Up to $200 annually",
  cadence: "annual",
  reset_timing: "calendar year",
  enrollment_required: true,
  requires_setup: false,
  display_description: null,
  removal_claim: false,
  effective_date: null,
  evidence_excerpt: "Receive up to $200 in statement credits annually",
  explanation: "Matches the airline fee credit section.",
  confidence: 0.92,
};

test("valid extraction output passes and preserves values", () => {
  const result = validateExtractionOutput({ candidates: [validCandidate] });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.candidates.length, 1);
    assert.equal(result.value.candidates[0].benefit_name, "Airline Fee Credit");
  }
});

test("non-object, missing array, and malformed candidates fail closed with messages", () => {
  assert.equal(validateExtractionOutput(null).ok, false);
  assert.equal(validateExtractionOutput("text").ok, false);
  assert.equal(validateExtractionOutput({}).ok, false);
  assert.equal(validateExtractionOutput({ candidates: "nope" }).ok, false);

  const missingField = validateExtractionOutput({
    candidates: [{ ...validCandidate, benefit_name: undefined }],
  });
  assert.equal(missingField.ok, false);
  if (!missingField.ok) {
    assert.ok(missingField.errors.some((e) => e.includes("benefit_name")));
  }
});

test("wrong types, bad cadence, bad date, and out-of-range confidence fail", () => {
  const cases: Array<Record<string, unknown>> = [
    { ...validCandidate, enrollment_required: "yes" },
    { ...validCandidate, cadence: "biweekly" },
    { ...validCandidate, effective_date: "July 1 2026" },
    { ...validCandidate, confidence: 1.5 },
    { ...validCandidate, confidence: -0.1 },
    { ...validCandidate, removal_claim: "true" },
    { ...validCandidate, evidence_excerpt: "  " },
  ];
  for (const candidate of cases) {
    assert.equal(validateExtractionOutput({ candidates: [candidate] }).ok, false);
  }
});

test("tool schema covers every canonical benefit field (contract alignment)", () => {
  const properties = EXTRACTION_TOOL_SCHEMA.properties.candidates.items.properties as Record<string, unknown>;
  for (const field of BENEFIT_CANONICAL_FIELDS) {
    assert.ok(field in properties, `EXTRACTION_TOOL_SCHEMA is missing canonical field ${field}`);
  }
  const required = EXTRACTION_TOOL_SCHEMA.properties.candidates.items.required as readonly string[];
  for (const field of BENEFIT_CANONICAL_FIELDS) {
    assert.ok(required.includes(field), `EXTRACTION_TOOL_SCHEMA.required is missing ${field}`);
  }
});
