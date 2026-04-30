import { sortHomeFeedItems } from "@/lib/benefits/rank-benefits";
import { buildHomeState } from "@/lib/home/build-home-state";
import type { HomeFeedItem, HomeFeedResult, HomeMetric } from "@/lib/types/server-data";

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function rebuildMetric(metric: HomeMetric, nextValueCents: number): HomeMetric {
  return {
    ...metric,
    valueCents: nextValueCents,
    valueLabel: CURRENCY_FORMATTER.format(nextValueCents / 100),
  };
}

function rebuildState(feed: HomeFeedResult, urgentBenefitCount: number, nextBenefitCount: number) {
  return buildHomeState({
    trackedCards: feed.walletSummary.trackedCards,
    trackedBenefits: feed.walletSummary.trackedBenefits,
    urgentBenefitCount,
    nextBenefitCount,
  });
}

function upsertSortedItem(items: HomeFeedItem[], item: HomeFeedItem) {
  return sortHomeFeedItems([
    ...items.filter((candidate) => candidate.userBenefitId !== item.userBenefitId),
    item,
  ]);
}

export function applyUrgentBenefitUsageMutation(
  feed: HomeFeedResult,
  item: HomeFeedItem,
  nextUsed: boolean,
): HomeFeedResult {
  const updatedItem: HomeFeedItem = {
    ...item,
    isUsedThisPeriod: nextUsed,
    lastUsedAt: nextUsed ? new Date().toISOString() : null,
  };
  const nextExpiringBenefitsBase = feed.expiringBenefits.filter((candidate) => candidate.userBenefitId !== item.userBenefitId);
  const nextUsedExpiringBenefitsBase = feed.usedExpiringBenefits.filter((candidate) => candidate.userBenefitId !== item.userBenefitId);
  const nextExpiringBenefits = nextUsed
    ? nextExpiringBenefitsBase
    : upsertSortedItem(nextExpiringBenefitsBase, updatedItem);
  const nextUsedExpiringBenefits = nextUsed
    ? upsertSortedItem(nextUsedExpiringBenefitsBase, updatedItem)
    : nextUsedExpiringBenefitsBase;

  const delta = item.currentPeriodValueCents;
  const nextAvailableNow = nextUsed
    ? Math.max(0, feed.metrics.availableNow.valueCents - delta)
    : feed.metrics.availableNow.valueCents + delta;
  const nextResettingSoon = nextUsed
    ? Math.max(0, feed.metrics.resettingSoon.valueCents - delta)
    : feed.metrics.resettingSoon.valueCents + delta;
  const nextCapturedThisPeriod = nextUsed
    ? feed.metrics.capturedThisPeriod.valueCents + delta
    : Math.max(0, feed.metrics.capturedThisPeriod.valueCents - delta);

  return {
    ...feed,
    metrics: {
      availableNow: rebuildMetric(feed.metrics.availableNow, nextAvailableNow),
      resettingSoon: rebuildMetric(feed.metrics.resettingSoon, nextResettingSoon),
      capturedThisPeriod: rebuildMetric(feed.metrics.capturedThisPeriod, nextCapturedThisPeriod),
    },
    expiringBenefits: nextExpiringBenefits,
    expiringBenefitCount: nextExpiringBenefits.length,
    usedExpiringBenefits: nextUsedExpiringBenefits,
    usedExpiringBenefitCount: nextUsedExpiringBenefits.length,
    state: rebuildState(feed, nextExpiringBenefits.length, 0),
  };
}
