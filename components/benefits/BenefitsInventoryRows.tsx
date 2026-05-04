import type { BenefitsInventoryItem } from "@/lib/types/server-data";
import { BenefitsInventoryRow } from "@/components/benefits/BenefitsInventoryRow";
import { cn } from "@/lib/cn";

type BenefitsInventoryRowsProps = {
  items: BenefitsInventoryItem[];
  pendingById?: Record<string, "mark-used" | "mark-not-used" | null | undefined>;
  pendingTrackingById?: Record<string, boolean>;
  onMarkUsed?: (item: BenefitsInventoryItem) => void;
  onMarkNotUsed?: (item: BenefitsInventoryItem) => void;
  onDoNotTrack?: (item: BenefitsInventoryItem) => void;
  onStartTracking?: (item: BenefitsInventoryItem) => void;
  emptyMessage?: string;
};

export function BenefitsInventoryRows({
  items,
  pendingById,
  pendingTrackingById,
  onMarkUsed,
  onMarkNotUsed,
  onDoNotTrack,
  onStartTracking,
  emptyMessage = "No benefits match these filters.",
}: BenefitsInventoryRowsProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.05] bg-white/[0.015] px-4 py-8 text-center">
        <p className="text-sm text-white/42">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-white/[0.05] bg-white/[0.015]",
        items.length > 8
          ? "max-h-[40rem] overflow-y-auto [scrollbar-color:rgba(255,255,255,0.18)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/14 [&::-webkit-scrollbar-track]:bg-transparent"
          : "",
      )}
    >
      {items.map((item, index) => {
        const pendingUsage =
          pendingById
            ? pendingById[item.userBenefitId] === (item.inventoryStatus === "used" ? "mark-not-used" : "mark-used")
            : false;
        const pendingTracking = pendingTrackingById?.[item.userBenefitId] === true;

        return (
          <div key={item.userBenefitId} className={cn(index > 0 ? "border-t border-white/[0.045]" : undefined)}>
            <BenefitsInventoryRow
              item={item}
              pendingUsage={pendingUsage}
              pendingTracking={pendingTracking}
              onMarkUsed={onMarkUsed}
              onMarkNotUsed={onMarkNotUsed}
              onDoNotTrack={onDoNotTrack}
              onStartTracking={onStartTracking}
            />
          </div>
        );
      })}
    </div>
  );
}
