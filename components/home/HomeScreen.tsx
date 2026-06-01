"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import type { HomeFeedItem, HomeFeedResult, HomeTimeframeKey } from "@/lib/types/server-data";
import { HOME_TIMEFRAME_OPTIONS, getHomeTimeframeEndDate } from "@/lib/home/home-timeframes";
import {
  applyTrackingStatusMutation,
  applyUrgentBenefitUsageMutation,
} from "@/lib/home/optimistic-home-feed";
import { AppShell } from "@/components/ui/AppShell";
import { MobilePageContainer } from "@/components/ui/MobilePageContainer";
import { UndoToastContainer, type UndoToastItem } from "@/components/ui/UndoToast";
import { HomeBenefitRows } from "@/components/home/HomeBenefitRows";
import { EmptyHomeState } from "@/components/home/EmptyHomeState";
import { WalletHero } from "@/components/home/WalletHero";
import { cn } from "@/lib/cn";

type HomeScreenProps = {
  initialFeed: HomeFeedResult;
};

type FeedResponse = HomeFeedResult & {
  error?: string;
};

type BenefitTab = "unused" | "used" | "not_tracked";

const MUTATION_ERROR = "Couldn't update that benefit. Please try again.";

export function HomeScreen({ initialFeed }: HomeScreenProps) {
  const [feed, setFeed] = useState(initialFeed);
  const [pendingById, setPendingById] = useState<Record<string, "mark-used" | "mark-not-used" | null>>({});
  const [pendingTrackingById, setPendingTrackingById] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeBenefitTab, setActiveBenefitTab] = useState<BenefitTab>("unused");
  const [selectedTimeframe, setSelectedTimeframe] = useState(initialFeed.timeframe.key);
  const [isRefreshingTimeframe, setIsRefreshingTimeframe] = useState(false);
  const [toasts, setToasts] = useState<UndoToastItem[]>([]);
  const feedCacheRef = useRef(new Map<HomeTimeframeKey, HomeFeedResult>([[initialFeed.timeframe.key, initialFeed]]));
  const inFlightRequestsRef = useRef(new Map<HomeTimeframeKey, Promise<HomeFeedResult>>());
  const latestRequestedTimeframeRef = useRef<HomeTimeframeKey>(initialFeed.timeframe.key);

  const addToast = (toast: UndoToastItem) => {
    setToasts((prev) => [...prev, toast]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchFeedForTimeframe = async (timeframe: HomeTimeframeKey, force = false) => {
    if (!force) {
      const cachedFeed = feedCacheRef.current.get(timeframe);
      if (cachedFeed) {
        return cachedFeed;
      }

      const inFlightRequest = inFlightRequestsRef.current.get(timeframe);
      if (inFlightRequest) {
        return inFlightRequest;
      }
    }

    const request = (async () => {
      const response = await fetch(`/api/home/feed?timeframe=${timeframe}`, {
        method: "GET",
        credentials: "include",
      });
      const payload = (await response.json()) as FeedResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to refresh.");
      }

      feedCacheRef.current.set(timeframe, payload);
      return payload;
    })();

    inFlightRequestsRef.current.set(timeframe, request);

    try {
      return await request;
    } finally {
      inFlightRequestsRef.current.delete(timeframe);
    }
  };

  const invalidateFeedCache = () => {
    feedCacheRef.current.clear();
    inFlightRequestsRef.current.clear();
  };

  const refreshFeed = async (timeframe = selectedTimeframe, force = false) => {
    try {
      const payload = await fetchFeedForTimeframe(timeframe, force);
      if (latestRequestedTimeframeRef.current !== timeframe) {
        return;
      }

      startTransition(() => {
        setFeed(payload);
      });
    } catch {
      // Background refresh failure is silent — the optimistic state is already showing.
      // The user sees the rollback from the mutation error path if the API itself failed.
    }
  };

  useEffect(() => {
    for (const option of HOME_TIMEFRAME_OPTIONS) {
      if (option.key === selectedTimeframe) continue;
      if (feedCacheRef.current.has(option.key)) continue;
      void fetchFeedForTimeframe(option.key).catch(() => undefined);
    }
  }, [selectedTimeframe]);

  // Mark as Used / Mark as Unused — optimistic with undo toast.
  const runUsageMutation = (item: HomeFeedItem, nextUsed: boolean) => {
    const previousFeed = feed;
    const toastId = crypto.randomUUID();
    const toastMessage = nextUsed ? "Marked as used" : "Marked as unused";

    setErrorMessage(null);
    setFeed(applyUrgentBenefitUsageMutation(feed, item, nextUsed));

    const fireApi = async () => {
      const action = nextUsed ? "mark-used" : "mark-not-used";
      setPendingById((current) => ({ ...current, [item.userBenefitId]: action }));
      try {
        const response = await fetch("/api/home/mark-used", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userBenefitId: item.userBenefitId,
            isUsedThisPeriod: nextUsed,
          }),
        });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Failed to save.");
        invalidateFeedCache();
        latestRequestedTimeframeRef.current = selectedTimeframe;
        void refreshFeed(selectedTimeframe, true);
      } catch {
        setErrorMessage(MUTATION_ERROR);
        setFeed(previousFeed);
        invalidateFeedCache();
        latestRequestedTimeframeRef.current = selectedTimeframe;
        void refreshFeed(selectedTimeframe, true);
      } finally {
        setPendingById((current) => ({ ...current, [item.userBenefitId]: null }));
      }
    };

    addToast({
      id: toastId,
      message: toastMessage,
      onUndo: () => {
        setFeed(previousFeed);
        setErrorMessage(null);
      },
      onExpire: () => { void fireApi(); },
    });
  };

  // Do Not Track / Start Tracking — optimistic with undo toast.
  const runTrackingMutation = (item: HomeFeedItem, nextStatus: "tracked" | "not_tracked") => {
    const previousFeed = feed;
    const now = new Date();
    const timeframeEnd = getHomeTimeframeEndDate(now, selectedTimeframe);
    const toastId = crypto.randomUUID();
    const toastMessage = nextStatus === "not_tracked" ? "Removed from tracking" : "Added to tracking";

    setErrorMessage(null);
    setFeed(applyTrackingStatusMutation(feed, item, nextStatus, timeframeEnd, now));

    const fireApi = async () => {
      setPendingTrackingById((current) => ({ ...current, [item.userBenefitId]: true }));
      try {
        const response = await fetch("/api/home/tracking-status", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userBenefitId: item.userBenefitId,
          trackingStatus: nextStatus,
        }),
      });
      const payload = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Failed to save.");
        invalidateFeedCache();
        latestRequestedTimeframeRef.current = selectedTimeframe;
        void refreshFeed(selectedTimeframe, true);
      } catch {
        setErrorMessage(MUTATION_ERROR);
        setFeed(previousFeed);
        invalidateFeedCache();
        latestRequestedTimeframeRef.current = selectedTimeframe;
        void refreshFeed(selectedTimeframe, true);
      } finally {
        setPendingTrackingById((current) => ({ ...current, [item.userBenefitId]: false }));
      }
    };

    addToast({
      id: toastId,
      message: toastMessage,
      onUndo: () => {
        setFeed(previousFeed);
        setErrorMessage(null);
      },
      onExpire: () => { void fireApi(); },
    });
  };

  const changeTimeframe = async (nextTimeframe: HomeTimeframeKey) => {
    if (nextTimeframe === selectedTimeframe) {
      return;
    }

    const previousTimeframe = selectedTimeframe;
    latestRequestedTimeframeRef.current = nextTimeframe;
    setSelectedTimeframe(nextTimeframe);
    setIsRefreshingTimeframe(true);
    setErrorMessage(null);

    try {
      const payload = await fetchFeedForTimeframe(nextTimeframe);
      if (latestRequestedTimeframeRef.current !== nextTimeframe) {
        return;
      }

      startTransition(() => {
        setFeed(payload);
      });
    } catch (error) {
      setSelectedTimeframe(previousTimeframe);
      setErrorMessage(error instanceof Error ? error.message : "Couldn't refresh. Showing last known state.");
    } finally {
      setIsRefreshingTimeframe(false);
    }
  };

  if (feed.state.isEmpty) {
    return (
      <AppShell containerClassName="max-w-6xl px-0 md:px-6">
        <MobilePageContainer className="pb-20">
          <EmptyHomeState />
        </MobilePageContainer>
      </AppShell>
    );
  }

  const activeTimeframeIndex = HOME_TIMEFRAME_OPTIONS.findIndex((option) => option.key === selectedTimeframe);
  const timeframeShortLabel = feed.timeframe.shortLabel;
  const isNotTrackedTab = activeBenefitTab === "not_tracked";

  const benefitTabs = [
    { id: "unused" as const, label: "Unused", count: feed.expiringBenefitCount },
    { id: "used" as const, label: "Used", count: feed.usedExpiringBenefitCount },
    { id: "not_tracked" as const, label: "Not Tracked", count: feed.notTrackedBenefitCount },
  ];

  const activeItems =
    activeBenefitTab === "used"
      ? feed.usedExpiringBenefits
      : activeBenefitTab === "not_tracked"
        ? feed.notTrackedBenefits
        : feed.expiringBenefits;

  const sectionTitle = isNotTrackedTab ? "Not Tracked" : "Expiring Benefits";

  const emptyStateForTab = () => {
    if (activeBenefitTab === "not_tracked") {
      return {
        title: "Nothing hidden.",
        description: "Benefits you choose not to track will appear here.",
      };
    }

    if (activeBenefitTab === "used") {
      return {
        title: "No used benefits yet.",
        description: "Benefits you mark as used will appear here.",
      };
    }

    const descriptionMap: Record<HomeTimeframeKey, string> = {
      next_14_days: "No unused benefits reset in the next 2 weeks.",
      next_30_days: "No unused benefits reset in the next month.",
      next_90_days: "No unused benefits reset in the next 3 months.",
      next_6_months: "No unused benefits reset in the next 6 months.",
      this_year: "No unused benefits reset this year.",
    };

    return {
      title: "You're all caught up.",
      description: descriptionMap[selectedTimeframe] ?? `No unused benefits reset in ${timeframeShortLabel}.`,
    };
  };

  return (
    <>
    <AppShell containerClassName="max-w-6xl px-0 md:px-6">
      <MobilePageContainer className="pb-20">
        <div className="space-y-6 pt-5">
          {errorMessage ? (
            <div className="rounded-lg border border-warning/30 bg-warning-muted p-4 text-sm text-foreground">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p>{errorMessage}</p>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-left font-semibold text-warning underline decoration-warning/40 underline-offset-4"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ) : null}

          <WalletHero metrics={feed.metrics} timeframe={feed.timeframe.key} />

          <HomeBenefitRows
            title={sectionTitle}
            items={activeItems}
            variant={
              activeBenefitTab === "used"
                ? "used"
                : activeBenefitTab === "not_tracked"
                  ? "not_tracked"
                  : "urgent"
            }
            pendingById={pendingById}
            pendingTrackingById={pendingTrackingById}
            onMarkUsed={(item) => void runUsageMutation(item, true)}
            onMarkNotUsed={(item) => void runUsageMutation(item, false)}
            onDoNotTrack={(item) => void runTrackingMutation(item, "not_tracked")}
            onStartTracking={(item) => void runTrackingMutation(item, "tracked")}
            headerAccessory={
              <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                {/* Timeframe selector — invisible+non-interactive on Not Tracked to preserve layout */}
                <div
                  aria-hidden={isNotTrackedTab}
                  className={cn(
                    "relative grid w-full grid-cols-5 rounded-lg border border-border bg-surface p-0.5 transition-opacity duration-150 sm:w-[17rem]",
                    isNotTrackedTab ? "pointer-events-none opacity-0" : "",
                  )}
                >
                  <div
                    aria-hidden
                    className="absolute inset-y-0 left-0 m-0.5 rounded-md bg-surface-raised transition-transform duration-300 ease-out"
                    style={{
                      width: "calc((100% - 4px) / 5)",
                      transform: `translateX(${Math.max(activeTimeframeIndex, 0) * 100}%)`,
                    }}
                  />
                  {HOME_TIMEFRAME_OPTIONS.map((option) => {
                    const isActive = option.key === selectedTimeframe;

                    return (
                      <button
                        key={option.key}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        aria-label={option.label}
                        tabIndex={isNotTrackedTab ? -1 : 0}
                        onClick={() => void changeTimeframe(option.key)}
                        className={
                          isActive
                            ? "relative z-10 rounded-md px-2 py-1.5 font-mono text-xs font-semibold tracking-[0.14em] text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                            : "relative z-10 rounded-md px-2 py-1.5 font-mono text-xs font-semibold tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                        }
                      >
                        {option.compactLabel}
                      </button>
                    );
                  })}
                </div>

                {/* Tab selector */}
                <div
                  role="tablist"
                  aria-label="Choose benefit view"
                  aria-busy={isRefreshingTimeframe}
                  className="inline-flex w-full rounded-lg border border-border bg-surface p-0.5 sm:w-auto"
                >
                  {benefitTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={tab.id === activeBenefitTab}
                      onClick={() => setActiveBenefitTab(tab.id)}
                      className={
                        tab.id === activeBenefitTab
                          ? "rounded-md bg-surface-raised px-2.5 py-1 text-sm font-medium text-foreground transition-colors"
                          : "rounded-md px-2.5 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                      }
                    >
                      {tab.label}
                      {tab.count > 0 ? (
                        <span
                          className={cn(
                            "ml-1.5 rounded-full px-1.5 py-0.5 font-mono text-xs font-medium leading-none tabular-nums",
                            tab.id === activeBenefitTab
                              ? "bg-surface-muted text-foreground"
                              : "bg-surface-muted text-subtle-foreground",
                          )}
                        >
                          {tab.count}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            }
            emptyState={emptyStateForTab()}
          />
        </div>
      </MobilePageContainer>
    </AppShell>

    <UndoToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
