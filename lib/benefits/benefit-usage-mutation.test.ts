import assert from "node:assert/strict";
import test from "node:test";
import { buildBenefitUsageMutationPlan } from "@/lib/benefits/benefit-usage-plan";

test("buildBenefitUsageMutationPlan writes the current monthly period key", () => {
  const plan = buildBenefitUsageMutationPlan({
    benefitId: "benefit-monthly",
    cadence: "monthly",
    resetTiming: "Monthly",
    cardAnniversaryDate: null,
    nextUsed: true,
    at: new Date("2026-05-14T10:00:00.000Z"),
  });

  assert.equal(plan.ok, true);
  if (!plan.ok) return;

  assert.equal(plan.periodKey, "2026-05");
  assert.equal(plan.isUsedThisPeriod, true);
  assert.equal(plan.markedUsedAt, "2026-05-14T10:00:00.000Z");
});

test("buildBenefitUsageMutationPlan keeps annual calendar benefits on calendar-year periods even with a card anniversary date", () => {
  const plan = buildBenefitUsageMutationPlan({
    benefitId: "benefit-annual",
    cadence: "annual",
    resetTiming: "Calendar year",
    cardAnniversaryDate: "2024-07-15",
    nextUsed: true,
    at: new Date("2026-04-29T12:00:00.000Z"),
  });

  assert.equal(plan.ok, true);
  if (!plan.ok) return;

  assert.equal(plan.periodKey, "2026");
  assert.equal(plan.periodStart, "2026-01-01T00:00:00.000Z");
  assert.equal(plan.periodEnd, "2026-12-31T23:59:59.999Z");
});

test("buildBenefitUsageMutationPlan supports explicit anniversary cadence", () => {
  const plan = buildBenefitUsageMutationPlan({
    benefitId: "benefit-anniversary",
    cadence: "anniversary",
    resetTiming: "Card anniversary",
    cardAnniversaryDate: "2024-07-15",
    nextUsed: true,
    at: new Date("2026-04-29T12:00:00.000Z"),
  });

  assert.equal(plan.ok, true);
  if (!plan.ok) return;

  assert.equal(plan.periodKey, "2025-ANNIV-07-15");
  assert.equal(plan.periodStart, "2025-07-15T00:00:00.000Z");
  assert.equal(plan.periodEnd, "2026-07-14T23:59:59.999Z");
});

test("buildBenefitUsageMutationPlan returns a clear error for anniversary benefits without an anniversary date", () => {
  const plan = buildBenefitUsageMutationPlan({
    benefitId: "benefit-anniversary",
    cadence: "annual",
    resetTiming: "Resets each card anniversary",
    cardAnniversaryDate: null,
    nextUsed: true,
    at: new Date("2026-04-29T12:00:00.000Z"),
  });

  assert.deepEqual(plan, {
    ok: false,
    code: "missing_period_context",
    message: "Add your card anniversary date to track this benefit.",
  });
});
