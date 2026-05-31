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

function buildMarker(item: HomeFeedItem) {
  const name = `${item.cardName} ${item.issuer}`.toLowerCase();
  if (name.includes("platinum")) return { accentClassName: "bg-slate-300/80" };
  if (name.includes("gold")) return { accentClassName: "bg-amber-300/80" };
  if (name.includes("reserve")) return { accentClassName: "bg-sky-300/75" };
  if (name.includes("sapphire")) return { accentClassName: "bg-blue-300/75" };
  if (name.includes("business")) return { accentClassName: "bg-white/42" };
  return { accentClassName: item.issuer === "American Express" ? "bg-white/48" : "bg-white/36" };
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
  const [exitAction, setExitAction] = useState<ExitAction | null>(null);
  const [fading, setFading] = useState(false);

  const marker = buildMarker(item);
  const isUrgent = variant === "urgent";
  const isUsed = variant === "used";
  const timingLabel = simplifyTimingLabel(item.timingLabel);
  const actionsDisabled = pendingUsage || pendingTracking || exitAction !== null;

  const nameOpacity = isUrgent ? "text-white/90" : isUsed ? "text-white/78" : "text-white/68";
  const secondaryOpacity = isUrgent ? "text-white/48" : isUsed ? "text-white/40" : "text-white/38";
  const valueOpacity = isUrgent ? "text-white/90" : isUsed ? "text-white/72" : "text-white/60";
  const metaOpacity = isUrgent ? "text-white/50" : isUsed ? "text-white/46" : "text-white/38";

  // Accent bar during exit
  const accentBarClass =
    exitAction === "used" || exitAction === "start-tracking"
      ? "bg-[#86EFAC]"
      : exitAction === "not_tracked"
        ? "bg-red-400/80"
        : exitAction === "mark-unused"
          ? "bg-white/40"
          : marker.accentClassName;

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
        "px-3.5 py-3 sm:px-4 transition-opacity duration-[280ms] ease-out",
        fading ? "opacity-0" : "opacity-100",
        isUrgent ? "text-white" : "text-white/78",
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
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BAF3D2]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                  exitAction === "used"
                    ? "border-[#86EFAC] bg-[#86EFAC]/20"
                    : actionsDisabled
                      ? "cursor-not-allowed border-white/15 opacity-40"
                      : "border-white/25 hover:border-[#BAF3D2]/60 hover:bg-[#BAF3D2]/10",
                )}
              >
                <svg viewBox="0 0 12 12" fill="none" className={cn("h-3 w-3 transition-colors duration-150", exitAction === "used" ? "text-[#86EFAC]" : "text-white/35")} aria-hidden>
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
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                  exitAction === "not_tracked"
                    ? "border-red-400/80 bg-red-400/20"
                    : actionsDisabled
                      ? "cursor-not-allowed border-white/15 opacity-40"
                      : "border-white/25 hover:border-red-400/60 hover:bg-red-400/10",
                )}
              >
                <svg viewBox="0 0 12 12" fill="none" className={cn("h-3 w-3 transition-colors duration-150", exitAction === "not_tracked" ? "text-red-400" : "text-white/35")} aria-hidden>
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
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BAF3D2]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
              exitAction === "mark-unused"
                ? "border-white/20 bg-white/10"
                : actionsDisabled
                  ? "cursor-not-allowed border-white/15 opacity-40"
                  : "border-[#BAF3D2]/40 bg-[#BAF3D2]/15 hover:border-white/30 hover:bg-white/10",
            )}
          >
            <svg viewBox="0 0 12 12" fill="none" className={cn("h-3 w-3 transition-colors duration-150", exitAction === "mark-unused" ? "text-white/30" : "text-[#BAF3D2]/70")} aria-hidden>
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
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7FB6FF]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
              exitAction === "start-tracking"
                ? "border-[#86EFAC] bg-[#86EFAC]/20"
                : actionsDisabled
                  ? "cursor-not-allowed border-white/15 opacity-40"
                  : "border-white/20 hover:border-[#7FB6FF]/50 hover:bg-[#7FB6FF]/10",
            )}
          >
            <svg viewBox="0 0 12 12" fill="none" className={cn("h-3 w-3 transition-colors duration-150", exitAction === "start-tracking" ? "text-[#86EFAC]" : "text-white/35")} aria-hidden>
              <path d="M6 2.5v7M2.5 6h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}
