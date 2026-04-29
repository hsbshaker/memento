"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import type { ConfirmBenefitCardGroup, ConfirmBenefitsPageData } from "./confirm-benefits-data";
import { ConfirmBenefitsCardGroup as ConfirmBenefitsCardGroupSection } from "./confirm-benefits-card-group";
import { ConfirmBenefitsSummary } from "./confirm-benefits-summary";

export type SelectedBenefitKey = `${string}:${string}`;

function makeBenefitKey(userCardId: string, benefitId: string): SelectedBenefitKey {
  return `${userCardId}:${benefitId}`;
}

function getInitialSelectedKeys(cardGroups: ConfirmBenefitCardGroup[]) {
  const keys = new Set<SelectedBenefitKey>();

  for (const group of cardGroups) {
    for (const benefit of group.benefits) {
      if (benefit.selected) {
        keys.add(makeBenefitKey(group.userCardId, benefit.benefitId));
      }
    }
  }

  return keys;
}

function getGroupSelectedCount(group: ConfirmBenefitCardGroup, selectedKeys: Set<SelectedBenefitKey>) {
  return group.benefits.reduce(
    (count, benefit) => count + (selectedKeys.has(makeBenefitKey(group.userCardId, benefit.benefitId)) ? 1 : 0),
    0,
  );
}

function getFooterCopy(selectedCount: number, cardCount: number) {
  return {
    desktop: `${selectedCount} benefit${selectedCount === 1 ? "" : "s"} selected across ${cardCount} card${cardCount === 1 ? "" : "s"}`,
    mobile: `${selectedCount} selected`,
  };
}

function hasAnniversaryDateValue(value: string | null | undefined) {
  return Boolean(value?.trim());
}

