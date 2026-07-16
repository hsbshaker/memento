import type { CostRates } from "@/lib/freshness/constants";

/**
 * Estimated run cost from token counters and env-configured per-MTok rates.
 * Returns null when rates are not configured — no pricing is ever hardcoded.
 * Cache reads are billed at ~0.1× the input rate.
 */

const CACHE_READ_INPUT_MULTIPLIER = 0.1;

export interface TokenUsageTotals {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
}

export function estimateCostUsd(
  usage: TokenUsageTotals,
  rates: CostRates,
): number | null {
  if (rates.inputPerMTok === null || rates.outputPerMTok === null) return null;

  const input = (usage.inputTokens / 1_000_000) * rates.inputPerMTok;
  const output = (usage.outputTokens / 1_000_000) * rates.outputPerMTok;
  const cacheRead =
    (usage.cacheReadTokens / 1_000_000) * rates.inputPerMTok * CACHE_READ_INPUT_MULTIPLIER;

  return Number((input + output + cacheRead).toFixed(6));
}
