import assert from "node:assert/strict";
import test from "node:test";
import { buildMonthlyDigest } from "@/lib/reminders/monthly-digest-pure";
import type { DigestEligibleBenefit } from "@/lib/reminders/monthly-digest-pure";

const MONTH_START = new Date("2026-05-01T00:00:00.000Z");

const makeBenefit = (overrides: Partial<DigestEligibleBenefit> & Pick<DigestEligibleBenefit, "userId" | "benefitId">): DigestEligibleBenefit => ({
  benefitDisplayName: "Test Benefit",
  cadence: "monthly",
  section: "monthly",
  periodKey: "2026-05",
  valueCents: null,
  notes: null,
  cardId: "card-1",
  cardDisplayName: "Test Card",
  ...overrides,
});

test("buildMonthlyDigest returns empty map when no benefits", () => {
  const result = buildMonthlyDigest([], MONTH_START);
  assert.equal(result.size, 0);
});

test("buildMonthlyDigest groups benefits by userId", () => {
  const benefits: DigestEligibleBenefit[] = [
    makeBenefit({ userId: "user-a", benefitId: "b-1" }),
    makeBenefit({ userId: "user-a", benefitId: "b-2" }),
    makeBenefit({ userId: "user-b", benefitId: "b-3" }),
  ];

  const result = buildMonthlyDigest(benefits, MONTH_START);

  assert.equal(result.size, 2);
  assert.equal(result.get("user-a")?.benefits.length, 2);
  assert.equal(result.get("user-b")?.benefits.length, 1);
});

test("buildMonthlyDigest sets monthKey from monthStart", () => {
  const benefits: DigestEligibleBenefit[] = [
    makeBenefit({ userId: "user-a", benefitId: "b-1" }),
  ];

  const result = buildMonthlyDigest(benefits, MONTH_START);
  assert.equal(result.get("user-a")?.monthKey, "2026-05");
});

test("buildMonthlyDigest places benefits into correct sections", () => {
  const benefits: DigestEligibleBenefit[] = [
    makeBenefit({ userId: "user-a", benefitId: "b-monthly", section: "monthly", cadence: "monthly" }),
    makeBenefit({ userId: "user-a", benefitId: "b-annual", section: "annual", cadence: "annual" }),
  ];

  const result = buildMonthlyDigest(benefits, MONTH_START);
  const digest = result.get("user-a")!;

  assert.equal(digest.sections.monthly.length, 1);
  assert.equal(digest.sections.annual.length, 1);
  assert.equal(digest.sections.quarterly.length, 0);
  assert.equal(digest.sections.semiannual.length, 0);
});

test("buildMonthlyDigest users with no eligible benefits are not included", () => {
  // Simulate: a user had benefits considered but none passed eligibility filter
  // -> they simply don't appear in the input to buildMonthlyDigest
  const benefits: DigestEligibleBenefit[] = [];
  const result = buildMonthlyDigest(benefits, MONTH_START);

  assert.equal(result.has("user-no-benefits"), false);
});