export function ConfirmBenefitsClient({ data }: { data: ConfirmBenefitsPageData }) {
  const router = useRouter();
  const [selectedKeys, setSelectedKeys] = useState<Set<SelectedBenefitKey>>(() =>
    getInitialSelectedKeys(data.cardGroups),
  );
  const [activeCardUserCardId, setActiveCardUserCardId] = useState<string>(
    () => data.cardGroups[0]?.userCardId ?? "",
  );
  const [anniversaryDatesByGroup, setAnniversaryDatesByGroup] = useState<Record<string, string>>(() =>
    Object.fromEntries(data.cardGroups.map((group) => [group.userCardId, group.anniversaryDate ?? ""])),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const totalSelected = selectedKeys.size;
  const footerCopy = getFooterCopy(totalSelected, data.totalCards);

  const groupsMissingRequiredAnniversaryDate = useMemo(
    () =>
      new Set(
        data.cardGroups
          .filter((group) => {
            const hasSelectedAnniversaryBenefit = group.benefits.some(
              (benefit) =>
                benefit.requiresAnniversaryDate &&
                selectedKeys.has(makeBenefitKey(group.userCardId, benefit.benefitId)),
            );

            if (!hasSelectedAnniversaryBenefit) {
              return false;
            }

            return !hasAnniversaryDateValue(anniversaryDatesByGroup[group.userCardId]);
          })
          .map((group) => group.userCardId),
      ),
    [anniversaryDatesByGroup, data.cardGroups, selectedKeys],
  );
  const hasMissingRequiredAnniversaryDate = groupsMissingRequiredAnniversaryDate.size > 0;
  const isFooterActionDisabled = totalSelected === 0 || hasMissingRequiredAnniversaryDate;
  const hasMultipleCards = data.cardGroups.length > 1;
  const activeCardGroup =
    data.cardGroups.find((group) => group.userCardId === activeCardUserCardId) ?? data.cardGroups[0] ?? null;

  const handleSave = async () => {
    if (isFooterActionDisabled || isSaving) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch("/api/onboarding/confirm-benefits", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userCards: data.cardGroups.map((group) => ({
            userCardId: group.userCardId,
            cardAnniversaryDate: anniversaryDatesByGroup[group.userCardId] || null,
            benefits: group.benefits.map((benefit) => ({
              benefitId: benefit.benefitId,
              selected: selectedKeys.has(makeBenefitKey(group.userCardId, benefit.benefitId)),
            })),
          })),
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "We couldn’t save your reminders. Please try again.");
      }

      router.push("/home");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "We couldn’t save your reminders. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleBenefit = (userCardId: string, benefitId: string) => {
    const key = makeBenefitKey(userCardId, benefitId);
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const updateAnniversaryDate = (userCardId: string, value: string) => {
    setAnniversaryDatesByGroup((current) => ({
      ...current,
      [userCardId]: value,
    }));
  };

  const selectGroup = (group: ConfirmBenefitCardGroup) => {
    setSelectedKeys((current) => {
      const next = new Set(current);
      for (const benefit of group.benefits) {
        next.add(makeBenefitKey(group.userCardId, benefit.benefitId));
      }
      return next;
    });
  };

  const clearGroup = (group: ConfirmBenefitCardGroup) => {
    setSelectedKeys((current) => {
      const next = new Set(current);
      for (const benefit of group.benefits) {
        next.delete(makeBenefitKey(group.userCardId, benefit.benefitId));
      }
      return next;
    });
  };

  return (
    <div className="space-y-4 pb-32 sm:space-y-5 md:pb-40">
      <ConfirmBenefitsSummary
        cardCount={data.totalCards}
        totalPotentialValueCents={data.totalPotentialValueCents}
        totalPotentialValueIsPartial={data.totalPotentialValueIsPartial}
      />

      <div className="pt-1">
        <Link
          href="/onboarding/build-your-lineup"
          className="inline-flex items-center gap-2 text-sm font-medium text-white/54 transition hover:text-white/82 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7C948]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220]"
        >
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4 shrink-0">
            <path
              d="m11.5 5.5-4 4 4 4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Back to wallet</span>
        </Link>
      </div>

      {activeCardGroup ? (
        hasMultipleCards ? (
          <Surface className="overflow-hidden rounded-[1.75rem] border-white/8 bg-white/[0.05] p-0">
            <div className="px-4 pt-4 sm:px-5 sm:pt-5">
              <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-5 sm:px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div role="tablist" aria-label="Selected cards" className="flex min-w-full gap-2 snap-x snap-mandatory">
                  {data.cardGroups.map((cardGroup) => {
                    const isActive = cardGroup.userCardId === activeCardGroup.userCardId;

                    return (
                      <button
                        key={cardGroup.userCardId}
                        type="button"
                        onClick={() => setActiveCardUserCardId(cardGroup.userCardId)}
                        role="tab"
                        aria-selected={isActive}
                        aria-controls={`card-panel-${cardGroup.userCardId}`}
                        id={`card-tab-${cardGroup.userCardId}`}
                        className={`shrink-0 snap-start rounded-full border px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7C948]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220] ${
                          isActive
                            ? "border-white/12 bg-white/[0.06] text-white"
                            : "border-transparent bg-transparent text-white/58 hover:bg-white/[0.03] hover:text-white/82"
                        }`}
                        tabIndex={isActive ? 0 : -1}
                      >
                        <span className="block truncate font-medium leading-5">
                          {cardGroup.cardName} ({cardGroup.totalCount})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="border-t border-white/[0.06]">
              <div
                role="tabpanel"
                id={`card-panel-${activeCardGroup.userCardId}`}
                aria-labelledby={`card-tab-${activeCardGroup.userCardId}`}
              >
                <ConfirmBenefitsCardGroupSection
                  key={activeCardGroup.userCardId}
                  cardGroup={activeCardGroup}
                  selectedKeys={selectedKeys}
                  selectedCount={getGroupSelectedCount(activeCardGroup, selectedKeys)}
                  anniversaryDate={anniversaryDatesByGroup[activeCardGroup.userCardId] ?? ""}
                  needsAnniversaryDate={groupsMissingRequiredAnniversaryDate.has(activeCardGroup.userCardId)}
                  embedded
                  onToggleBenefit={toggleBenefit}
                  onAnniversaryDateChange={updateAnniversaryDate}
                  onSelectAll={() => selectGroup(activeCardGroup)}
                  onClearAll={() => clearGroup(activeCardGroup)}
                />
              </div>
            </div>
          </Surface>
        ) : (
          <div>
            <ConfirmBenefitsCardGroupSection
              key={activeCardGroup.userCardId}
              cardGroup={activeCardGroup}
              selectedKeys={selectedKeys}
              selectedCount={getGroupSelectedCount(activeCardGroup, selectedKeys)}
              anniversaryDate={anniversaryDatesByGroup[activeCardGroup.userCardId] ?? ""}
              needsAnniversaryDate={groupsMissingRequiredAnniversaryDate.has(activeCardGroup.userCardId)}
              onToggleBenefit={toggleBenefit}
              onAnniversaryDateChange={updateAnniversaryDate}
              onSelectAll={() => selectGroup(activeCardGroup)}
              onClearAll={() => clearGroup(activeCardGroup)}
            />
          </div>
        )
      ) : null}

      {saveError ? (
        <p role="alert" aria-live="polite" className="text-sm text-rose-100/88">
          {saveError}
        </p>
      ) : null}

      <div className="sticky bottom-4 z-30 hidden md:block">
        <div className="rounded-3xl border border-white/12 bg-[#0B1220]/90 p-3 backdrop-blur-md">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white/88">{footerCopy.desktop}</p>
              {totalSelected === 0 ? (
                <p className="mt-1 text-xs text-white/46">Select at least one benefit to continue.</p>
              ) : hasMissingRequiredAnniversaryDate ? (
                <p className="mt-1 text-xs text-white/46">Add the required card anniversary date to continue.</p>
              ) : (
                <p className="mt-1 text-xs text-white/42">Ready to save your reminders.</p>
              )}
            </div>
            <Button
              disabled={isFooterActionDisabled || isSaving}
              onClick={() => void handleSave()}
            >
              {isSaving ? "Saving..." : "Save reminders"}
            </Button>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#0B1220]/75 px-4 py-3 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        <div className="mx-auto w-full max-w-3xl">
          <div className="rounded-[1.75rem] border border-white/12 bg-[#0B1220]/90 p-3 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white/88">{footerCopy.mobile}</p>
                {totalSelected === 0 ? (
                  <p className="mt-1 text-xs text-white/46">Select at least one benefit to continue.</p>
                ) : hasMissingRequiredAnniversaryDate ? (
                  <p className="mt-1 text-xs text-white/46">Add the required card anniversary date to continue.</p>
                ) : null}
              </div>
              <Button
                disabled={isFooterActionDisabled || isSaving}
                className="px-5"
                onClick={() => void handleSave()}
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
