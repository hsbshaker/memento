import type { BenefitsInventoryItem } from "@/lib/types/server-data";
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

// Resting marker bar is a single restrained neutral, consistent with Home.
// A structured per-card color palette is a deferred follow-up (see WO6 notes).
const REST_MARKER_CLASS = "bg-border-strong";
const ROW_ACTION_BUTTON_CLASS =
  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40";

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
    className: "bg-accent-muted text-accent",
  },
  used: {
    label: "Used",
    className: "bg-surface-muted text-muted-foreground",
  },
  not_tracked: {
    label: "Not Tracked",
    className: "bg-surface-muted text-subtle-foreground",
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
  const actionsDisabled = pendingUsage || pendingTracking;
  const pill = STATUS_PILL[item.inventoryStatus];

  const isUsed = item.inventoryStatus === "used";
  const isNotTracked = item.inventoryStatus === "not_tracked";

  // Status-driven dimming via semantic text tiers (unused reads brightest).
  const nameClass = isNotTracked ? "text-subtle-foreground" : isUsed ? "text-muted-foreground" : "";
  const secondaryClass = isNotTracked || isUsed ? "text-subtle-foreground" : "";

  const valueDisplay = item.value ?? (item.valueCents > 0 ? `$${Math.round(item.valueCents / 100)}` : null) ?? "—";

  return (
    <div className="flex items-center gap-3 px-3.5 py-3 sm:px-4">
      {/* Accent bar */}
      <span
        className={cn("mt-0 h-9 w-1 shrink-0 rounded-full self-center", REST_MARKER_CLASS)}
        aria-hidden="true"
      />

      {/* Content — takes remaining space */}
      <div className="min-w-0 flex-1">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1.6fr)] lg:items-center lg:gap-4">
          {/* Left: name + card */}
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h3 className={cn(ROW_PRIMARY_TEXT_CLASS, nameClass, "truncate")}>{item.benefitName}</h3>
              <span
                className={cn(
                  "shrink-0 rounded-full px-1.5 py-0.5 font-mono text-xs font-medium leading-none",
                  pill.className,
                )}
              >
                {pill.label}
              </span>
            </div>
            <p className={cn("mt-0.5 truncate", ROW_SECONDARY_TEXT_CLASS, secondaryClass)}>
              {item.cardName}
              {item.issuer ? ` · ${item.issuer}` : ""}
            </p>
          </div>

          {/* Right: meta columns */}
          <div className="grid min-w-0 grid-cols-3 gap-3">
            <div className="min-w-0">
              <p className={ROW_MICRO_TEXT_CLASS}>Value</p>
              <p className={cn("mt-1", ROW_PRIMARY_TEXT_CLASS, nameClass)}>{valueDisplay}</p>
            </div>
            <div className="min-w-0">
              <p className={ROW_MICRO_TEXT_CLASS}>Resets</p>
              <p className={cn("mt-1 truncate", ROW_SECONDARY_TEXT_CLASS, secondaryClass)}>
                {item.resetsLabel}
              </p>
            </div>
            <div className="min-w-0">
              <p className={ROW_MICRO_TEXT_CLASS}>Cadence</p>
              <p className={cn("mt-1", ROW_SECONDARY_TEXT_CLASS, secondaryClass)}>
                {formatCadence(item.cadence)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Visible row actions, aligned with the Home/Dashboard interaction pattern. */}
      <div className="flex shrink-0 items-center gap-1.5">
        {!isUsed && !isNotTracked && onMarkUsed ? (
          <button
            type="button"
            title="Mark as used"
            aria-label="Mark as used"
            disabled={actionsDisabled}
            onClick={() => onMarkUsed(item)}
            className={cn(
              ROW_ACTION_BUTTON_CLASS,
              actionsDisabled
                ? "border-border"
                : "border-border-strong hover:border-success/60 hover:bg-success-muted",
            )}
          >
            <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3 text-muted-foreground transition-colors duration-150" aria-hidden>
              <path d="M2.5 6.5 5 9l4.5-5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : null}

        {isUsed && onMarkNotUsed ? (
          <button
            type="button"
            title="Mark as unused"
            aria-label="Mark as unused"
            disabled={actionsDisabled}
            onClick={() => onMarkNotUsed(item)}
            className={cn(
              ROW_ACTION_BUTTON_CLASS,
              actionsDisabled
                ? "border-border"
                : "border-success/40 bg-success-muted hover:border-border-strong hover:bg-surface-muted",
            )}
          >
            <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3 text-success transition-colors duration-150" aria-hidden>
              <path d="M2.5 6.5 5 9l4.5-5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : null}

        {isNotTracked && onStartTracking ? (
          <button
            type="button"
            title="Start tracking"
            aria-label="Start tracking"
            disabled={actionsDisabled}
            onClick={() => onStartTracking(item)}
            className={cn(
              ROW_ACTION_BUTTON_CLASS,
              actionsDisabled
                ? "border-border"
                : "border-border-strong hover:border-success/55 hover:bg-success-muted",
            )}
          >
            <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3 text-muted-foreground transition-colors duration-150" aria-hidden>
              <path d="M6 2.5v7M2.5 6h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}

        {!isNotTracked && onDoNotTrack ? (
          <button
            type="button"
            title="Do not track"
            aria-label="Do not track"
            disabled={actionsDisabled}
            onClick={() => onDoNotTrack(item)}
            className={cn(
              ROW_ACTION_BUTTON_CLASS,
              actionsDisabled
                ? "border-border"
                : "border-border-strong hover:border-destructive/55 hover:bg-destructive-muted",
            )}
          >
            <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3 text-muted-foreground transition-colors duration-150" aria-hidden>
              <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}
