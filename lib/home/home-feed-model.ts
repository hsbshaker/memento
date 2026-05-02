import { sortHomeFeedItems } from "@/lib/benefits/rank-benefits";
import { buildHomeState } from "@/lib/home/build-home-state";
import { getHomeTimeframeEndDate, getHomeTimeframeOption } from "@/lib/home/home-timeframes";
import type { HomeFeedItem, HomeFeedResult, HomeMetric, HomeTimeframeKey } from "@/lib/types/server-data";
const CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatMetricValue(valueCents: number) {
  return CURRENCY_FORMATTER.format(valueCents / 100);
}

function buildMetric(valueCents: number, helperText: string): HomeMetric {
  return {
    valueCents,
    valueLabel: formatMetricValue(valueCents),
    helperText,
  };
}

export function buildHomeFeedModel({
  allActiveBenefits,
  trackedBenefits,
  trackedCards,
  now,
  timeframe,
}: {
  allActiveBenefits: HomeFeedItem[];
  trackedBenefits: number;
  trackedCards: number;
  now: Date;
  timeframe: HomeTimeframeKey;
}): HomeFeedResult {
  const timeframeOption = getHomeTimeframeOption(timeframe);
  const timeframeEnd = getHomeTimeframeEndDate(now, timeframe);
  const trackedBenefitsInFeed = allActiveBenefits.filter((item) => item.trackingStatus === "tracked");
  const notTrackedBenefits = sortHomeFeedItems(
    allActiveBenefits.filter((item) => item.trackingStatus === "not_tracked"),
  );
  const unusedBenefits = trackedBenefitsInFeed.filter((item) => !item.isUsedThisPeriod);
  const actionableUnusedBenefits = unusedBenefits.filter((item) => {
    if (item.snoozedUntil && new Date(item.snoozedUntil) > now) {
      return false;
    }

    return true;
  });

  const expiringBenefits = sortHomeFeedItems(
    actionableUnusedBenefits.filter((item) => new Date(item.resetDate) <= timeframeEnd),
  );
  const usedExpiringBenefits = sortHomeFeedItems(
    trackedBenefitsInFeed.filter((item) => item.isUsedThisPeriod && new Date(item.resetDate) <= timeframeEnd),
  );

  const availableNowValueCents = unusedBenefits.reduce((sum, item) => sum + item.currentPeriodValueCents, 0);
  const resettingSoonValueCents = unusedBenefits
    .filter((item) => new Date(item.resetDate) <= timeframeEnd)
    .reduce((sum, item) => sum + item.currentPeriodValueCents, 0);
  const capturedThisPeriodValueCents = trackedBenefitsInFeed
    .filter((item) => item.isUsedThisPeriod)
    .reduce((sum, item) => sum + item.currentPeriodValueCents, 0);

  return {
    timeframe: timeframeOption,
    metrics: {
      availableNow: buildMetric(availableNowValueCents, "Unused value available in the current period."),
      resettingSoon: buildMetric(
        resettingSoonValueCents,
        `Unused value expiring in ${timeframeOption.shortLabel}.`,
      ),
      capturedThisPeriod: buildMetric(
        capturedThisPeriodValueCents,
        "Value you’ve already captured this period.",
      ),
    },
    expiringBenefits,
    expiringBenefitCount: expiringBenefits.length,
    usedExpiringBenefits,
    usedExpiringBenefitCount: usedExpiringBenefits.length,
    notTrackedBenefits,
    notTrackedBenefitCount: notTrackedBenefits.length,
    walletSummary: {
      trackedBenefits,
      trackedCards,
    },
    state: buildHomeState({
      trackedCards,
      trackedBenefits,
      urgentBenefitCount: expiringBenefits.length,
      nextBenefitCount: 0,
    }),
  };
}
