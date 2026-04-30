import type { HomeFeedResult } from "@/lib/types/server-data";
import { HomeMetricCard } from "@/components/home/HomeMetricCard";
import { cn } from "@/lib/cn";

type HomeMetricStripProps = {
  metrics: HomeFeedResult["metrics"];
};

export function HomeMetricStrip({ metrics }: HomeMetricStripProps) {
  return (
    <section aria-label="Home metrics" className="px-1 pb-0.5">
      <div className="grid gap-4 sm:grid-cols-3 sm:gap-0">
        {[
          { label: "available", metric: metrics.availableNow },
          { label: "expiring", metric: metrics.resettingSoon },
          { label: "captured", metric: metrics.capturedThisPeriod },
        ].map((entry, index) => (
          <HomeMetricCard
            key={entry.label}
            label={entry.label}
            metric={entry.metric}
            className={cn(
              "min-h-[88px]",
              index > 0 ? "border-t border-white/[0.045] pt-4 sm:border-t-0 sm:border-l sm:pt-1" : "",
            )}
          />
        ))}
      </div>
    </section>
  );
}
