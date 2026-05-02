import "server-only";

import type { UserBenefitTrackingStatus } from "@/lib/constants/memento-schema";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

async function assertOwnedBenefit(userId: string, userBenefitId: string) {
  const supabase = getServiceRoleSupabaseClient();

  const { data, error } = await supabase
    .from("user_benefits")
    .select("id, user_cards!inner(user_id)")
    .eq("id", userBenefitId)
    .eq("user_cards.user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function setBenefitTrackingStatus(
  userId: string,
  userBenefitId: string,
  trackingStatus: UserBenefitTrackingStatus,
) {
  const ownedBenefit = await assertOwnedBenefit(userId, userBenefitId);

  if (!ownedBenefit) {
    return null;
  }

  const supabase = getServiceRoleSupabaseClient();
  const { error } = await supabase
    .from("user_benefits")
    .update({
      tracking_status: trackingStatus,
    })
    .eq("id", userBenefitId);

  if (error) {
    throw error;
  }

  return { userBenefitId, trackingStatus };
}
