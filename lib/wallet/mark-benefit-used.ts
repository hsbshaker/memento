import "server-only";

import { setBenefitUsedForCurrentPeriod } from "@/lib/benefits/benefit-usage-mutation";

export async function setBenefitUsed(userId: string, userBenefitId: string, isUsedThisPeriod: boolean) {
  return setBenefitUsedForCurrentPeriod(userId, userBenefitId, isUsedThisPeriod);
}
