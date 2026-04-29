"use client";

import { Surface } from "@/components/ui/Surface";

type ConfirmBenefitsSummaryProps = {
  cardCount: number;
  benefitCount: number;
  selectedCount: number;
  onSelectAll: () => void;
  onClearAll: () => void;
  onSelectRecommended: () => void;
  showZeroSelectedHint: boolean;
};

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3.5 py-2">
      <span className="text-sm font-semibold text-white">{value}</span>
      <span className="text-sm text-white/56">{label}</span>
    </div>
  );
}

export function ConfirmBenefitsSummary({
  cardCount,
  benefitCount,
  selectedCount,
  onSelectAll,
  onClearAll,
  onSelectRecommended,
  showZeroSelectedHint,
}: ConfirmBenefitsSummaryProps) {
  return (
    <Surface className="rounded-[1.75rem] border-white/10 bg-white/5 p-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <SummaryMetric label={cardCount === 1 ? "card selected" : "cards selected"} value={String(cardCount)} />
          <SummaryMetric label={benefitCount === 1 ? "benefit found" : "benefits found"} value={String(benefitCount)} />
          <SummaryMetric label="selected" value={String(selectedCount)} />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <button type="button" onClick={onSelectAll} className="text-sm font-medium text-white/62 transition hover:text-white/88">
            Select all
          </button>
          <button type="button" onClick={onClearAll} className="text-sm font-medium text-white/62 transition hover:text-white/88">
            Clear all
          </button>
          <button type="button" onClick={onSelectRecommended} className="text-sm font-medium text-[#F7D774]/88 transition hover:text-[#F7D774]">
            Recommended
          </button>
        </div>

        {showZeroSelectedHint ? (
          <p className="text-sm text-white/46">Select at least one benefit to continue.</p>
        ) : null}
      </div>
    </Surface>
  );
}
