import type { HomeTimeframeKey, HomeTimeframeOption } from "@/lib/types/server-data";

export const DEFAULT_HOME_TIMEFRAME: HomeTimeframeKey = "next_14_days";

export const HOME_TIMEFRAME_OPTIONS: HomeTimeframeOption[] = [
  { key: "next_14_days", label: "Next 14 days", shortLabel: "next 14 days", compactLabel: "2W" },
  { key: "next_30_days", label: "Next 30 days", shortLabel: "next 30 days", compactLabel: "1M" },
  { key: "next_90_days", label: "Next 90 days", shortLabel: "next 90 days", compactLabel: "3M" },
  { key: "next_6_months", label: "Next 6 months", shortLabel: "next 6 months", compactLabel: "6M" },
  { key: "this_year", label: "This year", shortLabel: "this year", compactLabel: "1Y" },
];

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function getHomeTimeframeOption(key: HomeTimeframeKey) {
  return HOME_TIMEFRAME_OPTIONS.find((option) => option.key === key) ?? HOME_TIMEFRAME_OPTIONS[0];
}

export function parseHomeTimeframe(value: string | null | undefined): HomeTimeframeKey {
  if (!value) return DEFAULT_HOME_TIMEFRAME;

  return HOME_TIMEFRAME_OPTIONS.some((option) => option.key === value)
    ? (value as HomeTimeframeKey)
    : DEFAULT_HOME_TIMEFRAME;
}

export function getHomeTimeframeEndDate(now: Date, timeframe: HomeTimeframeKey) {
  if (timeframe === "this_year") {
    return new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  }

  if (timeframe === "next_6_months") {
    return endOfDay(addMonths(now, 6));
  }

  if (timeframe === "next_90_days") {
    return endOfDay(addDays(now, 90));
  }

  if (timeframe === "next_30_days") {
    return endOfDay(addDays(now, 30));
  }

  return endOfDay(addDays(now, 14));
}
