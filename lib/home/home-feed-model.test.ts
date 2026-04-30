import assert from "node:assert/strict";
import test from "node:test";
import { buildHomeFeedModel } from "@/lib/home/home-feed-model";
import type { HomeFeedItem } from "@/lib/types/server-data";

function makeItem(overrides: Partial<HomeFeedItem>): HomeFeedItem {
  return {
    userBenefitId: "ub-1",
    cardId: "card-1",
    benefitId: "benefit-1",
    benefitName: "Dining credit",
    cardName: "Amex Gold",
    issuer: "American Express",
    cardMarker: {
      label: "Amex",
      cardCode: "amex-gold",
      issuer: "American Express",
    },
    cadence: "monthly",
    currentPeriodValueCents: 1000,
    currentPeriodValueLabel: "$10",
    periodStart: "2026-04-01T00:00:00.000Z",
    periodEnd: "2026-04-30T23:59:59.999Z",
    resetDate: "2026-04-30T23:59:59.999Z",
    timingLabel: "Resets in 3 days",
    periodLabel: "This month",
    daysRemaining: 3,
    urgencyTier: "soon",
    isUsedThisPeriod: false,
    lastUsedAt: null,
    enrollmentRequired: false,
    requiresConfiguration: false,
    configurationType: null,
    configurationStatus: "not_required",
    reminderOverride: null,
    snoozedUntil: null,
    cardArtUrl: null,
    value: "$10",
    valueDescriptor: null,
    ...overrides,
  };
}

test("buildHomeFeedModel separates unused and used urgent benefits within the same 14-day window", () => {
  const feed = buildHomeFeedModel({
    trackedCards: 1,
    trackedBenefits: 4,
    now: new Date("2026-04-29T12:00:00.000Z"),
    timeframe: "next_14_days",
    allTrackedBenefits: [
      makeItem({ userBenefitId: "unused-urgent", benefitName: "Dining", currentPeriodValueCents: 1000 }),
      makeItem({
        userBenefitId: "used-urgent",
        benefitName: "Uber",
        currentPeriodValueCents: 1500,
        isUsedThisPeriod: true,
        lastUsedAt: "2026-04-28T10:00:00.000Z",
      }),
      makeItem({
        userBenefitId: "used-not-urgent",
        benefitName: "Airline incidental",
        currentPeriodValueCents: 5000,
        isUsedThisPeriod: true,
        daysRemaining: 22,
        timingLabel: "Resets in 22 days",
        periodEnd: "2026-05-21T23:59:59.999Z",
        resetDate: "2026-05-21T23:59:59.999Z",
      }),
      makeItem({
        userBenefitId: "next-up",
        benefitName: "Hotel credit",
        currentPeriodValueCents: 2000,
        daysRemaining: 20,
        timingLabel: "Resets in 20 days",
        periodEnd: "2026-05-19T23:59:59.999Z",
        resetDate: "2026-05-19T23:59:59.999Z",
      }),
    ],
  });

  assert.deepEqual(feed.expiringBenefits.map((item) => item.userBenefitId), ["unused-urgent"]);
  assert.deepEqual(feed.usedExpiringBenefits.map((item) => item.userBenefitId), ["used-urgent"]);
  assert.equal(feed.expiringBenefitCount, 1);
  assert.equal(feed.usedExpiringBenefitCount, 1);
});

test("buildHomeFeedModel uses calendar year end for the this year timeframe", () => {
  const feed = buildHomeFeedModel({
    trackedCards: 1,
    trackedBenefits: 2,
    now: new Date("2026-04-29T12:00:00.000Z"),
    timeframe: "this_year",
    allTrackedBenefits: [
      makeItem({
        userBenefitId: "within-year",
        benefitName: "Hotel credit",
        daysRemaining: 120,
        timingLabel: "Resets in 120 days",
        periodEnd: "2026-08-27T23:59:59.999Z",
        resetDate: "2026-08-27T23:59:59.999Z",
      }),
      makeItem({
        userBenefitId: "next-year",
        benefitName: "Annual travel credit",
        daysRemaining: 260,
        timingLabel: "Resets in 260 days",
        periodEnd: "2027-01-15T23:59:59.999Z",
        resetDate: "2027-01-15T23:59:59.999Z",
      }),
    ],
  });

  assert.equal(feed.timeframe.key, "this_year");
  assert.deepEqual(feed.expiringBenefits.map((item) => item.userBenefitId), ["within-year"]);
  assert.equal(feed.expiringBenefitCount, 1);
});
