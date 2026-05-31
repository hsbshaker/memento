/**
 * Pure (no I/O, no server-only imports) functions for building monthly digests.
 * Safe to import in both server and test environments.
 */

import { DIGEST_SECTION_ORDER, toUtcMonthKey, toUtcMonthStart, type BenefitCadence, type DigestSection } from "@/lib/benefits/periods";

export type { DigestSection };

export type DigestEligibleBenefit = {
  userId: string;
  benefitId: string;
  benefitDisplayName: string;
  cadence: BenefitCadence | string;
  section: DigestSection;
  periodKey: string;
  valueCents: number | null;
  notes: string | null;
  cardId: string | null;
  cardDisplayName: string;
};

export type MonthlyDigest = {
  monthKey: string;
  userId: string;
  benefits: DigestEligibleBenefit[];
  sections: Record<DigestSection, DigestEligibleBenefit[]>;
};

export function buildMonthlyDigest(
  benefits: DigestEligibleBenefit[],
  monthStart: Date = new Date(),
): Map<string, MonthlyDigest> {
  const monthKey = toUtcMonthKey(toUtcMonthStart(monthStart));
  const digestsByUser = new Map<string, MonthlyDigest>();

  for (const benefit of benefits) {
    const existingDigest = digestsByUser.get(benefit.userId);
    if (existingDigest) {
      existingDigest.benefits.push(benefit);
      existingDigest.sections[benefit.section].push(benefit);
      continue;
    }

    digestsByUser.set(benefit.userId, {
      monthKey,
      userId: benefit.userId,
      benefits: [benefit],
      sections: {
        monthly: benefit.section === "monthly" ? [benefit] : [],
        quarterly: benefit.section === "quarterly" ? [benefit] : [],
        semiannual: benefit.section === "semiannual" ? [benefit] : [],
        annual: benefit.section === "annual" ? [benefit] : [],
      },
    });
  }

  return digestsByUser;
}

export { DIGEST_SECTION_ORDER };
