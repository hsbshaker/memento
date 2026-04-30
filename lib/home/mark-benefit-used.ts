import "server-only";

import { setBenefitUsedForCurrentPeriod } from "@/lib/benefits/benefit-usage-mutation";

export async function markBenefitUsed(userId: string, userBenefitId: string) {
  return setBenefitUsedForCurrentPeriod(userId, userBenefitId, true);
}
