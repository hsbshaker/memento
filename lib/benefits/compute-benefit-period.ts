import type { BenefitPeriodResult, SupportedBenefitCadence } from "@/lib/types/server-data";

type ComputeBenefitPeriodArgs = {
  cadence: string | null | undefined;
  resetTiming?: string | null;
  now?: Date;
  cardAnniversaryDate?: string | null;
};

const ANNIVERSARY_RESET_PATTERN = /\b(card anniversary|account anniversary|anniversary|cardmember year|membership year|benefit year)\b/i;

function createUtcDate(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day));
}

function endOfUtcDay(value: Date) {
  return new Date(
    Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}

function lastDayOfMonthUtc(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0));
}

function startOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function normalizeSupportedBenefitCadence(
  cadence: string | null | undefined,
): SupportedBenefitCadence | null {
  switch ((cadence ?? "").trim()) {
    case "monthly":
      return "monthly";
    case "quarterly":
      return "quarterly";
    case "semiannual":
    case "semi_annual":
      return "semiannual";
    case "annual":
      return "annual";
    case "anniversary":
      return "anniversary";
    default:
      return null;
  }
}

function buildDaysRemaining(end: Date, now: Date) {
  return Math.max(
    0,
    Math.floor((startOfUtcDay(end).getTime() - startOfUtcDay(now).getTime()) / 86_400_000),
  );
}

function buildAnniversaryPeriodKey(periodStart: Date) {
  const month = String(periodStart.getUTCMonth() + 1).padStart(2, "0");
  const day = String(periodStart.getUTCDate()).padStart(2, "0");
  return `${periodStart.getUTCFullYear()}-ANNIV-${month}-${day}`;
}

export function isBenefitResetOnAnniversary(resetTiming: string | null | undefined) {
  return ANNIVERSARY_RESET_PATTERN.test((resetTiming ?? "").trim());
}

export function resolveSupportedBenefitCadence({
  cadence,
  resetTiming,
}: {
  cadence: string | null | undefined;
  resetTiming?: string | null;
}): SupportedBenefitCadence | null {
  const normalizedCadence = normalizeSupportedBenefitCadence(cadence);

  if (normalizedCadence === "anniversary") {
    return "anniversary";
  }

  // The current schema does not cleanly model "calendar year" vs "anniversary year".
  // Only explicit anniversary reset language should move an annual benefit onto
  // anniversary-based date math.
  if (normalizedCadence === "annual" && isBenefitResetOnAnniversary(resetTiming)) {
    return "anniversary";
  }

  return normalizedCadence;
}

