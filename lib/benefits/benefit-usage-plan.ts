import { computeBenefitPeriod, resolveSupportedBenefitCadence } from "@/lib/benefits/compute-benefit-period";

export type BenefitUsageMutationPlanSuccess = {
  ok: true;
  benefitId: string;
  periodKey: string;
  periodStart: string;
  periodEnd: string;
  markedUsedAt: string | null;
  isUsedThisPeriod: boolean;
};

export type BenefitUsageMutationPlanFailure = {
  ok: false;
  code: "unsupported_cadence" | "missing_period_context";
  message: string;
};

export type BenefitUsageMutationPlan =
  | BenefitUsageMutationPlanSuccess
  | BenefitUsageMutationPlanFailure;

export function buildBenefitUsageMutationPlan({
  benefitId,
  cadence,
  resetTiming,
  cardAnniversaryDate,
  nextUsed,
  at = new Date(),
}: {
  benefitId: string;
  cadence: string | null;
  resetTiming: string | null;
  cardAnniversaryDate: string | null;
  nextUsed: boolean;
  at?: Date;
}): BenefitUsageMutationPlan {
  const resolvedCadence = resolveSupportedBenefitCadence({
    cadence,
    resetTiming,
  });

  if (!resolvedCadence) {
    return {
      ok: false,
      code: "unsupported_cadence",
      message: "This benefit can’t be marked used yet.",
    };
  }

  const period = computeBenefitPeriod({
    cadence: resolvedCadence,
    resetTiming,
    cardAnniversaryDate,
    now: at,
  });

  if (!period) {
    return {
      ok: false,
      code: "missing_period_context",
      message: "Add your card anniversary date to track this benefit.",
    };
  }

  return {
    ok: true,
    benefitId,
    periodKey: period.periodKey,
    periodStart: period.periodStartDate,
    periodEnd: period.periodEndDate,
    markedUsedAt: nextUsed ? at.toISOString() : null,
    isUsedThisPeriod: nextUsed,
  };
}
