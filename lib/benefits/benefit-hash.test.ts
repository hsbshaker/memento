import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";

import { computeBenefitHash } from "./benefit-hash";

const referenceHash = (parts: string[]) =>
  createHash("sha256").update(parts.join("|")).digest("hex");

test("computeBenefitHash matches the importer recipe (7 fields joined with |)", () => {
  const hash = computeBenefitHash({
    benefitCode: "amex_platinum_airline_fee_credit",
    benefitValue: "Up to $200 annually",
    cadence: "annual",
    resetTiming: "calendar year",
    enrollmentRequired: true,
    requiresSetup: false,
    trackInMemento: "yes",
  });

  assert.equal(
    hash,
    referenceHash([
      "amex_platinum_airline_fee_credit",
      "Up to $200 annually",
      "annual",
      "calendar year",
      "true",
      "false",
      "yes",
    ]),
  );
});

test("computeBenefitHash is stable and sensitive to each field", () => {
  const base = {
    benefitCode: "code",
    benefitValue: "value",
    cadence: "monthly",
    resetTiming: "calendar month",
    enrollmentRequired: false,
    requiresSetup: false,
    trackInMemento: "yes",
  };

  assert.equal(computeBenefitHash(base), computeBenefitHash({ ...base }));
  assert.notEqual(computeBenefitHash(base), computeBenefitHash({ ...base, benefitValue: "other" }));
  assert.notEqual(computeBenefitHash(base), computeBenefitHash({ ...base, enrollmentRequired: true }));
  assert.notEqual(computeBenefitHash(base), computeBenefitHash({ ...base, trackInMemento: "no" }));
});
