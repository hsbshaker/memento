"use client";

import { startTransition, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { HomeFeedItem, HomeFeedResult } from "@/lib/types/server-data";
import { HOME_TIMEFRAME_OPTIONS } from "@/lib/home/home-timeframes";
import { applyUrgentBenefitUsageMutation } from "@/lib/home/optimistic-home-feed";
import { AppShell } from "@/components/ui/AppShell";
import { MobilePageContainer } from "@/components/ui/MobilePageContainer";
import { Surface } from "@/components/ui/Surface";
import { HomeBenefitActionDialog } from "@/components/home/HomeBenefitActionDialog";
import { HomeMetricStrip } from "@/components/home/HomeMetricStrip";
import { HomeBenefitRows } from "@/components/home/HomeBenefitRows";
import { EmptyHomeState } from "@/components/home/EmptyHomeState";

type HomeScreenProps = {
  initialFeed: HomeFeedResult;
};

type FeedResponse = HomeFeedResult & {
  error?: string;
};
type UrgentTab = "unused" | "used";
type PendingAction = {
  item: HomeFeedItem;
  action: "mark-used" | "mark-not-used";
} | null;

export function HomeScreen({ initialFeed }: HomeScreenProps) {
  const [feed, setFeed] = useState(initialFeed);
  const [pendingById, setPendingById] = useState<Record<string, "mark-used" | "mark-not-used" | null>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeUrgentTab, setActiveUrgentTab] = useState<UrgentTab>("unused");
  const [selectedTimeframe, setSelectedTimeframe] = useState(initialFeed.timeframe.key);
  const [isRefreshingTimeframe, setIsRefreshingTimeframe] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [dialogErrorMessage, setDialogErrorMessage] = useState<string | null>(null);

  const refreshFeed = async (timeframe = selectedTimeframe) => {
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/home/feed?timeframe=${timeframe}`, {
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
    }
  };

  const runUsageMutation = async (item: HomeFeedItem, nextUsed: boolean) => {
    const previousFeed = feed;
    const action = nextUsed ? "mark-used" : "mark-not-used";
    setPendingById((current) => ({ ...current, [item.userBenefitId]: action }));
    setErrorMessage(null);
    setFeed(applyUrgentBenefitUsageMutation(feed, item, nextUsed));

    try {
      const response = await fetch("/api/home/mark-used", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userBenefitId: item.userBenefitId,
          isUsedThisPeriod: nextUsed,
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save.");
      }

      setPendingAction(null);
      setDialogErrorMessage(null);
      void refreshFeed(selectedTimeframe);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Couldn’t refresh. Showing last known state.";
      setErrorMessage(message);
      setDialogErrorMessage(message);
      setFeed(previousFeed);
      void refreshFeed(selectedTimeframe);
    } finally {
      setPendingById((current) => ({ ...current, [item.userBenefitId]: null }));
    }
  };

  const changeTimeframe = async (nextTimeframe: string) => {
    const previousTimeframe = selectedTimeframe;
    setSelectedTimeframe(nextTimeframe as typeof selectedTimeframe);
    setIsRefreshingTimeframe(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/home/feed?timeframe=${nextTimeframe}`, {
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
      setSelectedTimeframe(previousTimeframe);
      setErrorMessage(error instanceof Error ? error.message : "Couldn’t refresh. Showing last known state.");
    } finally {
      setIsRefreshingTimeframe(false);
    }
  };

  if (feed.state.isEmpty) {
    return (
      <AppShell containerClassName="max-w-5xl px-0 md:px-6">
        <MobilePageContainer className="pb-20">
          <EmptyHomeState />
        </MobilePageContainer>
      </AppShell>
    );
  }

  const timeframeShortLabel = feed.timeframe.shortLabel;
  const urgentTabs = [
    { id: "unused" as const, label: `Unused (${feed.expiringBenefitCount})` },
    { id: "used" as const, label: `Used (${feed.usedExpiringBenefitCount})` },
  ];
  const activeUrgentItems = activeUrgentTab === "unused" ? feed.expiringBenefits : feed.usedExpiringBenefits;
  const isDialogPending = pendingAction ? pendingById[pendingAction.item.userBenefitId] === pendingAction.action : false;

  const openActionDialog = (item: HomeFeedItem) => {
    setDialogErrorMessage(null);
    setPendingAction({
      item,
      action: activeUrgentTab === "unused" ? "mark-used" : "mark-not-used",
    });
  };

  return (
    <AppShell containerClassName="max-w-5xl px-0 md:px-6">
      <MobilePageContainer className="pb-20">
        <div className="space-y-6 pt-5">
          {errorMessage ? (
            <Surface className="rounded-2xl border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100 shadow-none backdrop-blur-0">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p>Couldn’t refresh. Showing last known state.</p>
                <button
                  type="button"
                  onClick={() => void refreshFeed()}
                  className="text-left font-semibold underline decoration-amber-100/40 underline-offset-4"
                >
                  Retry
                </button>
              </div>
            </Surface>
          ) : null}

          <HomeMetricStrip metrics={feed.metrics} />

          <HomeBenefitRows
            title="Expiring Benefits"
            items={activeUrgentItems}
            variant={activeUrgentTab === "unused" ? "urgent" : "used"}
            pendingById={pendingById}
            onAction={openActionDialog}
            actionLabel={activeUrgentTab === "unused" ? "Mark Used" : "Mark Not Used"}
            headerAccessory={
              <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                <div className="relative w-full sm:w-auto">
                  <select
                    value={selectedTimeframe}
                    onChange={(event) => void changeTimeframe(event.target.value)}
                    disabled={isRefreshingTimeframe}
                    aria-label="Choose expiration timeframe"
                    className="w-full appearance-none rounded-full border border-white/[0.06] bg-white/[0.02] px-3.5 py-1.5 pr-9 text-[13px] font-medium text-white/84 outline-none transition-[border-color,background-color] duration-200 hover:border-white/[0.12] hover:bg-white/[0.028] focus:border-white/[0.14] sm:min-w-[10.5rem]"
                  >
                    {HOME_TIMEFRAME_OPTIONS.map((option) => (
                      <option key={option.key} value={option.key} className="bg-[#0B1220] text-white">
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/36" />
                </div>

                <div className="inline-flex w-full rounded-full border border-white/[0.05] bg-white/[0.015] p-0.5 sm:w-auto">
                  {urgentTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveUrgentTab(tab.id)}
                      className={
                        tab.id === activeUrgentTab
                          ? "rounded-full bg-white/[0.07] px-2.5 py-1 text-[13px] font-medium text-white transition-colors"
                          : "rounded-full px-2.5 py-1 text-[13px] font-medium text-white/42 transition-colors hover:text-white/68"
                      }
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            }
            emptyState={
              activeUrgentTab === "unused"
                ? {
                    title: "You’re all caught up.",
                    description: `No unused benefits expire in ${timeframeShortLabel}.`,
                  }
                : {
                    title: "Nothing marked used yet.",
                    description: "Benefits you mark used will appear here until their current period resets.",
                  }
            }
          />
        </div>

        <HomeBenefitActionDialog
          item={pendingAction?.item ?? null}
          action={pendingAction?.action ?? null}
          pending={Boolean(isDialogPending)}
          errorMessage={dialogErrorMessage}
          onCancel={() => {
            if (isDialogPending) return;
            setPendingAction(null);
            setDialogErrorMessage(null);
          }}
          onConfirm={() => {
            if (!pendingAction || isDialogPending) return;
            void runUsageMutation(pendingAction.item, pendingAction.action === "mark-used");
          }}
        />
      </MobilePageContainer>
    </AppShell>
  );
}
