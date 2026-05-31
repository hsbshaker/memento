import type { ReactNode } from "react";
import type { HomeFeedItem } from "@/lib/types/server-data";
import { HomeAllCaughtUpState } from "@/components/home/HomeAllCaughtUpState";
import { HomeBenefitRow } from "@/components/home/HomeBenefitRow";
import { cn } from "@/lib/cn";

type HomeBenefitRowVariant = "urgent" | "upcoming" | "used" | "not_tracked";

type HomeBenefitRowsProps = {
  title: string;
  helperText?: string;
  items: HomeFeedItem[];
  variant?: HomeBenefitRowVariant;
  pendingById?: Record<string, "mark-used" | "mark-not-used" | null | undefined>;
  pendingTrackingById?: Record<string, boolean>;
  onMarkUsed?: (item: HomeFeedItem) => void;
  onMarkNotUsed?: (item: HomeFeedItem) => void;
  onDoNotTrack?: (item: HomeFeedItem) => void;
  onStartTracking?: (item: HomeFeedItem) => void;
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
  pendingTrackingById,
  onMarkUsed,
  onMarkNotUsed,
  onDoNotTrack,
  onStartTracking,
  footnote = null,
  headerAccessory = null,
  toolbar = null,
  emptyState = null,
}: HomeBenefitRowsProps) {
  if (items.length === 0 && !emptyState) {
    return null;
  }

  return (
    <section>
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">{title}</h2>
            {helperText ? <p className="text-sm leading-6 text-muted-foreground">{helperText}</p> : null}
          </div>
          {headerAccessory}
        </div>

        {toolbar ? <div className="mt-4">{toolbar}</div> : null}
        <div className="mt-4 border-b border-border" />

        {items.length > 0 ? (
          <div className="mt-0 overflow-hidden rounded-xl border border-border bg-surface">
            <div
              className={cn(
                items.length > 6
                  ? "max-h-[31rem] overflow-y-auto [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border-strong [&::-webkit-scrollbar-track]:bg-transparent"
                  : "",
              )}
            >
              {items.map((item, index) => {
                const pendingUsage =
                  pendingById
                    ? pendingById[item.userBenefitId] === (variant === "used" ? "mark-not-used" : "mark-used")
                    : false;
                const pendingTracking = pendingTrackingById?.[item.userBenefitId] === true;

                return (
                  <div key={item.userBenefitId} className={cn(index > 0 ? "border-t border-border-muted" : undefined)}>
                    <HomeBenefitRow
                      item={item}
                      variant={variant}
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
          </div>
        ) : emptyState ? (
          <div className="mt-0 border-b border-border py-6">
            <HomeAllCaughtUpState title={emptyState.title} description={emptyState.description} compact />
          </div>
        ) : null}

        {footnote ? <p className="mt-3 text-sm text-subtle-foreground">{footnote}</p> : null}
      </div>
    </section>
  );
}
