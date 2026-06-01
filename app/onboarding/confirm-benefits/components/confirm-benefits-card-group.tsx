"use client";

import { useRef, useState } from "react";
import {
  ROW_ACTION_TEXT_CLASS,
  ROW_MICRO_TEXT_CLASS,
  ROW_PRIMARY_TEXT_CLASS,
  ROW_SECONDARY_TEXT_CLASS,
} from "@/components/ui/row-typography";
import { cn } from "@/lib/cn";
import type { ConfirmBenefitCardGroup } from "./confirm-benefits-data";
import { ConfirmBenefitRowItem } from "./confirm-benefit-row";
import type { SelectedBenefitKey } from "./confirm-benefits-client";

function CardMeta({
  issuer,
}: {
  issuer: string | null;
}) {
  if (!issuer) return null;

  return (
    <p className={cn("mt-1", ROW_SECONDARY_TEXT_CLASS, "text-subtle-foreground")}>{issuer}</p>
  );
}

function makeBenefitKey(userCardId: string, benefitId: string): SelectedBenefitKey {
  return `${userCardId}:${benefitId}`;
}

export function ConfirmBenefitsCardGroup({
  cardGroup,
  selectedKeys,
  selectedCount,
  anniversaryDate,
  needsAnniversaryDate,
  embedded = false,
  onToggleBenefit,
  onAnniversaryDateChange,
  onSelectAll,
  onClearAll,
}: {
  cardGroup: ConfirmBenefitCardGroup;
  selectedKeys: Set<SelectedBenefitKey>;
  selectedCount: number;
  anniversaryDate: string;
  needsAnniversaryDate: boolean;
  embedded?: boolean;
  onToggleBenefit: (userCardId: string, benefitId: string) => void;
  onAnniversaryDateChange: (userCardId: string, value: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}) {
  const hasBenefits = cardGroup.totalCount > 0;
  const hasSelectedAnniversaryBenefit = cardGroup.benefits.some(
    (benefit) =>
      benefit.requiresAnniversaryDate &&
      selectedKeys.has(makeBenefitKey(cardGroup.userCardId, benefit.benefitId)),
  );
  const shouldConstrainBenefitList = cardGroup.totalCount > 5;
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [showBottomFade, setShowBottomFade] = useState(shouldConstrainBenefitList);

  return (
    <div
      className={cn(
        "px-4 py-4 sm:px-5 sm:py-5",
        embedded ? "rounded-none border-0 bg-transparent" : "rounded-xl border border-border bg-surface",
      )}
    >
      <div className="flex flex-col gap-3.5">
        <div className="min-w-0">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <h2 className={cn(ROW_PRIMARY_TEXT_CLASS, "text-base sm:text-base")}>{cardGroup.cardName}</h2>
            <p className={cn(ROW_SECONDARY_TEXT_CLASS, "text-subtle-foreground")}>
              {selectedCount} of {cardGroup.totalCount} selected
            </p>
          </div>
          <CardMeta issuer={cardGroup.issuer} />
        </div>

        <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 text-muted-foreground", ROW_ACTION_TEXT_CLASS)}>
          {hasBenefits ? (
            <>
              <button type="button" onClick={onSelectAll} className="transition hover:text-foreground">
                Select all
              </button>
              <span aria-hidden className="text-subtle-foreground">
                ·
              </span>
              <button type="button" onClick={onClearAll} className="transition hover:text-foreground">
                Clear
              </button>
            </>
          ) : null}

          {needsAnniversaryDate ? (
            <div className="inline-flex w-fit shrink-0 items-center rounded-md border border-warning/30 bg-warning-muted px-2 py-1 font-mono text-xs font-medium tracking-[0.12em] text-warning uppercase">
              Anniversary date needed
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-4">
        {cardGroup.totalCount === 0 ? (
          <div className="px-1 py-2 text-sm text-muted-foreground">
            No trackable benefits found for this card yet.
          </div>
        ) : (
          <div className="space-y-4">
            {hasSelectedAnniversaryBenefit ? (
              <div
                className={
                  needsAnniversaryDate
                    ? "rounded-xl border border-warning/30 bg-warning-muted px-4 py-3.5"
                    : "rounded-xl border border-border bg-surface px-4 py-3.5"
                }
              >
                <p className="text-sm font-medium text-foreground">
                  Some benefits on this card reset around your card anniversary.
                </p>
                <p className={cn("mt-1 leading-6 text-muted-foreground", ROW_SECONDARY_TEXT_CLASS)}>
                  Add your card anniversary so Memento can track these accurately.
                </p>
                <div className="mt-3 max-w-xs">
                  <label htmlFor={`anniversary-date-${cardGroup.userCardId}`} className={cn("mb-2 block", ROW_MICRO_TEXT_CLASS)}>
                    Card anniversary
                  </label>
                  <input
                    id={`anniversary-date-${cardGroup.userCardId}`}
                    type="date"
                    value={anniversaryDate}
                    onChange={(event) => onAnniversaryDateChange(cardGroup.userCardId, event.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-surface-muted px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-border-strong focus:ring-2 focus:ring-focus"
                  />
                </div>
                {needsAnniversaryDate ? (
                  <p className="mt-3 text-sm text-warning">Add the required card anniversary date to continue.</p>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">You can update this later before reminders are saved.</p>
                )}
              </div>
            ) : null}

            <div className="relative">
              <div
                ref={scrollContainerRef}
                tabIndex={shouldConstrainBenefitList ? 0 : undefined}
                aria-label={shouldConstrainBenefitList ? `${cardGroup.cardName} benefits` : undefined}
                onScroll={
                  shouldConstrainBenefitList
                    ? (event) => {
                        const node = event.currentTarget;
                        const remainingScroll = node.scrollHeight - node.scrollTop - node.clientHeight;
                        setShowBottomFade(remainingScroll > 4);
                      }
                    : undefined
                }
                className={cn(
                  "divide-y divide-border",
                  shouldConstrainBenefitList &&
                    "max-h-[17.75rem] overflow-y-auto pr-2 [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border-strong [&::-webkit-scrollbar-track]:bg-transparent sm:max-h-[18.5rem]",
                )}
              >
                {cardGroup.benefits.map((benefit) => {
                  const checked = selectedKeys.has(makeBenefitKey(cardGroup.userCardId, benefit.benefitId));

                  return (
                    <div key={`${benefit.userCardId}-${benefit.benefitId}`}>
                      <ConfirmBenefitRowItem
                        benefit={benefit}
                        checked={checked}
                        onToggle={() => onToggleBenefit(cardGroup.userCardId, benefit.benefitId)}
                      />
                    </div>
                  );
                })}
              </div>

              {shouldConstrainBenefitList && showBottomFade ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-surface via-surface/80 to-transparent"
                />
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
