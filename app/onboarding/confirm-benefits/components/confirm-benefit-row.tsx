"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import type { ConfirmBenefitRow } from "./confirm-benefits-data";

export function ConfirmBenefitRowItem({
  benefit,
  checked,
  onToggle,
}: {
  benefit: ConfirmBenefitRow;
  checked: boolean;
  onToggle: () => void;
}) {
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);

  return (
    <div className="group/benefit flex items-start gap-3 py-3 first:pt-0 last:pb-0 sm:gap-3.5 sm:py-3.5">
      <label className="flex min-w-0 flex-1 cursor-pointer gap-3 sm:gap-3.5">
        <div className="pt-1">
          <Checkbox
            checked={checked}
            onCheckedChange={onToggle}
            aria-label={`Track ${benefit.benefitName}`}
            className="border-white/14 bg-white/[0.03] data-[state=checked]:border-[#F7C948]/55 data-[state=checked]:bg-[#F7C948]/14"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            <p className="min-w-0 text-sm font-medium leading-5 text-white/94">{benefit.benefitName}</p>
          </div>

          {benefit.valueDisplay ? (
            <p className="mt-1 text-sm font-medium leading-5 text-white/74">{benefit.valueDisplay}</p>
          ) : null}

          {benefit.descriptionDisplay && isDescriptionOpen ? (
            <p className="mt-1.5 pr-4 text-sm leading-6 text-white/52">{benefit.descriptionDisplay}</p>
          ) : null}
        </div>
      </label>

      {benefit.descriptionDisplay ? (
        <button
          type="button"
          aria-label={`${isDescriptionOpen ? "Hide" : "Show"} details for ${benefit.benefitName}`}
          aria-expanded={isDescriptionOpen}
          onClick={() => setIsDescriptionOpen((current) => !current)}
          className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white/28 transition hover:text-white/54 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7C948]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220]"
        >
          <svg
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
            className={`h-4 w-4 transition-transform duration-200 ${isDescriptionOpen ? "rotate-180" : ""}`}
          >
            <path
              d="m6 8 4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
