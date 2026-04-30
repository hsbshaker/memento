import "server-only";

import { buildBenefitUsageMutationPlan } from "@/lib/benefits/benefit-usage-plan";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

export type BenefitUsageMutationResult = {
  success: true;
  userBenefitId: string;
  benefitId: string;
  periodKey: string;
  periodStart: string;
  periodEnd: string;
  markedUsedAt: string | null;
  isUsedThisPeriod: boolean;
  message: string;
};

type OwnedBenefitUsageRow = {
  id: string;
  benefit_id: string;
  user_cards: {
    user_id: string;
    card_anniversary_date: string | null;
  } | {
    user_id: string;
    card_anniversary_date: string | null;
  }[] | null;
  benefits: {
    cadence: string | null;
    reset_timing: string | null;
  } | {
    cadence: string | null;
    reset_timing: string | null;
  }[] | null;
};

function takeFirst<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export class BenefitUsageMutationError extends Error {
  status: number;
  code: "unsupported_cadence" | "missing_period_context";

  constructor({
    status,
    code,
    message,
  }: {
    status: number;
    code: "unsupported_cadence" | "missing_period_context";
    message: string;
  }) {
    super(message);
    this.name = "BenefitUsageMutationError";
    this.status = status;
    this.code = code;
  }
}

async function getOwnedBenefitUsageContext(userId: string, userBenefitId: string) {
  const supabase = getServiceRoleSupabaseClient();

  const { data, error } = await supabase
    .from("user_benefits")
    .select(
      "id, benefit_id, user_cards!inner(user_id, card_anniversary_date), benefits!inner(cadence, reset_timing)",
    )
    .eq("id", userBenefitId)
    .eq("user_cards.user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as OwnedBenefitUsageRow | null) ?? null;
}

export async function setBenefitUsedForCurrentPeriod(
  userId: string,
  userBenefitId: string,
  nextUsed: boolean,
): Promise<BenefitUsageMutationResult | null> {
  const ownedBenefit = await getOwnedBenefitUsageContext(userId, userBenefitId);

  if (!ownedBenefit) {
    return null;
  }

  const userCard = takeFirst(ownedBenefit.user_cards);
  const benefit = takeFirst(ownedBenefit.benefits);

  const at = new Date();
  const plan = buildBenefitUsageMutationPlan({
    benefitId: ownedBenefit.benefit_id,
    cadence: benefit?.cadence ?? null,
    resetTiming: benefit?.reset_timing ?? null,
    cardAnniversaryDate: userCard?.card_anniversary_date ?? null,
    nextUsed,
    at,
  });

  if (!plan.ok) {
    throw new BenefitUsageMutationError({
      status: 422,
      code: plan.code,
      message: plan.message,
    });
  }

  const supabase = getServiceRoleSupabaseClient();

  const { error: periodStatusError } = await supabase
    .from("user_benefit_period_status")
    .upsert(
      {
        user_id: userId,
        benefit_id: ownedBenefit.benefit_id,
        period_key: plan.periodKey,
        is_used: nextUsed,
        used_at: plan.markedUsedAt,
      },
      { onConflict: "user_id,benefit_id,period_key" },
    );

  if (periodStatusError) {
    throw periodStatusError;
  }

  const compatibilityUpdate: {
    is_used_this_period: boolean;
    last_used_at: string | null;
    snoozed_until?: null;
  } = {
    is_used_this_period: nextUsed,
    last_used_at: plan.markedUsedAt,
  };

  if (nextUsed) {
    compatibilityUpdate.snoozed_until = null;
  }

  const { error: compatibilityError } = await supabase
    .from("user_benefits")
    .update(compatibilityUpdate)
    .eq("id", userBenefitId);

  if (compatibilityError) {
    throw compatibilityError;
  }

  return {
    success: true,
    userBenefitId,
    benefitId: ownedBenefit.benefit_id,
    periodKey: plan.periodKey,
    periodStart: plan.periodStart,
    periodEnd: plan.periodEnd,
    markedUsedAt: plan.markedUsedAt,
    isUsedThisPeriod: nextUsed,
    message: nextUsed ? "Benefit marked used for this period." : "Benefit marked unused for this period.",
  };
}
