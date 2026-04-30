"use client";

import { useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/Button";
import type { HomeFeedItem } from "@/lib/types/server-data";

type HomeBenefitActionDialogProps = {
  item: HomeFeedItem | null;
  action: "mark-used" | "mark-not-used" | null;
  pending?: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
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

export function HomeBenefitActionDialog({
  item,
  action,
  pending = false,
  errorMessage = null,
  onCancel,
  onConfirm,
}: HomeBenefitActionDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!item || !action) {
      const lastActive = lastActiveElementRef.current;
      if (lastActive) {
        lastActive.focus();
      }
      return;
    }

    lastActiveElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const modalNode = dialogRef.current;
    if (!modalNode) return;

    const focusable = Array.from(
      modalNode.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
    ).filter((node) => !node.hasAttribute("disabled"));
    const firstFocusable = focusable[0];
    firstFocusable?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!pending) {
          onCancel();
        }
        return;
      }

      if (event.key !== "Tab" || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [action, item, onCancel, pending]);

  if (!item || !action) {
    return null;
  }

  const isMarkUsed = action === "mark-used";
  const title = isMarkUsed ? "Mark benefit used?" : "Mark benefit not used?";
  const body = isMarkUsed
    ? "This will move the benefit to Used for the current period."
    : "This will move the benefit back to Unused for the current period.";
  const confirmLabel = isMarkUsed ? "Mark Used" : "Mark Not Used";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        disabled={pending}
        onClick={() => {
          if (!pending) onCancel();
        }}
        className="absolute inset-0 bg-[#050811]/72 transition-opacity duration-200"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative z-10 w-full max-w-md rounded-[1.5rem] border border-white/10 bg-[#0D131B] p-5 shadow-[0_28px_70px_-36px_rgba(0,0,0,0.92)] sm:p-6"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 id={titleId} className="text-lg font-semibold tracking-tight text-white">
              {title}
            </h2>
            <p id={descriptionId} className="text-sm leading-6 text-white/58">
              {body}
            </p>
          </div>

          <div className="rounded-[1.1rem] border border-white/[0.06] bg-white/[0.03] px-4 py-3.5">
            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-medium text-white/36">Benefit</p>
                <p className="mt-1 text-sm font-medium text-white">{item.benefitName}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-white/36">Card</p>
                <p className="mt-1 text-sm text-white/72">{item.cardName}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-medium text-white/36">Current value</p>
                  <p className="mt-1 text-sm text-white/72">{item.currentPeriodValueLabel ?? "Tracked"}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-white/36">Reset timing</p>
                  <p className="mt-1 text-sm text-white/72">{simplifyTimingLabel(item.timingLabel)}</p>
                </div>
              </div>
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-[1rem] border border-amber-300/18 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={onCancel}
              disabled={pending}
              className="rounded-lg border-white/[0.1] bg-white/[0.02] px-3.5 py-2 text-sm text-white/82 hover:border-white/[0.16] hover:bg-white/[0.045]"
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onConfirm}
              disabled={pending}
              className="rounded-lg border-white/[0.12] bg-white/[0.05] px-3.5 py-2 text-sm text-white hover:border-white/[0.18] hover:bg-white/[0.08]"
            >
              {pending ? "Saving..." : confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
