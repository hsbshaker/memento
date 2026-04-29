"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
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

function getAllBenefitKeys(cardGroups: ConfirmBenefitCardGroup[]) {
  return cardGroups.flatMap((group) =>
    group.benefits.map((benefit) => makeBenefitKey(group.userCardId, benefit.benefitId)),
  );
}

function getInitialExpandedGroups(cardGroups: ConfirmBenefitCardGroup[]) {
  const totalBenefitCount = cardGroups.reduce((count, group) => count + group.totalCount, 0);
  const expanded = new Set<string>();

  if (totalBenefitCount <= 12) {
    for (const group of cardGroups) {
      expanded.add(group.userCardId);
    }
    return expanded;
  }

  const firstGroup = cardGroups[0];
  if (firstGroup) {
    expanded.add(firstGroup.userCardId);
  }

  return expanded;
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
  const allBenefitKeys = useMemo(() => getAllBenefitKeys(data.cardGroups), [data.cardGroups]);
  const [selectedKeys, setSelectedKeys] = useState<Set<SelectedBenefitKey>>(() =>
    getInitialSelectedKeys(data.cardGroups),
  );
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() =>
    getInitialExpandedGroups(data.cardGroups),
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

  const selectAll = () => {
    setSelectedKeys(new Set(allBenefitKeys));
  };

  const clearAll = () => {
    setSelectedKeys(new Set());
  };

  const selectRecommended = () => {
    // TODO: Refine "recommended" once we have a more specific recommendation signal.
    setSelectedKeys(new Set(allBenefitKeys));
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

  const toggleExpandedGroup = (userCardId: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(userCardId)) {
        next.delete(userCardId);
      } else {
        next.add(userCardId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4 pb-32 sm:space-y-5 md:pb-40">
      <ConfirmBenefitsSummary
        cardCount={data.totalCards}
        benefitCount={data.totalBenefits}
        selectedCount={totalSelected}
        onSelectAll={selectAll}
        onClearAll={clearAll}
        onSelectRecommended={selectRecommended}
        showZeroSelectedHint={false}
      />

      <div className="space-y-4">
        {data.cardGroups.map((cardGroup) => {
          const selectedCount = getGroupSelectedCount(cardGroup, selectedKeys);

          return (
            <ConfirmBenefitsCardGroupSection
              key={cardGroup.userCardId}
              cardGroup={cardGroup}
              selectedKeys={selectedKeys}
              selectedCount={selectedCount}
              anniversaryDate={anniversaryDatesByGroup[cardGroup.userCardId] ?? ""}
              needsAnniversaryDate={groupsMissingRequiredAnniversaryDate.has(cardGroup.userCardId)}
              isExpanded={expandedGroups.has(cardGroup.userCardId)}
              onToggleExpanded={() => toggleExpandedGroup(cardGroup.userCardId)}
              onToggleBenefit={toggleBenefit}
              onAnniversaryDateChange={updateAnniversaryDate}
              onSelectAll={() => selectGroup(cardGroup)}
              onClearAll={() => clearGroup(cardGroup)}
            />
          );
        })}
      </div>

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
