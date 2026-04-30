import type { HomeFeedItem } from "@/lib/types/server-data";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type HomeBenefitRowProps = {
  item: HomeFeedItem;
  variant?: "urgent" | "upcoming" | "used";
  pending?: boolean;
  actionLabel?: string | null;
  onAction?: (item: HomeFeedItem) => void;
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
    return {
      accentClassName: "bg-slate-300/80",
    };
  }

  if (name.includes("gold")) {
    return {
      accentClassName: "bg-amber-300/80",
    };
  }

  if (name.includes("reserve")) {
    return {
      accentClassName: "bg-sky-300/75",
    };
  }

  if (name.includes("sapphire")) {
    return {
      accentClassName: "bg-blue-300/75",
    };
  }

  if (name.includes("business")) {
    return {
      accentClassName: "bg-white/42",
    };
  }

  return {
    accentClassName: item.issuer === "American Express" ? "bg-white/48" : "bg-white/36",
  };
}

export function HomeBenefitRow({
  item,
  variant = "urgent",
  pending = false,
  actionLabel = "Mark Used",
  onAction,
}: HomeBenefitRowProps) {
  const marker = buildMarker(item);
  const isUrgent = variant === "urgent";
  const isUsed = variant === "used";
  const timingLabel = simplifyTimingLabel(item.timingLabel);

  return (
    <div className={cn("px-3.5 py-3 sm:px-4", isUrgent ? "text-white" : "text-white/78")}>
      <div className="grid gap-3 md:grid-cols-[minmax(0,2.55fr)_minmax(0,1.35fr)_auto] md:items-center md:gap-4">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <span className={cn("mt-0.5 h-10 w-1 shrink-0 rounded-full", marker.accentClassName)} aria-hidden="true" />
            <div className="min-w-0">
              <h3 className={cn("text-sm leading-5 font-medium sm:text-[14px]", isUsed ? "text-white/82" : "text-white/96")}>
                {item.benefitName}
              </h3>
              <p className={cn("mt-1 text-sm", isUrgent ? "text-white/54" : isUsed ? "text-white/44" : "text-white/42")}>
                {item.cardName}
              </p>
            </div>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-3 gap-3 md:gap-3.5">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-white/34">Value</p>
            <p className={cn("mt-1 text-sm font-semibold", isUrgent ? "text-white" : isUsed ? "text-white/74" : "text-white/68")}>
              {item.currentPeriodValueLabel ?? "Tracked"}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-white/34">Resets</p>
            <p className={cn("mt-1 text-sm", isUrgent ? "text-white/72" : isUsed ? "text-white/58" : "text-white/54")}>{timingLabel}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-white/34">Cadence</p>
            <p className={cn("mt-1 text-sm", isUrgent ? "text-white/62" : isUsed ? "text-white/52" : "text-white/48")}>
              {item.cadence === "semiannual" ? "Semiannual" : item.cadence === "anniversary" ? "Anniversary" : item.cadence[0]?.toUpperCase() + item.cadence.slice(1)}
            </p>
          </div>
        </div>

        <div className="md:justify-self-end">
          {onAction && actionLabel ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onAction(item)}
              disabled={pending}
              className={cn(
                "w-full rounded-lg border-white/[0.1] px-3 py-1.25 text-[11px] font-semibold transition-[border-color,background-color,color] duration-200 md:w-auto",
                isUsed
                  ? "bg-white/[0.018] text-white/72 hover:border-white/[0.16] hover:bg-white/[0.045] hover:text-white/82"
                  : "bg-white/[0.03] text-white/84 hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-white/92",
              )}
            >
              {pending ? "Saving..." : actionLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
