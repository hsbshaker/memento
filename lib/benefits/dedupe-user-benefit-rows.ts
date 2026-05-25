import { normalizeBenefitName } from "@/lib/benefits/dedupe-catalog-benefits";

type UserBenefitTrackingStatus = "tracked" | "not_tracked" | string | null | undefined;

type DedupeUserBenefitRowsOptions<T> = {
  getUserCardId?: (row: T) => string | null | undefined;
  getCardId?: (row: T) => string | null | undefined;
  getBenefitName: (row: T) => string | null | undefined;
  getBenefitCode?: (row: T) => string | null | undefined;
  getIsActive?: (row: T) => boolean;
  getTrackingStatus?: (row: T) => UserBenefitTrackingStatus;
  getHasCurrentPeriodData?: (row: T) => boolean;
  getMetadataScore?: (row: T) => number;
};

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function isLegacyBenefitCode(value: string | null | undefined) {
  return normalizeText(value).startsWith("amex_amex_");
}

function shouldReplaceCandidate<T>(
  current: T,
  candidate: T,
  options: DedupeUserBenefitRowsOptions<T>,
) {
  const currentIsLegacy = isLegacyBenefitCode(options.getBenefitCode?.(current));
  const candidateIsLegacy = isLegacyBenefitCode(options.getBenefitCode?.(candidate));
  if (currentIsLegacy !== candidateIsLegacy) {
    return !candidateIsLegacy;
  }

  const currentIsActive = options.getIsActive?.(current) === true;
  const candidateIsActive = options.getIsActive?.(candidate) === true;
  if (currentIsActive !== candidateIsActive) {
    return candidateIsActive;
  }

  const currentTrackingStatus = normalizeText(options.getTrackingStatus?.(current));
  const candidateTrackingStatus = normalizeText(options.getTrackingStatus?.(candidate));
  const currentIsTracked = currentTrackingStatus === "tracked";
  const candidateIsTracked = candidateTrackingStatus === "tracked";
  if (currentIsTracked !== candidateIsTracked) {
    return candidateIsTracked;
  }

  const currentHasCurrentPeriodData = options.getHasCurrentPeriodData?.(current) === true;
  const candidateHasCurrentPeriodData = options.getHasCurrentPeriodData?.(candidate) === true;
  if (currentHasCurrentPeriodData !== candidateHasCurrentPeriodData) {
    return candidateHasCurrentPeriodData;
  }

  const currentMetadataScore = options.getMetadataScore?.(current) ?? 0;
  const candidateMetadataScore = options.getMetadataScore?.(candidate) ?? 0;
  if (currentMetadataScore !== candidateMetadataScore) {
    return candidateMetadataScore > currentMetadataScore;
  }

  return false;
}

export function dedupeUserBenefitRows<T>(
  rows: T[],
  options: DedupeUserBenefitRowsOptions<T>,
): T[] {
  const winners = new Map<string, { row: T; firstIndex: number }>();

  rows.forEach((row, index) => {
    const userCardId = normalizeText(options.getUserCardId?.(row));
    const cardId = normalizeText(options.getCardId?.(row));
    const scopeKey = userCardId || cardId;
    const benefitName = normalizeBenefitName(options.getBenefitName(row));

    if (!scopeKey || !benefitName) {
      winners.set(`__row__${index}`, { row, firstIndex: index });
      return;
    }

    const key = `${scopeKey}|${benefitName}`;
    const existing = winners.get(key);
    if (!existing) {
      winners.set(key, { row, firstIndex: index });
      return;
    }

    if (shouldReplaceCandidate(existing.row, row, options)) {
      winners.set(key, {
        row,
        firstIndex: existing.firstIndex,
      });
    }
  });

  return [...winners.values()]
    .sort((left, right) => left.firstIndex - right.firstIndex)
    .map((entry) => entry.row);
}
