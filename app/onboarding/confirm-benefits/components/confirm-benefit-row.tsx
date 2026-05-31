"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/cn";
import { ROW_PRIMARY_TEXT_CLASS, ROW_SECONDARY_TEXT_CLASS } from "@/components/ui/row-typography";
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
    <div className="group/benefit -mx-2 flex items-start gap-3 px-2 py-2.5 transition hover:bg-hover sm:gap-3.5 sm:py-3">
      <label className="flex min-w-0 flex-1 cursor-pointer gap-3 sm:gap-3.5">
        <div className="pt-0.5">
          <Checkbox
            checked={checked}
            onCheckedChange={onToggle}
            aria-label={`Track ${benefit.benefitName}`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            <p className={ROW_PRIMARY_TEXT_CLASS}>{benefit.benefitName}</p>
          </div>

          {benefit.valueDisplay ? (
            <p className={cn("mt-0.5", ROW_SECONDARY_TEXT_CLASS, "text-subtle-foreground")}>{benefit.valueDisplay}</p>
          ) : null}

          {benefit.descriptionDisplay && isDescriptionOpen ? (
            <p className="mt-2 pr-4 text-sm leading-6 text-subtle-foreground">{benefit.descriptionDisplay}</p>
          ) : null}
        </div>
      </label>

      {benefit.descriptionDisplay ? (
        <button
          type="button"
          aria-label={`${isDescriptionOpen ? "Hide" : "Show"} details for ${benefit.benefitName}`}
          aria-expanded={isDescriptionOpen}
          onClick={() => setIsDescriptionOpen((current) => !current)}
          className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center text-subtle-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
