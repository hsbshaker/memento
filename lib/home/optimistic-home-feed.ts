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

// Applies an optimistic tracking-status change to the feed.
// Does not alter isUsedThisPeriod or any period-usage state.
// timeframeEnd: the current selected timeframe's end date (used to decide
//   whether a newly-tracked benefit belongs in the active tab).
// now: used to check snooze state when adding back to Unused.
export function applyTrackingStatusMutation(
  feed: HomeFeedResult,
  item: HomeFeedItem,
  nextStatus: "tracked" | "not_tracked",
  timeframeEnd: Date,
  now: Date,
): HomeFeedResult {
  const updatedItem: HomeFeedItem = { ...item, trackingStatus: nextStatus };
  const delta = item.currentPeriodValueCents;
  const withinTimeframe = new Date(item.resetDate) <= timeframeEnd;
  const isSnoozed = item.snoozedUntil ? new Date(item.snoozedUntil) > now : false;

  if (nextStatus === "not_tracked") {
    // Remove from active tracked lists, add to not-tracked
    const nextExpiring = feed.expiringBenefits.filter((b) => b.userBenefitId !== item.userBenefitId);
    const nextUsedExpiring = feed.usedExpiringBenefits.filter((b) => b.userBenefitId !== item.userBenefitId);
    const nextNotTracked = sortHomeFeedItems([
      ...feed.notTrackedBenefits.filter((b) => b.userBenefitId !== item.userBenefitId),
      updatedItem,
    ]);

    // Adjust metrics: tracked → not_tracked removes value from active metrics
    const nextAvailableNow = item.isUsedThisPeriod
      ? feed.metrics.availableNow.valueCents
      : Math.max(0, feed.metrics.availableNow.valueCents - delta);
    const nextResettingSoon =
      item.isUsedThisPeriod || !withinTimeframe
        ? feed.metrics.resettingSoon.valueCents
        : Math.max(0, feed.metrics.resettingSoon.valueCents - delta);
    const nextCaptured = item.isUsedThisPeriod
      ? Math.max(0, feed.metrics.capturedThisPeriod.valueCents - delta)
      : feed.metrics.capturedThisPeriod.valueCents;

    const nextTrackedBenefits = Math.max(0, feed.walletSummary.trackedBenefits - 1);

    return {
      ...feed,
      metrics: {
        availableNow: rebuildMetric(feed.metrics.availableNow, nextAvailableNow),
        resettingSoon: rebuildMetric(feed.metrics.resettingSoon, nextResettingSoon),
        capturedThisPeriod: rebuildMetric(feed.metrics.capturedThisPeriod, nextCaptured),
      },
      expiringBenefits: nextExpiring,
      expiringBenefitCount: nextExpiring.length,
      usedExpiringBenefits: nextUsedExpiring,
      usedExpiringBenefitCount: nextUsedExpiring.length,
      notTrackedBenefits: nextNotTracked,
      notTrackedBenefitCount: nextNotTracked.length,
      walletSummary: { ...feed.walletSummary, trackedBenefits: nextTrackedBenefits },
      state: rebuildState(
        { ...feed, walletSummary: { ...feed.walletSummary, trackedBenefits: nextTrackedBenefits } },
        nextExpiring.length,
        0,
      ),
    };
  }

  // not_tracked → tracked: remove from not-tracked, conditionally add to active lists
  const nextNotTracked = feed.notTrackedBenefits.filter((b) => b.userBenefitId !== item.userBenefitId);

  let nextExpiring = [...feed.expiringBenefits];
  let nextUsedExpiring = [...feed.usedExpiringBenefits];

  if (withinTimeframe) {
    if (item.isUsedThisPeriod) {
      nextUsedExpiring = upsertSortedItem(nextUsedExpiring, updatedItem);
    } else if (!isSnoozed) {
      nextExpiring = upsertSortedItem(nextExpiring, updatedItem);
    }
  }

  // Adjust metrics: not_tracked → tracked adds value back to active metrics
  const nextAvailableNow = item.isUsedThisPeriod
    ? feed.metrics.availableNow.valueCents
    : feed.metrics.availableNow.valueCents + delta;
  const nextResettingSoon =
    item.isUsedThisPeriod || !withinTimeframe
      ? feed.metrics.resettingSoon.valueCents
      : feed.metrics.resettingSoon.valueCents + delta;
  const nextCaptured = item.isUsedThisPeriod
    ? feed.metrics.capturedThisPeriod.valueCents + delta
    : feed.metrics.capturedThisPeriod.valueCents;

  const nextTrackedBenefits = feed.walletSummary.trackedBenefits + 1;

  return {
    ...feed,
    metrics: {
      availableNow: rebuildMetric(feed.metrics.availableNow, nextAvailableNow),
      resettingSoon: rebuildMetric(feed.metrics.resettingSoon, nextResettingSoon),
      capturedThisPeriod: rebuildMetric(feed.metrics.capturedThisPeriod, nextCaptured),
    },
    expiringBenefits: nextExpiring,
    expiringBenefitCount: nextExpiring.length,
    usedExpiringBenefits: nextUsedExpiring,
    usedExpiringBenefitCount: nextUsedExpiring.length,
    notTrackedBenefits: nextNotTracked,
    notTrackedBenefitCount: nextNotTracked.length,
    walletSummary: { ...feed.walletSummary, trackedBenefits: nextTrackedBenefits },
    state: rebuildState(
      { ...feed, walletSummary: { ...feed.walletSummary, trackedBenefits: nextTrackedBenefits } },
      nextExpiring.length,
      0,
    ),
  };
}
