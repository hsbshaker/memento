"use client";

import type { CheckedState } from "@radix-ui/react-checkbox";
import { Checkbox } from "@/components/ui/checkbox";
import { Surface } from "@/components/ui/Surface";
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
    <p className="mt-1 text-sm text-white/48">{issuer}</p>
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
  isExpanded,
  onToggleExpanded,
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
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onToggleBenefit: (userCardId: string, benefitId: string) => void;
  onAnniversaryDateChange: (userCardId: string, value: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}) {
  const hasBenefits = cardGroup.totalCount > 0;
  const allSelected = hasBenefits && selectedCount === cardGroup.totalCount;
  const noneSelected = selectedCount === 0;
  const parentCheckedState: CheckedState = allSelected ? true : noneSelected ? false : "indeterminate";
  const hasSelectedAnniversaryBenefit = cardGroup.benefits.some(
    (benefit) =>
      benefit.requiresAnniversaryDate &&
      selectedKeys.has(makeBenefitKey(cardGroup.userCardId, benefit.benefitId)),
  );

  return (
    <Surface className="rounded-[1.75rem] border-white/10 bg-white/6 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <button
          type="button"
          onClick={onToggleExpanded}
          className="min-w-0 flex-1 text-left outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-[#F7C948]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220]"
          aria-expanded={isExpanded}
          aria-controls={`benefit-group-${cardGroup.userCardId}`}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60">
              <svg
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
                className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
              >
                <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold tracking-tight text-white sm:text-lg">{cardGroup.cardName}</h2>
              <CardMeta issuer={cardGroup.issuer} />
            </div>
          </div>
        </button>

        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 sm:text-right">
          <div>
            <p className="text-sm font-medium text-white/80">
              {selectedCount} of {cardGroup.totalCount} selected
            </p>
            {hasBenefits ? (
              <div className="mt-1 flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-sm text-white/52">
                <button type="button" onClick={onSelectAll} className="transition hover:text-white/82">
                  Select all
                </button>
                <span aria-hidden className="text-white/20">
                  ·
                </span>
                <button type="button" onClick={onClearAll} className="transition hover:text-white/82">
                  Clear
                </button>
              </div>
            ) : null}
          </div>

          {hasBenefits ? (
            <Checkbox
              checked={parentCheckedState}
              onCheckedChange={(checked) => {
                if (checked === true || checked === "indeterminate") {
                  onSelectAll();
                } else {
                  onClearAll();
                }
              }}
              aria-label={`Toggle all benefits for ${cardGroup.cardName}`}
              className="mt-0.5 data-[state=indeterminate]:border-[#F7C948]/65 data-[state=indeterminate]:bg-[#F7C948]/18"
            />
          ) : null}

          {needsAnniversaryDate ? (
            <div className="inline-flex w-fit shrink-0 items-center rounded-full border border-amber-300/22 bg-amber-300/8 px-2.5 py-1 text-[10px] font-medium tracking-[0.12em] text-amber-100/88 uppercase">
              Anniversary date needed
            </div>
          ) : null}
        </div>
      </div>

      <div id={`benefit-group-${cardGroup.userCardId}`} className="mt-4">
        {cardGroup.totalCount === 0 ? (
          <div className="rounded-[1.25rem] border border-dashed border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/55">
            No trackable benefits found for this card yet.
          </div>
        ) : isExpanded ? (
          <div className="space-y-3">
            {hasSelectedAnniversaryBenefit ? (
              <div
                className={
                  needsAnniversaryDate
                    ? "rounded-[1.25rem] border border-amber-300/22 bg-amber-300/10 px-4 py-4"
                    : "rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-4"
                }
              >
                <p className="text-sm font-medium text-white/88">
                  Some benefits on this card reset around your card anniversary.
                </p>
                <p className="mt-1 text-sm leading-6 text-white/58">
                  Add your card anniversary so Memento can track these accurately.
                </p>
                <div className="mt-3 max-w-xs">
                  <label htmlFor={`anniversary-date-${cardGroup.userCardId}`} className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-white/46">
                    Card anniversary
                  </label>
                  <input
                    id={`anniversary-date-${cardGroup.userCardId}`}
                    type="date"
                    value={anniversaryDate}
                    onChange={(event) => onAnniversaryDateChange(cardGroup.userCardId, event.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-white/8 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/45 focus:border-[#F7C948]/35 focus:ring-2 focus:ring-[#F7C948]/20"
                  />
                </div>
                {needsAnniversaryDate ? (
                  <p className="mt-3 text-sm text-amber-100/90">Add the required card anniversary date to continue.</p>
                ) : (
                  <p className="mt-3 text-sm text-white/48">You can update this later before reminders are saved.</p>
                )}
              </div>
            ) : null}

            <div className="border-t border-white/8 px-1 sm:px-2">
              {cardGroup.benefits.map((benefit, index) => {
                const checked = selectedKeys.has(makeBenefitKey(cardGroup.userCardId, benefit.benefitId));

                return (
                  <div
                    key={`${benefit.userCardId}-${benefit.benefitId}`}
                    className={index > 0 ? "border-t border-white/8" : undefined}
                  >
                    <ConfirmBenefitRowItem
                      benefit={benefit}
                      checked={checked}
                      onToggle={() => onToggleBenefit(cardGroup.userCardId, benefit.benefitId)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </Surface>
  );
}
