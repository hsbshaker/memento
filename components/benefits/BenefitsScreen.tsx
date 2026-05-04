"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  BenefitInventoryStatus,
  BenefitsInventoryItem,
  BenefitsFeedResult,
  SupportedBenefitCadence,
} from "@/lib/types/server-data";
import { AppShell } from "@/components/ui/AppShell";
import { MobilePageContainer } from "@/components/ui/MobilePageContainer";
import { BenefitsInventoryRows } from "@/components/benefits/BenefitsInventoryRows";
import { cn } from "@/lib/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

type BenefitTab = "all" | "unused" | "used" | "not_tracked";

type BenefitsScreenProps = {
  initialFeed: BenefitsFeedResult;
};

type FeedResponse = BenefitsFeedResult & { error?: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MUTATION_ERROR = "Couldn't update that benefit. Please try again.";
const SEARCH_DEBOUNCE_MS = 200;

/** Client-side sort: cardName ASC, then benefitName ASC. */
function sortInventoryItems(items: BenefitsInventoryItem[]): BenefitsInventoryItem[] {
  return [...items].sort(
    (a, b) => a.cardName.localeCompare(b.cardName) || a.benefitName.localeCompare(b.benefitName),
  );
}

function tabToStatus(tab: BenefitTab): BenefitInventoryStatus | null {
  if (tab === "unused") return "unused";
  if (tab === "used") return "used";
  if (tab === "not_tracked") return "not_tracked";
  return null;
}

function recomputeCounts(items: BenefitsInventoryItem[]) {
  return {
    all: items.length,
    unused: items.filter((i) => i.inventoryStatus === "unused").length,
    used: items.filter((i) => i.inventoryStatus === "used").length,
    notTracked: items.filter((i) => i.inventoryStatus === "not_tracked").length,
  };
}

function toInventoryStatus(
  trackingStatus: "tracked" | "not_tracked",
  isUsedThisPeriod: boolean,
): BenefitInventoryStatus {
  if (trackingStatus === "not_tracked") return "not_tracked";
  return isUsedThisPeriod ? "used" : "unused";
}

function applyUsageMutation(
  items: BenefitsInventoryItem[],
  target: BenefitsInventoryItem,
  nextUsed: boolean,
): BenefitsInventoryItem[] {
  return items.map((item) => {
    if (item.userBenefitId !== target.userBenefitId) return item;
    const nextInventoryStatus = toInventoryStatus(item.trackingStatus, nextUsed);
    return {
      ...item,
      isUsedThisPeriod: nextUsed,
      lastUsedAt: nextUsed ? new Date().toISOString() : null,
      inventoryStatus: nextInventoryStatus,
    };
  });
}

function applyTrackingMutation(
  items: BenefitsInventoryItem[],
  target: BenefitsInventoryItem,
  nextStatus: "tracked" | "not_tracked",
): BenefitsInventoryItem[] {
  return items.map((item) => {
    if (item.userBenefitId !== target.userBenefitId) return item;
    const nextInventoryStatus = toInventoryStatus(nextStatus, item.isUsedThisPeriod);
    return {
      ...item,
      trackingStatus: nextStatus,
      inventoryStatus: nextInventoryStatus,
    };
  });
}

function filterItems(
  items: BenefitsInventoryItem[],
  tab: BenefitTab,
  search: string,
  issuer: string,
  cadence: string,
  cardFilterId: string | null,
): BenefitsInventoryItem[] {
  const status = tabToStatus(tab);
  const q = search.trim().toLowerCase();

  return items.filter((item) => {
    if (status && item.inventoryStatus !== status) return false;
    if (issuer && item.issuer !== issuer) return false;
    if (cadence && item.cadence !== cadence) return false;
    if (cardFilterId && item.userCardId !== cardFilterId) return false;
    if (q) {
      const hay = [item.benefitName, item.cardName, item.issuer, item.nickname, item.lastFour]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function emptyMessageForTab(tab: BenefitTab, hasFilters: boolean, cardFilterId: string | null): string {
  if (cardFilterId) {
    if (hasFilters) return "No benefits match these filters for this card.";
    if (tab === "not_tracked") return "No untracked benefits found for this card.";
    if (tab === "unused") return "No unused benefits found for this card.";
    if (tab === "used") return "No used benefits found for this card.";
    return "No trackable benefits found for this card.";
  }
  if (hasFilters) return "No benefits match these filters.";
  if (tab === "not_tracked") return "No benefits are currently set to not tracked.";
  if (tab === "unused") return "No unused benefits found.";
  if (tab === "used") return "No used benefits found.";
  return "No benefits yet. Add cards to your wallet to start tracking benefits.";
}

function formatCadenceLabel(cadence: SupportedBenefitCadence): string {
  if (cadence === "semiannual") return "Semiannual";
  if (cadence === "anniversary") return "Anniversary";
  return (cadence[0]?.toUpperCase() ?? "") + cadence.slice(1);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BenefitsScreen({ initialFeed }: BenefitsScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // All items from the server (full unfiltered set from initial SSR)
  const [allItems, setAllItems] = useState<BenefitsInventoryItem[]>(initialFeed.items);
  // Stable counts for tab badges (recomputed optimistically)
  const [counts, setCounts] = useState(initialFeed.counts);
  // Filter state
  const [activeTab, setActiveTab] = useState<BenefitTab>("all");
  const [search, setSearch] = useState("");
  const [issuerFilter, setIssuerFilter] = useState("");
  const [cadenceFilter, setCadenceFilter] = useState("");
  // Card filter from URL param (read once on mount)
  const [cardFilterId, setCardFilterId] = useState<string | null>(
    () => searchParams.get("userCardId") ?? searchParams.get("card") ?? null,
  );
  // Pending mutation state
  const [pendingById, setPendingById] = useState<Record<string, "mark-used" | "mark-not-used" | null>>({});
  const [pendingTrackingById, setPendingTrackingById] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Filter options (from initial feed; stable until page reload)
  const [filterOptions] = useState(initialFeed.filters);

  // Debounced search ref
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [search]);

  // Background refetch when filters change (except optimistic mutations handle counts locally)
  const lastFetchParamsRef = useRef<string | null>(null);

  const fetchFiltered = useCallback(async (tab: BenefitTab, s: string, issuer: string, cadence: string, cardId: string | null) => {
    const params = new URLSearchParams();
    const status = tabToStatus(tab);
    if (status) params.set("status", status);
    if (s) params.set("search", s);
    if (issuer) params.set("issuer", issuer);
    if (cadence) params.set("cadence", cadence);
    if (cardId) params.set("userCardId", cardId);

    const key = params.toString();
    if (lastFetchParamsRef.current === key) return;
    lastFetchParamsRef.current = key;

    try {
      const response = await fetch(`/api/benefits/feed?${key}`, {
        method: "GET",
        credentials: "include",
      });
      const payload = (await response.json()) as FeedResponse;
      if (!response.ok) return;

      // Only update if params still match (avoid race conditions)
      if (lastFetchParamsRef.current !== key) return;

      setAllItems(sortInventoryItems(payload.items));
      setCounts(payload.counts);
    } catch {
      // Silent — optimistic state is still shown
    }
  }, []);

  // Re-fetch when tab or filters change (search is debounced)
  useEffect(() => {
    void fetchFiltered(activeTab, debouncedSearch, issuerFilter, cadenceFilter, cardFilterId);
  }, [activeTab, debouncedSearch, issuerFilter, cadenceFilter, cardFilterId, fetchFiltered]);

  // Visible items after client-side filter + sort
  const visibleItems = sortInventoryItems(
    filterItems(allItems, activeTab, debouncedSearch, issuerFilter, cadenceFilter, cardFilterId),
  );

  const hasActiveFilters = Boolean(debouncedSearch || issuerFilter || cadenceFilter);

  // Card filter display info
  const activeCardInfo = cardFilterId
    ? filterOptions.cards.find((c) => c.userCardId === cardFilterId)
    : null;
  const cardDisplayName = activeCardInfo
    ? (activeCardInfo.nickname ?? activeCardInfo.cardName)
    : null;

  const handleClearCardFilter = () => {
    setCardFilterId(null);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.delete("userCardId");
    newParams.delete("card");
    router.replace(`/benefits${newParams.size > 0 ? `?${newParams.toString()}` : ""}`);
  };

  // ─── Mutations ───────────────────────────────────────────────────────────────

  const runUsageMutation = async (item: BenefitsInventoryItem, nextUsed: boolean) => {
    const previousItems = allItems;
    const previousCounts = counts;
    const action = nextUsed ? "mark-used" : "mark-not-used" as const;

    setPendingById((c) => ({ ...c, [item.userBenefitId]: action }));
    setErrorMessage(null);

    const nextItems = applyUsageMutation(allItems, item, nextUsed);
    setAllItems(nextItems);
    setCounts(recomputeCounts(nextItems));

    try {
      const response = await fetch("/api/home/mark-used", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userBenefitId: item.userBenefitId, isUsedThisPeriod: nextUsed }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to save.");

      // Invalidate cache so next fetch picks up server truth
      lastFetchParamsRef.current = null;
      void fetchFiltered(activeTab, debouncedSearch, issuerFilter, cadenceFilter, cardFilterId);
    } catch {
      setErrorMessage(MUTATION_ERROR);
      setAllItems(previousItems);
      setCounts(previousCounts);
      lastFetchParamsRef.current = null;
    } finally {
      setPendingById((c) => ({ ...c, [item.userBenefitId]: null }));
    }
  };

  const runTrackingMutation = async (item: BenefitsInventoryItem, nextStatus: "tracked" | "not_tracked") => {
    const previousItems = allItems;
    const previousCounts = counts;

    setPendingTrackingById((c) => ({ ...c, [item.userBenefitId]: true }));
    setErrorMessage(null);

    const nextItems = applyTrackingMutation(allItems, item, nextStatus);
    setAllItems(nextItems);
    setCounts(recomputeCounts(nextItems));

    try {
      const response = await fetch("/api/home/tracking-status", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userBenefitId: item.userBenefitId, trackingStatus: nextStatus }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to save.");

      lastFetchParamsRef.current = null;
      void fetchFiltered(activeTab, debouncedSearch, issuerFilter, cadenceFilter, cardFilterId);
    } catch {
      setErrorMessage(MUTATION_ERROR);
      setAllItems(previousItems);
      setCounts(previousCounts);
      lastFetchParamsRef.current = null;
    } finally {
      setPendingTrackingById((c) => ({ ...c, [item.userBenefitId]: false }));
    }
  };

  // ─── Tab config ───────────────────────────────────────────────────────────────

  const tabs: { id: BenefitTab; label: string; count: number }[] = [
    { id: "all", label: "All", count: counts.all },
    { id: "unused", label: "Unused", count: counts.unused },
    { id: "used", label: "Used", count: counts.used },
    { id: "not_tracked", label: "Not Tracked", count: counts.notTracked },
  ];

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <AppShell containerClassName="max-w-6xl px-0 md:px-6">
      <MobilePageContainer className="pb-20">
        <div className="space-y-6 pt-5">
          {/* Error banner */}
          {errorMessage ? (
            <div className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p>{errorMessage}</p>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-left font-semibold underline decoration-amber-100/40 underline-offset-4"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ) : null}

          {/* Page header */}
          <p className="text-xs font-medium tracking-[0.24em] text-[#F7C948] uppercase">Benefits</p>

          {/* Tabs + filters row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Tab bar */}
            <div
              role="tablist"
              aria-label="Filter benefits by status"
              className="inline-flex w-full rounded-lg border border-white/[0.08] bg-white/[0.015] p-0.5 sm:w-auto"
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={tab.id === activeTab}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[13px] font-medium transition-colors",
                    tab.id === activeTab
                      ? "bg-white/[0.07] text-white"
                      : "text-white/42 hover:text-white/68",
                  )}
                >
                  {tab.label}
                  {tab.count > 0 ? (
                    <span
                      className={cn(
                        "ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium leading-none tabular-nums",
                        tab.id === activeTab
                          ? "bg-white/[0.1] text-white/80"
                          : "bg-white/[0.06] text-white/38",
                      )}
                    >
                      {tab.count}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap gap-2 sm:flex-nowrap">
              {/* Search */}
              <input
                type="search"
                placeholder="Search benefits…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cn(
                  "h-9 w-full rounded-lg border border-white/8 bg-transparent px-3 text-sm text-white/60 placeholder:text-white/30",
                  "focus:border-white/20 focus:outline-none focus:ring-0",
                  "sm:w-48",
                )}
              />

              {/* Issuer filter */}
              {filterOptions.issuers.length > 1 ? (
                <select
                  value={issuerFilter}
                  onChange={(e) => setIssuerFilter(e.target.value)}
                  className={cn(
                    "h-9 rounded-lg border border-white/8 bg-[#101418] px-3 text-sm text-white/60",
                    "focus:border-white/20 focus:outline-none focus:ring-0",
                    "min-w-[8rem]",
                  )}
                >
                  <option value="">All Issuers</option>
                  {filterOptions.issuers.map((iss) => (
                    <option key={iss} value={iss}>
                      {iss}
                    </option>
                  ))}
                </select>
              ) : null}

              {/* Cadence filter */}
              {filterOptions.cadences.length > 1 ? (
                <select
                  value={cadenceFilter}
                  onChange={(e) => setCadenceFilter(e.target.value)}
                  className={cn(
                    "h-9 rounded-lg border border-white/8 bg-[#101418] px-3 text-sm text-white/60",
                    "focus:border-white/20 focus:outline-none focus:ring-0",
                    "min-w-[8rem]",
                  )}
                >
                  <option value="">All Cadences</option>
                  {filterOptions.cadences.map((cad) => (
                    <option key={cad} value={cad}>
                      {formatCadenceLabel(cad)}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          </div>

          {/* Active card filter indicator */}
          {cardFilterId ? (
            <div className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-sm">
              <span className="text-white/55">Showing benefits for</span>
              <span className="font-medium text-white/80">
                {cardDisplayName ?? "this card"}
              </span>
              <button
                type="button"
                onClick={handleClearCardFilter}
                aria-label="Clear card filter"
                className="ml-auto text-white/38 transition-colors hover:text-white/65"
              >
                ×
              </button>
            </div>
          ) : null}

          {/* Inventory list */}
          <BenefitsInventoryRows
            items={visibleItems}
            pendingById={pendingById}
            pendingTrackingById={pendingTrackingById}
            onMarkUsed={(item) => void runUsageMutation(item, true)}
            onMarkNotUsed={(item) => void runUsageMutation(item, false)}
            onDoNotTrack={(item) => void runTrackingMutation(item, "not_tracked")}
            onStartTracking={(item) => void runTrackingMutation(item, "tracked")}
            emptyMessage={emptyMessageForTab(activeTab, hasActiveFilters, cardFilterId)}
          />
        </div>
      </MobilePageContainer>
    </AppShell>
  );
}