function computeMonthlyPeriod(now: Date): BenefitPeriodResult {
  const start = createUtcDate(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const end = endOfUtcDay(lastDayOfMonthUtc(now.getUTCFullYear(), now.getUTCMonth()));

  return {
    periodStartDate: start.toISOString(),
    periodEndDate: end.toISOString(),
    daysRemaining: buildDaysRemaining(end, now),
    periodLabel: "This month",
    periodKey: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`,
    resolvedCadence: "monthly",
    isAnniversaryPeriod: false,
  };
}

function computeQuarterlyPeriod(now: Date): BenefitPeriodResult {
  const quarterStartMonth = Math.floor(now.getUTCMonth() / 3) * 3;
  const start = createUtcDate(now.getUTCFullYear(), quarterStartMonth, 1);
  const end = endOfUtcDay(lastDayOfMonthUtc(now.getUTCFullYear(), quarterStartMonth + 2));

  return {
    periodStartDate: start.toISOString(),
    periodEndDate: end.toISOString(),
    daysRemaining: buildDaysRemaining(end, now),
    periodLabel: "This quarter",
    periodKey: `${start.getUTCFullYear()}-Q${Math.floor(start.getUTCMonth() / 3) + 1}`,
    resolvedCadence: "quarterly",
    isAnniversaryPeriod: false,
  };
}

function computeSemiannualPeriod(now: Date): BenefitPeriodResult {
  const inFirstHalf = now.getUTCMonth() < 6;
  const start = createUtcDate(now.getUTCFullYear(), inFirstHalf ? 0 : 6, 1);
  const end = endOfUtcDay(lastDayOfMonthUtc(now.getUTCFullYear(), inFirstHalf ? 5 : 11));

  return {
    periodStartDate: start.toISOString(),
    periodEndDate: end.toISOString(),
    daysRemaining: buildDaysRemaining(end, now),
    periodLabel: "This half-year",
    periodKey: `${start.getUTCFullYear()}-H${inFirstHalf ? 1 : 2}`,
    resolvedCadence: "semiannual",
    isAnniversaryPeriod: false,
  };
}

function computeAnnualPeriod(now: Date): BenefitPeriodResult {
  const start = createUtcDate(now.getUTCFullYear(), 0, 1);
  const end = endOfUtcDay(createUtcDate(now.getUTCFullYear(), 11, 31));

  return {
    periodStartDate: start.toISOString(),
    periodEndDate: end.toISOString(),
    daysRemaining: buildDaysRemaining(end, now),
    periodLabel: "This year",
    periodKey: String(start.getUTCFullYear()),
    resolvedCadence: "annual",
    isAnniversaryPeriod: false,
  };
}

function computeAnniversaryPeriod(now: Date, cardAnniversaryDate: string | null | undefined): BenefitPeriodResult | null {
  if (!cardAnniversaryDate) {
    return null;
  }

  const anchor = new Date(`${cardAnniversaryDate}T00:00:00.000Z`);
  if (Number.isNaN(anchor.getTime())) {
    return null;
  }

  const anniversaryMonth = anchor.getUTCMonth();
  const anniversaryDay = anchor.getUTCDate();
  const currentYear = now.getUTCFullYear();
  const thisYearAnchorDay = Math.min(
    anniversaryDay,
    lastDayOfMonthUtc(currentYear, anniversaryMonth).getUTCDate(),
  );
  const thisYearAnchor = createUtcDate(currentYear, anniversaryMonth, thisYearAnchorDay);
  const periodStart =
    now >= thisYearAnchor
      ? thisYearAnchor
      : createUtcDate(
          currentYear - 1,
          anniversaryMonth,
          Math.min(anniversaryDay, lastDayOfMonthUtc(currentYear - 1, anniversaryMonth).getUTCDate()),
        );
  const nextPeriodStart = createUtcDate(
    periodStart.getUTCFullYear() + 1,
    anniversaryMonth,
    Math.min(
      anniversaryDay,
      lastDayOfMonthUtc(periodStart.getUTCFullYear() + 1, anniversaryMonth).getUTCDate(),
    ),
  );
  const periodEnd = endOfUtcDay(new Date(nextPeriodStart.getTime() - 86_400_000));

  return {
    periodStartDate: periodStart.toISOString(),
    periodEndDate: periodEnd.toISOString(),
    daysRemaining: buildDaysRemaining(periodEnd, now),
    periodLabel: "Anniversary year",
    periodKey: buildAnniversaryPeriodKey(periodStart),
    resolvedCadence: "anniversary",
    isAnniversaryPeriod: true,
  };
}

export function computeBenefitPeriod({
  cadence,
  resetTiming,
  now = new Date(),
  cardAnniversaryDate,
}: ComputeBenefitPeriodArgs): BenefitPeriodResult | null {
  switch (resolveSupportedBenefitCadence({ cadence, resetTiming })) {
    case "monthly":
      return computeMonthlyPeriod(now);
    case "quarterly":
      return computeQuarterlyPeriod(now);
    case "semiannual":
      return computeSemiannualPeriod(now);
    case "annual":
      return computeAnnualPeriod(now);
    case "anniversary":
      return computeAnniversaryPeriod(now, cardAnniversaryDate);
    default:
      return null;
  }
}
