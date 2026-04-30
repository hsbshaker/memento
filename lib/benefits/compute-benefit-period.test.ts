import assert from "node:assert/strict";
import test from "node:test";
import {
  computeBenefitPeriod,
  isBenefitResetOnAnniversary,
  resolveSupportedBenefitCadence,
} from "@/lib/benefits/compute-benefit-period";

test("resolveSupportedBenefitCadence keeps calendar annual benefits annual by default", () => {
  assert.equal(
    resolveSupportedBenefitCadence({
      cadence: "annual",
      resetTiming: "Calendar year",
    }),
    "annual",
  );

  assert.equal(
    resolveSupportedBenefitCadence({
      cadence: "annual",
      resetTiming: "Resets each card anniversary",
    }),
    "anniversary",
  );
});

test("isBenefitResetOnAnniversary only triggers on explicit anniversary language", () => {
  assert.equal(isBenefitResetOnAnniversary("Calendar year"), false);
  assert.equal(isBenefitResetOnAnniversary("Resets each card anniversary"), true);
  assert.equal(isBenefitResetOnAnniversary("Membership year"), true);
});

test("computeBenefitPeriod uses calendar annual logic unless anniversary reset text is explicit", () => {
  const annualPeriod = computeBenefitPeriod({
    cadence: "annual",
    resetTiming: "Calendar year",
    cardAnniversaryDate: "2024-07-15",
    now: new Date("2026-04-29T12:00:00.000Z"),
  });

  assert.ok(annualPeriod);
  assert.equal(annualPeriod?.resolvedCadence, "annual");
  assert.equal(annualPeriod?.periodKey, "2026");
  assert.equal(annualPeriod?.periodLabel, "This year");

  const anniversaryPeriod = computeBenefitPeriod({
    cadence: "annual",
    resetTiming: "Resets each card anniversary",
    cardAnniversaryDate: "2024-07-15",
    now: new Date("2026-04-29T12:00:00.000Z"),
  });

  assert.ok(anniversaryPeriod);
  assert.equal(anniversaryPeriod?.resolvedCadence, "anniversary");
  assert.equal(anniversaryPeriod?.periodKey, "2025-ANNIV-07-15");
  assert.equal(anniversaryPeriod?.periodLabel, "Anniversary year");
});

test("computeBenefitPeriod returns null for anniversary benefits without an anniversary date", () => {
  assert.equal(
    computeBenefitPeriod({
      cadence: "annual",
      resetTiming: "Card anniversary",
      cardAnniversaryDate: null,
      now: new Date("2026-04-29T12:00:00.000Z"),
    }),
    null,
  );
});
