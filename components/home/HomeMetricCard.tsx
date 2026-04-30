import type { HomeMetric } from "@/lib/types/server-data";
import { cn } from "@/lib/cn";

type HomeMetricCardProps = {
  label: string;
  metric: HomeMetric;
  className?: string;
};

export function HomeMetricCard({ label, metric, className }: HomeMetricCardProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-3 py-1 text-center sm:px-5", className)}>
      <p className="text-[1.95rem] leading-none font-semibold tracking-tight text-white sm:text-[2.15rem]">
        {metric.valueLabel}
      </p>
      <p className="mt-2 text-[12px] font-medium text-white/48">{label}</p>
    </div>
  );
}
