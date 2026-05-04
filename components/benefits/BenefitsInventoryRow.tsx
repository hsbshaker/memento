import type { BenefitsInventoryItem } from "@/lib/types/server-data";
import { BenefitsInventoryRowMenu } from "@/components/benefits/BenefitsInventoryRowMenu";
import { cn } from "@/lib/cn";
import {
  ROW_MICRO_TEXT_CLASS,
  ROW_PRIMARY_TEXT_CLASS,
  ROW_SECONDARY_TEXT_CLASS,
} from "@/components/ui/row-typography";

type BenefitsInventoryRowProps = {
  item: BenefitsInventoryItem;
  pendingUsage?: boolean;
  pendingTracking?: boolean;
  onMarkUsed?: (item: BenefitsInventoryItem) => void;
  onMarkNotUsed?: (item: BenefitsInventoryItem) => void;
  onDoNotTrack?: (item: BenefitsInventoryItem) => void;
  onStartTracking?: (item: BenefitsInventoryItem) => void;
};

function buildMarker(item: BenefitsInventoryItem) {
  const name = `${item.cardName} ${item.issuer}`.toLowerCase();

  if (name.includes("platinum")) return { accentClassName: "bg-slate-300/80" };
  if (name.includes("gold")) return { accentClassName: "bg-amber-300/80" };
  if (name.includes("reserve")) return { accentClassName: "bg-sky-300/75" };
  if (name.includes("sapphire")) return { accentClassName: "bg-blue-300/75" };
  if (name.includes("business")) return { accentClassName: "bg-white/42" };

  return {
    accentClassName: item.issuer === "American Express" ? "bg-white/48" : "bg-white/36",
  };
}

function formatCadence(cadence: string): string {
  if (cadence === "semiannual") return "Semiannual";
  if (cadence === "anniversary") return "Anniversary";
  return (cadence[0]?.toUpperCase() ?? "") + cadence.slice(1);
}

const STATUS_PILL: Record<
  BenefitsInventoryItem["inventoryStatus"],
  { label: string; className: string }
> = {
  unused: {
    label: "Unused",
    className: "bg-[#7FB6FF]/10 text-[#7FB6FF]/80",
  },
  used: {
    label: "Used",
    className: "bg-white/[0.06] text-white/50",
  },
  not_tracked: {
    label: "Not Tracked",
    className: "bg-white/[0.04] text-white/38",
  },
};

export function BenefitsInventoryRow({
  item,
  pendingUsage = false,
  pendingTracking = false,
  onMarkUsed,
  onMarkNotUsed,
  onDoNotTrack,
  onStartTracking,
}: BenefitsInventoryRowProps) {
  const marker = buildMarker(item);
  const menuDisabled = pendingUsage || pendingTracking;
  const pill = STATUS_PILL[item.inventoryStatus];

  const isUsed = item.inventoryStatus === "used";
  const isNotTracked = item.inventoryStatus === "not_tracked";

  const nameOpacity = isNotTracked ? "text-white/50" : isUsed ? "text-white/72" : "text-white/90";
  const secondaryOpacity = isNotTracked ? "text-white/32" : isUsed ? "text-white/40" : "text-white/48";

  const menuVariant =
    item.inventoryStatus === "used"
      ? "used"
      : item.inventoryStatus === "not_tracked"
        ? "not_tracked"
        : "unused";

  const valueDisplay = item.value ?? (item.valueCents > 0 ? `$${Math.round(item.valueCents / 100)}` : null) ?? "—";

  return (
    <div className="flex items-center gap-3 px-3.5 py-3 sm:px-4">
      {/* Accent bar */}
      <span
        className={cn("mt-0 h-9 w-1 shrink-0 rounded-full self-center", marker.accentClassName)}
        aria-hidden="true"
      />

      {/* Content — takes remaining space */}
      <div className="min-w-0 flex-1">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1.6fr)] lg:items-center lg:gap-4">
          {/* Left: name + card */}
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h3 className={cn(ROW_PRIMARY_TEXT_CLASS, nameOpacity, "truncate")}>{item.benefitName}</h3>
              <span
                className={cn(
                  "shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-medium leading-none",
                  pill.className,
                )}
              >
                {pill.label}
              </span>
            </div>
            <p className={cn("mt-0.5 truncate", ROW_SECONDARY_TEXT_CLASS, secondaryOpacity)}>
              {item.cardName}
              {item.issuer ? ` · ${item.issuer}` : ""}
            </p>
          </div>

          {/* Right: meta columns */}
          <div className="grid min-w-0 grid-cols-3 gap-3">
            <div className="min-w-0">
              <p className={ROW_MICRO_TEXT_CLASS}>Value</p>
              <p className={cn("mt-1 text-sm font-medium leading-5", nameOpacity)}>{valueDisplay}</p>
            </div>
            <div className="min-w-0">
              <p className={ROW_MICRO_TEXT_CLASS}>Period</p>
              <p className={cn("mt-1 truncate", ROW_SECONDARY_TEXT_CLASS, secondaryOpacity)}>
                {item.periodLabel}
              </p>
            </div>
            <div className="min-w-0">
              <p className={ROW_MICRO_TEXT_CLASS}>Cadence</p>
              <p className={cn("mt-1", ROW_SECONDARY_TEXT_CLASS, secondaryOpacity)}>
                {formatCadence(item.cadence)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action menu */}
      {(onMarkUsed ?? onMarkNotUsed ?? onDoNotTrack ?? onStartTracking) ? (
        <BenefitsInventoryRowMenu
          item={item}
          variant={menuVariant}
          disabled={menuDisabled}
          onMarkUsed={onMarkUsed ?? (() => undefined)}
          onMarkNotUsed={onMarkNotUsed ?? (() => undefined)}
          onDoNotTrack={onDoNotTrack ?? (() => undefined)}
          onStartTracking={onStartTracking ?? (() => undefined)}
        />
      ) : null}
    </div>
  );
}
