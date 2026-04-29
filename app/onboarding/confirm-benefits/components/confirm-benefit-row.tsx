"use client";

import { Checkbox } from "@/components/ui/checkbox";
import type { ConfirmBenefitRow } from "./confirm-benefits-data";

function buildSecondaryMeta(benefit: ConfirmBenefitRow) {
  return [
    benefit.cadenceDisplay ? benefit.cadenceDisplay : null,
    benefit.resetDisplay ? benefit.resetDisplay : null,
    benefit.enrollmentRequired ? "Enrollment required" : null,
    benefit.requiresSetup ? "Setup needed" : null,
  ].filter((value): value is string => Boolean(value));
}

export function ConfirmBenefitRowItem({
  benefit,
  checked,
  onToggle,
}: {
  benefit: ConfirmBenefitRow;
  checked: boolean;
  onToggle: () => void;
}) {
  const secondaryMeta = buildSecondaryMeta(benefit);

  return (
    <label className="flex cursor-pointer gap-3 py-3.5 first:pt-0 last:pb-0">
      <div className="pt-0.5">
        <Checkbox
          checked={checked}
          onCheckedChange={onToggle}
          aria-label={`Track ${benefit.benefitName}`}
          className="border-white/20 bg-white/[0.04] data-[state=checked]:border-[#F7C948]/65 data-[state=checked]:bg-[#F7C948]/18"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <p className="min-w-0 text-sm font-medium leading-5 text-white/94">{benefit.benefitName}</p>
          {benefit.valueDisplay ? (
            <p className="shrink-0 text-sm font-medium leading-5 text-white/76 sm:text-right">
              {benefit.valueDisplay}
            </p>
          ) : null}
        </div>

        {secondaryMeta.length > 0 ? (
          <p className="mt-1.5 text-sm leading-5 text-white/50">{secondaryMeta.join(" · ")}</p>
        ) : null}
      </div>
    </label>
  );
}
