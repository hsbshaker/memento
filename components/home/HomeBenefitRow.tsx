"use client";

import { useState } from "react";
import type { HomeFeedItem } from "@/lib/types/server-data";
import { cn } from "@/lib/cn";
import {
  ROW_MICRO_TEXT_CLASS,
  ROW_NUMERIC_TEXT_CLASS,
  ROW_PRIMARY_TEXT_CLASS,
  ROW_SECONDARY_TEXT_CLASS,
} from "@/components/ui/row-typography";

type HomeBenefitRowVariant = "urgent" | "upcoming" | "used" | "not_tracked";
type ExitAction = "used" | "not_tracked" | "mark-unused" | "start-tracking";

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

// Flash duration before fade starts (ms)
const FLASH_MS = 380;
// Fade-out duration (ms) — must match the Tailwind duration class below
const FADE_MS = 280;

function simplifyTimingLabel(label: string) {
  if (label === "Resets today") return "Today";
  if (label.startsWith("Resets in ")) return label.replace("Resets in ", "In ");
  return label;
}

// Resting marker bar is a single restrained neutral. A structured per-card
// color palette is introduced in WO6 (Wallet); keep it token-based here.
const REST_MARKER_CLASS = "bg-border-strong";

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
  const [exitAction, setExitAction] = useState<ExitAction | null>(null);
  const [fading, setFading] = useState(false);

  const isUrgent = variant === "urgent";
  const isUsed = variant === "used";
  const timingLabel = simplifyTimingLabel(item.timingLabel);
  const actionsDisabled = pendingUsage || pendingTracking || exitAction !== null;

  // Variant dimming, expressed through semantic text tokens. Urgent rows use the
  // row-typography defaults (foreground/muted); used and not-tracked rows step
  // down a tier so they read as de-emphasized.
  const nameClass = isUrgent ? "" : "text-muted-foreground";
  const secondaryClass = isUrgent ? "" : "text-subtle-foreground";
  const valueClass = isUrgent ? "" : isUsed ? "text-muted-foreground" : "text-subtle-foreground";
  const metaClass = isUrgent ? "" : "text-subtle-foreground";

  // Accent bar during exit — semantic flash, then the row fades out.
  const accentBarClass =
    exitAction === "used" || exitAction === "start-tracking"
      ? "bg-success"
      : exitAction === "not_tracked"
        ? "bg-destructive"
        : exitAction === "mark-unused"
          ? "bg-muted-foreground"
          : REST_MARKER_CLASS;

  const triggerExit = (action: ExitAction, handler: () => void) => {
    if (actionsDisabled) return;
    setExitAction(action);
    setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        handler();
      }, FADE_MS);
    }, FLASH_MS);
  };

  const handleMarkUsed = () => {
    if (onMarkUsed) triggerExit("used", () => onMarkUsed(item));
  };

  const handleDoNotTrack = () => {
    if (onDoNotTrack) triggerExit("not_tracked", () => onDoNotTrack(item));
  };

  const handleMarkNotUsed = () => {
    if (onMarkNotUsed) triggerExit("mark-unused", () => onMarkNotUsed(item));
  };

  const handleStartTracking = () => {
    if (onStartTracking) triggerExit("start-tracking", () => onStartTracking(item));
  };

  return (
    <div
      className={cn(
        "px-3.5 py-3 transition-colors duration-150 ease-out hover:bg-surface-subtle sm:px-4",
        fading ? "opacity-0" : "opacity-100",
        isUrgent ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <div className="flex items-center gap-3">
        {/* Benefit name + card */}
        <div
          className={cn(
            "min-w-0 flex-1 transition-opacity duration-200",
            exitAction ? "opacity-30" : "opacity-100",
          )}
        >
          <div className="grid gap-3 lg:grid-cols-[minmax(0,2.55fr)_minmax(0,1.35fr)] lg:items-center lg:gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <span
                className={cn(
                  "mt-0.5 h-10 w-1 shrink-0 rounded-full transition-colors duration-200",
                  accentBarClass,
                )}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <h3 className={cn(ROW_PRIMARY_TEXT_CLASS, nameClass)}>{item.benefitName}</h3>
                <div className="mt-1 flex items-center gap-2">
                  <p className={cn(ROW_SECONDARY_TEXT_CLASS, secondaryClass)}>{item.cardName}</p>
                  {isUrgent && item.urgencyTier === "high" ? (
                    <span className="shrink-0 rounded-full bg-warning-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-warning">
                      {item.daysRemaining <= 0 ? "Due today" : "Due soon"}
                    </span>
                  ) : isUrgent && item.urgencyTier === "soon" ? (
                    <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-subtle-foreground">
                      Due soon
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid min-w-0 grid-cols-3 gap-3 md:gap-3.5">
              <div className="min-w-0">
                <p className={ROW_MICRO_TEXT_CLASS}>Value</p>
                <p className={cn("mt-1", ROW_NUMERIC_TEXT_CLASS, valueClass)}>
                  {item.currentPeriodValueLabel ?? "Tracked"}
                </p>
              </div>
              <div className="min-w-0">
                <p className={ROW_MICRO_TEXT_CLASS}>Resets</p>
                <p className={cn("mt-1", ROW_SECONDARY_TEXT_CLASS, metaClass)}>{timingLabel}</p>
              </div>
              <div className="min-w-0">
                <p className={ROW_MICRO_TEXT_CLASS}>Cadence</p>
                <p className={cn("mt-1", ROW_SECONDARY_TEXT_CLASS, metaClass)}>
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

        {/* Urgent row actions: check + X */}
        {isUrgent ? (
          <div className="flex shrink-0 items-center gap-1.5">
            {onMarkUsed ? (
              <button
                type="button"
                title="Mark as used"
                aria-label="Mark as used"
                disabled={actionsDisabled}
                onClick={handleMarkUsed}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  exitAction === "used"
                    ? "border-success bg-success-muted"
                    : actionsDisabled
                      ? "cursor-not-allowed border-border opacity-40"
                      : "border-border-strong hover:border-success/60 hover:bg-success-muted",
                )}
              >
                <svg viewBox="0 0 12 12" fill="none" className={cn("h-3 w-3 transition-colors duration-150", exitAction === "used" ? "text-success" : "text-muted-foreground")} aria-hidden>
                  <path d="M2.5 6.5 5 9l4.5-5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ) : null}

            {onDoNotTrack ? (
              <button
                type="button"
                title="Do not track"
                aria-label="Do not track"
                disabled={actionsDisabled}
                onClick={handleDoNotTrack}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  exitAction === "not_tracked"
                    ? "border-destructive bg-destructive-muted"
                    : actionsDisabled
                      ? "cursor-not-allowed border-border opacity-40"
                      : "border-border-strong hover:border-destructive/55 hover:bg-destructive-muted",
                )}
              >
                <svg viewBox="0 0 12 12" fill="none" className={cn("h-3 w-3 transition-colors duration-150", exitAction === "not_tracked" ? "text-destructive" : "text-muted-foreground")} aria-hidden>
                  <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            ) : null}
          </div>
        ) : isUsed && onMarkNotUsed ? (
          /* Used row: filled check → click to unmark */
          <button
            type="button"
            title="Mark as unused"
            aria-label="Mark as unused"
            disabled={actionsDisabled}
            onClick={handleMarkNotUsed}
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              exitAction === "mark-unused"
                ? "border-border bg-surface-muted"
                : actionsDisabled
                  ? "cursor-not-allowed border-border opacity-40"
                  : "border-success/40 bg-success-muted hover:border-border-strong hover:bg-surface-muted",
            )}
          >
            <svg viewBox="0 0 12 12" fill="none" className={cn("h-3 w-3 transition-colors duration-150", exitAction === "mark-unused" ? "text-muted-foreground" : "text-success")} aria-hidden>
              <path d="M2.5 6.5 5 9l4.5-5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : variant === "not_tracked" && onStartTracking ? (
          /* Not-tracked row: + circle → click to start tracking */
          <button
            type="button"
            title="Start tracking"
            aria-label="Start tracking"
            disabled={actionsDisabled}
            onClick={handleStartTracking}
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              exitAction === "start-tracking"
                ? "border-success bg-success-muted"
                : actionsDisabled
                  ? "cursor-not-allowed border-border opacity-40"
                  : "border-border-strong hover:border-success/55 hover:bg-success-muted",
            )}
          >
            <svg viewBox="0 0 12 12" fill="none" className={cn("h-3 w-3 transition-colors duration-150", exitAction === "start-tracking" ? "text-success" : "text-muted-foreground")} aria-hidden>
              <path d="M6 2.5v7M2.5 6h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}
