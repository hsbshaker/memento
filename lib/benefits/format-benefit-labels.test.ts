import assert from "node:assert/strict";
import test from "node:test";
import { getBenefitResetsLabel } from "@/lib/benefits/format-benefit-labels";

test("getBenefitResetsLabel formats period-aware benefits as short deadline dates", () => {
  const now = new Date("2026-05-05T12:00:00.000Z");

  assert.equal(
    getBenefitResetsLabel({ cadence: "monthly", resetTiming: "Calendar month", now }),
    "May 31",
  );
  assert.equal(
    getBenefitResetsLabel({ cadence: "quarterly", resetTiming: "Calendar quarter", now }),
    "Jun 30",
  );
  assert.equal(
    getBenefitResetsLabel({ cadence: "semiannual", resetTiming: "Twice yearly", now }),
    "Jun 30",
  );
  assert.equal(
    getBenefitResetsLabel({ cadence: "annual", resetTiming: "Calendar year", now }),
    "Dec 31",
  );
});

test("getBenefitResetsLabel uses the upcoming anniversary date when available", () => {
  assert.equal(
    getBenefitResetsLabel({
      cadence: "annual",
      resetTiming: "Resets each card anniversary",
      cardAnniversaryDate: "2024-07-15",
      now: new Date("2026-05-05T12:00:00.000Z"),
    }),
    "Jul 15",
  );
});

test("getBenefitResetsLabel falls back to plain-English labels for non-period benefits", () => {
  assert.equal(
    getBenefitResetsLabel({
      cadence: "annual",
      resetTiming: "Card anniversary",
      cardAnniversaryDate: null,
      now: new Date("2026-05-05T12:00:00.000Z"),
    }),
    "Card anniversary",
  );
  assert.equal(
    getBenefitResetsLabel({
      cadence: "one_time",
      resetTiming: "Renews after your next card renewal",
      now: new Date("2026-05-05T12:00:00.000Z"),
    }),
    "After renewal",
  );
  assert.equal(
    getBenefitResetsLabel({
      cadence: "per_booking",
      resetTiming: "See offer terms",
      now: new Date("2026-05-05T12:00:00.000Z"),
    }),
    "Offer terms",
  );
  assert.equal(
    getBenefitResetsLabel({
      cadence: "custom",
      resetTiming: "Custom issuer logic",
      now: new Date("2026-05-05T12:00:00.000Z"),
    }),
    "Varies",
  );
});
