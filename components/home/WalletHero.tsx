"use client";

import { motion } from "framer-motion";
import type { HomeFeedResult, HomeTimeframeKey } from "@/lib/types/server-data";
import { cn } from "@/lib/cn";

type WalletHeroProps = {
  metrics: HomeFeedResult["metrics"];
  timeframe: HomeTimeframeKey;
};

const heroTransition = {
  duration: 0.42,
  ease: [0.22, 1, 0.36, 1] as const,
};

const statCards: Array<{
  key: keyof WalletHeroProps["metrics"];
  label: string;
  helperText: string;
  accent?: boolean;
}> = [
  {
    key: "availableNow",
    label: "Available",
    helperText: "",
  },
  {
    key: "resettingSoon",
    label: "Coming up",
    helperText: "",
    accent: true,
  },
  {
    key: "capturedThisPeriod",
    label: "Used this month",
    helperText: "",
  },
] as const;

function getComingUpHelperText(timeframe: HomeTimeframeKey) {
  if (timeframe === "this_year") {
    return "In the next year";
  }

  if (timeframe === "next_6_months") {
    return "In the next 6 months";
  }

  if (timeframe === "next_90_days") {
    return "In the next 3 months";
  }

  if (timeframe === "next_30_days") {
    return "In the next month";
  }

  return "In the next 2 weeks";
}

export function WalletHero({ metrics, timeframe }: WalletHeroProps) {
  const comingUpHelperText = getComingUpHelperText(timeframe);

  return (
    <motion.section aria-label="Wallet overview" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={heroTransition}>
      <div className="flex flex-col gap-3">
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...heroTransition, delay: 0.05 }}
          className="text-[11px] font-medium tracking-[0.24em] text-white/38 uppercase"
        >
          Dashboard
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...heroTransition, delay: 0.11 }}
          className="overflow-hidden rounded-xl border border-white/8 bg-white/[0.02]"
        >
          <div className="grid gap-0 sm:grid-cols-3">
            {statCards.map((stat, index) => {
            const metric = metrics[stat.key];
            const helperText = stat.key === "resettingSoon" ? comingUpHelperText : stat.helperText;

            return (
              <motion.div
                key={stat.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...heroTransition, delay: 0.14 + index * 0.05 }}
                className={cn(
                  "px-4 py-4 transition-colors sm:px-5",
                  index > 0 ? "border-t border-white/8 sm:border-t-0 sm:border-l" : "",
                  stat.accent ? "bg-[#7FB6FF]/[0.025]" : "",
                )}
              >
                <p className={cn("text-[11px] font-medium tracking-[0.2em] uppercase", stat.accent ? "text-[#7FB6FF]/78" : "text-white/42")}>
                  {stat.label}
                </p>
                <p className="mt-2.5 text-[1.75rem] leading-none font-semibold tracking-tight text-white sm:text-[1.95rem]">
                  {metric.valueLabel}
                </p>
                {helperText ? <p className="mt-1.5 text-sm text-white/48">{helperText}</p> : null}
              </motion.div>
            );
            })}
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
