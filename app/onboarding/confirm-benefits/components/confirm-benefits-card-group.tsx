"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
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
  const Container = embedded ? "div" : Surface;
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [showBottomFade, setShowBottomFade] = useState(shouldConstrainBenefitList);

  return (
    <Container
      className={cn(
        "p-4 sm:p-5",
        embedded ? "rounded-none border-0 bg-transparent shadow-none backdrop-blur-none" : "rounded-[1.75rem] border-white/8 bg-white/[0.05]",
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="min-w-0">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <h2 className="text-base font-semibold tracking-tight text-white sm:text-lg">{cardGroup.cardName}</h2>
            <p className="text-sm text-white/66">
              {selectedCount} of {cardGroup.totalCount} selected
            </p>
          </div>
          <CardMeta issuer={cardGroup.issuer} />
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-white/50">
          {hasBenefits ? (
            <>
              <button type="button" onClick={onSelectAll} className="transition hover:text-white/78">
                Select all
              </button>
              <span aria-hidden className="text-white/18">
                ·
              </span>
              <button type="button" onClick={onClearAll} className="transition hover:text-white/78">
                Clear
              </button>
            </>
          ) : null}

          {needsAnniversaryDate ? (
            <div className="inline-flex w-fit shrink-0 items-center rounded-full border border-amber-300/18 bg-amber-300/6 px-2.5 py-1 text-[10px] font-medium tracking-[0.12em] text-amber-100/82 uppercase">
              Anniversary date needed
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        {cardGroup.totalCount === 0 ? (
          <div className="rounded-[1.25rem] border border-dashed border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/55">
            No trackable benefits found for this card yet.
          </div>
        ) : (
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

            <div className="relative overflow-hidden rounded-[1.15rem]">
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
                  "px-1 sm:px-2",
                  shouldConstrainBenefitList &&
                    "max-h-[17.75rem] overflow-y-auto pr-2 [scrollbar-color:rgba(255,255,255,0.18)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/14 [&::-webkit-scrollbar-track]:bg-transparent sm:max-h-[18.5rem]",
                )}
              >
                {cardGroup.benefits.map((benefit, index) => {
                  const checked = selectedKeys.has(makeBenefitKey(cardGroup.userCardId, benefit.benefitId));

                  return (
                    <div
                      key={`${benefit.userCardId}-${benefit.benefitId}`}
                      className={index > 0 ? "mt-2 border-t border-white/[0.04] pt-2" : undefined}
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

              {shouldConstrainBenefitList && showBottomFade ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-7 rounded-b-[1.15rem] bg-gradient-to-t from-[#171b23] via-[#171b23]/78 to-transparent"
                />
              ) : null}
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}
