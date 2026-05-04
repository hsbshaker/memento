"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Clock, Wallet } from "lucide-react";
import type { ComponentType } from "react";
import type { HomeFeedResult, HomeTimeframeKey } from "@/lib/types/server-data";
import { cn } from "@/lib/cn";

type WalletHeroProps = {
  metrics: HomeFeedResult["metrics"];
  timeframe: HomeTimeframeKey;
};

type StatCard = {
  key: keyof WalletHeroProps["metrics"];
  label: string;
  helperText: string | null;
  icon: ComponentType<{ className?: string }>;
  accent: boolean;
};

const heroTransition = {
  duration: 0.42,
  ease: [0.22, 1, 0.36, 1] as const,
};

function getComingUpHelperText(timeframe: HomeTimeframeKey): string {
  if (timeframe === "this_year") return "In the next year";
  if (timeframe === "next_6_months") return "In the next 6 months";
  if (timeframe === "next_90_days") return "In the next 3 months";
  if (timeframe === "next_30_days") return "In the next month";
  return "In the next 2 weeks";
}

export function WalletHero({ metrics, timeframe }: WalletHeroProps) {
  const cards: StatCard[] = [
    {
      key: "availableNow",
      label: "Available",
      helperText: "Ready to use",
      icon: Wallet,
      accent: false,
    },
    {
      key: "resettingSoon",
      label: "Coming up",
      helperText: getComingUpHelperText(timeframe),
      icon: Clock,
      accent: true,
    },
    {
      key: "capturedThisPeriod",
      label: "Used this month",
      helperText: "Captured so far",
      icon: CheckCircle2,
      accent: false,
    },
  ];

  return (
    <motion.section
      aria-label="Wallet overview"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={heroTransition}
    >
      <div className="flex flex-col gap-3">
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...heroTransition, delay: 0.05 }}
          className="text-[11px] font-medium tracking-[0.24em] text-white/38 uppercase"
        >
          Dashboard
        </motion.p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {cards.map((card, index) => {
            const metric = metrics[card.key];
            const Icon = card.icon;

            return (
              <motion.div
                key={card.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...heroTransition, delay: 0.11 + index * 0.05 }}
                className={cn(
                  "rounded-xl border px-5 py-5",
                  card.accent
                    ? "border-[#7FB6FF]/12 bg-[#7FB6FF]/[0.04]"
                    : "border-white/10 bg-white/[0.03]",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <p
                    className={cn(
                      "text-xs font-medium tracking-[0.18em] uppercase",
                      card.accent ? "text-[#7FB6FF]/70" : "text-white/42",
                    )}
                  >
                    {card.label}
                  </p>
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      card.accent ? "bg-[#7FB6FF]/10" : "bg-white/8",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        card.accent ? "text-[#7FB6FF]/65" : "text-white/42",
                      )}
                    />
                  </div>
                </div>

                <p className="mt-4 text-[1.85rem] leading-none font-semibold tracking-tight text-white">
                  {metric.valueLabel}
                </p>

                {card.helperText ? (
                  <p className="mt-2 text-sm text-white/42">{card.helperText}</p>
                ) : null}
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
