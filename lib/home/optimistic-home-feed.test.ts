import assert from "node:assert/strict";
import test from "node:test";
import { applyUrgentBenefitUsageMutation } from "@/lib/home/optimistic-home-feed";
import type { HomeFeedItem, HomeFeedResult } from "@/lib/types/server-data";

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

function makeFeed(item: HomeFeedItem): HomeFeedResult {
  return {
    timeframe: {
      key: "next_14_days",
      label: "Next 14 days",
      shortLabel: "next 14 days",
    },
    metrics: {
      availableNow: { valueCents: 3000, valueLabel: "$30", helperText: "Unused value available in the current period." },
      resettingSoon: { valueCents: 3000, valueLabel: "$30", helperText: "Unused value resetting within the next 14 days." },
      capturedThisPeriod: { valueCents: 500, valueLabel: "$5", helperText: "Value you’ve already captured this period." },
    },
    expiringBenefits: [item],
    expiringBenefitCount: 1,
    usedExpiringBenefits: [],
    usedExpiringBenefitCount: 0,
    walletSummary: {
      trackedBenefits: 1,
      trackedCards: 1,
    },
    state: {
      isEmpty: false,
      isAllCaughtUp: false,
      headline: "1 benefit needs attention in the next 14 days.",
      supportingText: "Use the soonest reset first so you don’t lose value.",
    },
  };
}

test("applyUrgentBenefitUsageMutation moves value into captured when marking used", () => {
  const item = makeItem({ userBenefitId: "unused-urgent" });
  const nextFeed = applyUrgentBenefitUsageMutation(makeFeed(item), item, true);

  assert.equal(nextFeed.metrics.availableNow.valueCents, 2000);
  assert.equal(nextFeed.metrics.resettingSoon.valueCents, 2000);
  assert.equal(nextFeed.metrics.capturedThisPeriod.valueCents, 1500);
  assert.deepEqual(nextFeed.expiringBenefits.map((entry) => entry.userBenefitId), []);
  assert.deepEqual(nextFeed.usedExpiringBenefits.map((entry) => entry.userBenefitId), ["unused-urgent"]);
  assert.equal(nextFeed.usedExpiringBenefits[0]?.isUsedThisPeriod, true);
});

test("applyUrgentBenefitUsageMutation reverses the metric and tab state when marking not used", () => {
  const usedItem = makeItem({
    userBenefitId: "used-urgent",
    isUsedThisPeriod: true,
    lastUsedAt: "2026-04-28T10:00:00.000Z",
  });

  const nextFeed = applyUrgentBenefitUsageMutation(
    {
      ...makeFeed(usedItem),
      metrics: {
        availableNow: { valueCents: 2000, valueLabel: "$20", helperText: "Unused value available in the current period." },
        resettingSoon: { valueCents: 2000, valueLabel: "$20", helperText: "Unused value resetting within the next 14 days." },
        capturedThisPeriod: { valueCents: 1500, valueLabel: "$15", helperText: "Value you’ve already captured this period." },
      },
      expiringBenefits: [],
      expiringBenefitCount: 0,
      usedExpiringBenefits: [usedItem],
      usedExpiringBenefitCount: 1,
    },
    usedItem,
    false,
  );

  assert.equal(nextFeed.metrics.availableNow.valueCents, 3000);
  assert.equal(nextFeed.metrics.resettingSoon.valueCents, 3000);
  assert.equal(nextFeed.metrics.capturedThisPeriod.valueCents, 500);
  assert.deepEqual(nextFeed.expiringBenefits.map((entry) => entry.userBenefitId), ["used-urgent"]);
  assert.deepEqual(nextFeed.usedExpiringBenefits.map((entry) => entry.userBenefitId), []);
  assert.equal(nextFeed.expiringBenefits[0]?.isUsedThisPeriod, false);
});
