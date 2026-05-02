import type { HomeFeedItem } from "@/lib/types/server-data";
import { HomeBenefitRowMenu } from "@/components/home/HomeBenefitRowMenu";
import { cn } from "@/lib/cn";
import {
  ROW_MICRO_TEXT_CLASS,
  ROW_NUMERIC_TEXT_CLASS,
  ROW_PRIMARY_TEXT_CLASS,
  ROW_SECONDARY_TEXT_CLASS,
} from "@/components/ui/row-typography";

type HomeBenefitRowVariant = "urgent" | "upcoming" | "used" | "not_tracked";

type HomeBenefitRowProps = {
  item: HomeFeedItem;
  variant?: HomeBenefitRowVariant;
  pendingUsage?: boolean;
  pendingTracking?: boolean;
  onMarkUsed?: (item: HomeFeedItem) => void;
  onMarkNotUsed?: (item: HomeFeedItem) => void;
  onDoNotTrack?: (item: HomeFeedItem) => void;
  onStartTracking?: (item: HomeFeedItem) => void;
};

function simplifyTimingLabel(label: string) {
  if (label === "Resets today") {
    return "Today";
  }

  if (label.startsWith("Resets in ")) {
    return label.replace("Resets in ", "In ");
  }

  return label;
}

function buildMarker(item: HomeFeedItem) {
  const name = `${item.cardName} ${item.issuer}`.toLowerCase();

  if (name.includes("platinum")) {
    return { accentClassName: "bg-slate-300/80" };
  }

  if (name.includes("gold")) {
    return { accentClassName: "bg-amber-300/80" };
  }

  if (name.includes("reserve")) {
    return { accentClassName: "bg-sky-300/75" };
  }

  if (name.includes("sapphire")) {
    return { accentClassName: "bg-blue-300/75" };
  }

  if (name.includes("business")) {
    return { accentClassName: "bg-white/42" };
  }

  return {
    accentClassName: item.issuer === "American Express" ? "bg-white/48" : "bg-white/36",
  };
}

function toMenuVariant(variant: HomeBenefitRowVariant): "unused" | "used" | "not_tracked" {
  if (variant === "used") return "used";
  if (variant === "not_tracked") return "not_tracked";
  return "unused";
}

export function HomeBenefitRow({
  item,
  variant = "urgent",
  pendingUsage = false,
  pendingTracking = false,
  onMarkUsed,
  onMarkNotUsed,
  onDoNotTrack,
  onStartTracking,
}: HomeBenefitRowProps) {
  const marker = buildMarker(item);
  const isUrgent = variant === "urgent";
  const isUsed = variant === "used";
  const timingLabel = simplifyTimingLabel(item.timingLabel);
  const menuDisabled = pendingUsage || pendingTracking;

  const nameOpacity = isUrgent ? "text-white/90" : isUsed ? "text-white/78" : "text-white/68";
  const secondaryOpacity = isUrgent ? "text-white/48" : isUsed ? "text-white/40" : "text-white/38";
  const valueOpacity = isUrgent ? "text-white/90" : isUsed ? "text-white/72" : "text-white/60";
  const metaOpacity = isUrgent ? "text-white/50" : isUsed ? "text-white/46" : "text-white/38";

  return (
    <div className={cn("px-3.5 py-3 sm:px-4", isUrgent ? "text-white" : "text-white/78")}>
      <div className="flex items-center gap-3">
        {/* Benefit name + card — takes remaining space */}
        <div className="min-w-0 flex-1">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,2.55fr)_minmax(0,1.35fr)] lg:items-center lg:gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <span className={cn("mt-0.5 h-10 w-1 shrink-0 rounded-full", marker.accentClassName)} aria-hidden="true" />
              <div className="min-w-0">
                <h3 className={cn(ROW_PRIMARY_TEXT_CLASS, nameOpacity)}>{item.benefitName}</h3>
                <p className={cn("mt-1", ROW_SECONDARY_TEXT_CLASS, secondaryOpacity)}>{item.cardName}</p>
              </div>
            </div>

            <div className="grid min-w-0 grid-cols-3 gap-3 md:gap-3.5">
              <div className="min-w-0">
                <p className={ROW_MICRO_TEXT_CLASS}>Value</p>
                <p className={cn("mt-1", ROW_NUMERIC_TEXT_CLASS, valueOpacity)}>
                  {item.currentPeriodValueLabel ?? "Tracked"}
                </p>
              </div>
              <div className="min-w-0">
                <p className={ROW_MICRO_TEXT_CLASS}>Resets</p>
                <p className={cn("mt-1", ROW_SECONDARY_TEXT_CLASS, metaOpacity)}>{timingLabel}</p>
              </div>
              <div className="min-w-0">
                <p className={ROW_MICRO_TEXT_CLASS}>Cadence</p>
                <p className={cn("mt-1", ROW_SECONDARY_TEXT_CLASS, metaOpacity)}>
                  {item.cadence === "semiannual"
                    ? "Semiannual"
                    : item.cadence === "anniversary"
                      ? "Anniversary"
                      : (item.cadence[0]?.toUpperCase() ?? "") + item.cadence.slice(1)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 3-dot menu — always right-aligned */}
        {(onMarkUsed ?? onMarkNotUsed ?? onDoNotTrack ?? onStartTracking) ? (
          <HomeBenefitRowMenu
            item={item}
            variant={toMenuVariant(variant)}
            disabled={menuDisabled}
            onMarkUsed={onMarkUsed ?? (() => undefined)}
            onMarkNotUsed={onMarkNotUsed ?? (() => undefined)}
            onDoNotTrack={onDoNotTrack ?? (() => undefined)}
            onStartTracking={onStartTracking ?? (() => undefined)}
          />
        ) : null}
      </div>
    </div>
  );
}
