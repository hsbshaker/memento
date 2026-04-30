"use client";

import { startTransition, useState } from "react";
import type { HomeFeedItem, HomeFeedResult, HomeMetric } from "@/lib/types/server-data";
import { buildHomeState } from "@/lib/home/build-home-state";
import { AppShell } from "@/components/ui/AppShell";
import { MobilePageContainer } from "@/components/ui/MobilePageContainer";
import { Surface } from "@/components/ui/Surface";
import { HomeHeader } from "@/components/home/HomeHeader";
import { UseSoonList } from "@/components/home/UseSoonList";
import { ComingUpSection } from "@/components/home/ComingUpSection";
import { WalletSummaryRow } from "@/components/home/WalletSummaryRow";
import { BenefitActionOverlay } from "@/components/home/BenefitActionOverlay";
import { AllClearState } from "@/components/home/AllClearState";
import { EmptyHomeState } from "@/components/home/EmptyHomeState";

type HomeScreenProps = {
  initialFeed: HomeFeedResult;
};

type FeedResponse = HomeFeedResult & {
  error?: string;
};

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function rebuildState(feed: HomeFeedResult, urgentBenefitCount: number, nextBenefitCount: number) {
  return buildHomeState({
    trackedCards: feed.walletSummary.trackedCards,
    trackedBenefits: feed.walletSummary.trackedBenefits,
    urgentBenefitCount,
    nextBenefitCount,
  });
}

function rebuildMetric(metric: HomeMetric, nextValueCents: number): HomeMetric {
  return {
    ...metric,
    valueCents: nextValueCents,
    valueLabel: CURRENCY_FORMATTER.format(nextValueCents / 100),
  };
}

function removeItemFromFeed(feed: HomeFeedResult, item: HomeFeedItem, action: "mark-used" | "snooze"): HomeFeedResult {
  const wasUrgent = feed.urgentBenefits.some((candidate) => candidate.userBenefitId === item.userBenefitId);
  const wasNext = feed.nextBenefits.some((candidate) => candidate.userBenefitId === item.userBenefitId);
  const nextUrgentBenefits = feed.urgentBenefits.filter((candidate) => candidate.userBenefitId !== item.userBenefitId);
  const nextBenefits = feed.nextBenefits.filter((candidate) => candidate.userBenefitId !== item.userBenefitId);
  const nextUrgentCount = Math.max(0, feed.urgentBenefitCount - (wasUrgent ? 1 : 0));
  const nextBenefitCount = Math.max(0, feed.nextBenefitCount - (wasNext ? 1 : 0));
  const nextAvailableNow =
    action === "mark-used"
      ? Math.max(0, feed.metrics.availableNow.valueCents - item.currentPeriodValueCents)
      : feed.metrics.availableNow.valueCents;
  const nextResettingSoon =
    action === "mark-used" && item.daysRemaining <= 14
      ? Math.max(0, feed.metrics.resettingSoon.valueCents - item.currentPeriodValueCents)
      : feed.metrics.resettingSoon.valueCents;
  const nextCapturedThisPeriod =
    action === "mark-used"
      ? feed.metrics.capturedThisPeriod.valueCents + item.currentPeriodValueCents
      : feed.metrics.capturedThisPeriod.valueCents;

  return {
    ...feed,
    metrics: {
      availableNow: rebuildMetric(feed.metrics.availableNow, nextAvailableNow),
      resettingSoon: rebuildMetric(feed.metrics.resettingSoon, nextResettingSoon),
      capturedThisPeriod: rebuildMetric(feed.metrics.capturedThisPeriod, nextCapturedThisPeriod),
    },
    urgentBenefits: nextUrgentBenefits,
    urgentBenefitCount: nextUrgentCount,
    nextBenefits,
    nextBenefitCount,
    state: rebuildState(feed, nextUrgentCount, nextBenefitCount),
  };
}

export function HomeScreen({ initialFeed }: HomeScreenProps) {
  const [feed, setFeed] = useState(initialFeed);
  const [overlayItem, setOverlayItem] = useState<HomeFeedItem | null>(null);
  const [pendingById, setPendingById] = useState<Record<string, "mark-used" | "snooze" | null>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showAllClear = !feed.state.isEmpty && feed.urgentBenefitCount === 0;

  const refreshFeed = async () => {
    setRefreshing(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/home/feed", {
        method: "GET",
        credentials: "include",
      });
      const payload = (await response.json()) as FeedResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to refresh.");
      }

      startTransition(() => {
        setFeed(payload);
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Couldn’t refresh. Showing last known state.");
    } finally {
      setRefreshing(false);
    }
  };

  const runMutation = async (item: HomeFeedItem, route: "/api/home/mark-used" | "/api/home/snooze", action: "mark-used" | "snooze") => {
    const previousFeed = feed;
    setPendingById((current) => ({ ...current, [item.userBenefitId]: action }));
    setErrorMessage(null);
    setFeed(removeItemFromFeed(feed, item, action));
    setOverlayItem((current) => (current?.userBenefitId === item.userBenefitId ? null : current));

    try {
      const response = await fetch(route, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userBenefitId: item.userBenefitId,
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save.");
      }

      void refreshFeed();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Couldn’t refresh. Showing last known state.");
      setFeed(previousFeed);
      void refreshFeed();
    } finally {
      setPendingById((current) => ({ ...current, [item.userBenefitId]: null }));
    }
  };

  if (feed.state.isEmpty) {
    return (
      <AppShell containerClassName="max-w-4xl px-0 md:px-6">
        <MobilePageContainer className="pb-20">
          <EmptyHomeState />
        </MobilePageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell containerClassName="max-w-4xl px-0 md:px-6">
      <MobilePageContainer className="pb-20">
        <div className="space-y-6 pt-6">
          <HomeHeader headline={feed.state.headline} refreshing={refreshing} onRefresh={() => void refreshFeed()} />

          {errorMessage ? (
            <Surface className="rounded-2xl border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p>Couldn’t refresh. Showing last known state.</p>
                <button type="button" onClick={() => void refreshFeed()} className="text-left font-semibold underline decoration-amber-100/40 underline-offset-4">
                  Retry
                </button>
              </div>
            </Surface>
          ) : null}

          {showAllClear ? <AllClearState headline={feed.state.headline} /> : null}

          <UseSoonList
            items={feed.urgentBenefits}
            hiddenCount={0}
            pendingById={pendingById}
            onOpenItem={setOverlayItem}
            onMarkUsed={(item) => void runMutation(item, "/api/home/mark-used", "mark-used")}
            onSnooze={(item) => void runMutation(item, "/api/home/snooze", "snooze")}
          />

          <ComingUpSection items={feed.nextBenefits} count={feed.nextBenefitCount} onOpenItem={setOverlayItem} />

          <WalletSummaryRow
            trackedBenefits={feed.walletSummary.trackedBenefits}
            trackedCards={feed.walletSummary.trackedCards}
          />
        </div>

        <BenefitActionOverlay
          item={overlayItem}
          open={overlayItem !== null}
          loading={overlayItem ? pendingById[overlayItem.userBenefitId] === "mark-used" : false}
          onClose={() => setOverlayItem(null)}
          onMarkUsed={(item) => void runMutation(item, "/api/home/mark-used", "mark-used")}
        />
      </MobilePageContainer>
    </AppShell>
  );
}
