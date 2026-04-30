import type { ReactNode } from "react";
import type { HomeFeedItem } from "@/lib/types/server-data";
import { HomeAllCaughtUpState } from "@/components/home/HomeAllCaughtUpState";
import { HomeBenefitRow } from "@/components/home/HomeBenefitRow";
import { cn } from "@/lib/cn";

type HomeBenefitRowsProps = {
  title: string;
  helperText?: string;
  items: HomeFeedItem[];
  variant?: "urgent" | "upcoming" | "used";
  pendingById?: Record<string, "mark-used" | "mark-not-used" | null | undefined>;
  onAction?: (item: HomeFeedItem) => void;
  actionLabel?: string | null;
  footnote?: string | null;
  headerAccessory?: ReactNode;
  toolbar?: ReactNode;
  emptyState?: {
    title: string;
    description: string;
  } | null;
};

export function HomeBenefitRows({
  title,
  helperText,
  items,
  variant = "urgent",
  pendingById,
  onAction,
  actionLabel = variant === "used" ? "Mark Not Used" : variant === "urgent" ? "Mark Used" : null,
  footnote = null,
  headerAccessory = null,
  toolbar = null,
  emptyState = null,
}: HomeBenefitRowsProps) {
  if (items.length === 0 && !emptyState) {
    return null;
  }

  const isUrgent = variant === "urgent";
  const isUsed = variant === "used";

  return (
    <section>
      <div
        className={cn(
          "rounded-[1.6rem] border px-4 py-4 shadow-[0_18px_40px_-34px_rgba(0,0,0,0.92)] sm:px-5 sm:py-5",
          isUrgent ? "border-white/9 bg-white/[0.045]" : isUsed ? "border-white/8 bg-white/[0.038]" : "border-white/7 bg-white/[0.035]",
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">{title}</h2>
            {helperText ? <p className="text-sm leading-6 text-white/58">{helperText}</p> : null}
          </div>
          {headerAccessory}
        </div>

        {toolbar ? <div className="mt-4">{toolbar}</div> : null}

        {items.length > 0 ? (
          <div className="mt-4 overflow-hidden rounded-[1.05rem] border border-white/[0.05] bg-white/[0.015]">
            <div
              className={cn(
                items.length > 6
                  ? "max-h-[31rem] overflow-y-auto [scrollbar-color:rgba(255,255,255,0.18)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/14 [&::-webkit-scrollbar-track]:bg-transparent"
                  : "",
              )}
            >
              {items.map((item, index) => (
                <div key={item.userBenefitId} className={cn(index > 0 ? "border-t border-white/[0.045]" : undefined)}>
                  <HomeBenefitRow
                    item={item}
                    variant={variant}
                    pending={
                      pendingById
                        ? pendingById[item.userBenefitId] === (variant === "used" ? "mark-not-used" : "mark-used")
                        : false
                    }
                    onAction={onAction}
                    actionLabel={actionLabel}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : emptyState ? (
          <div className="mt-4">
            <HomeAllCaughtUpState title={emptyState.title} description={emptyState.description} compact />
          </div>
        ) : null}

        {footnote ? <p className="mt-3 text-sm text-white/42">{footnote}</p> : null}
      </div>
    </section>
  );
}
