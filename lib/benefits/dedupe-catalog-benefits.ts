type TrackInMemento = "yes" | "later" | "no" | null;

export type CatalogBenefitForDedupe = {
  id: string;
  card_id: string;
  benefit_name: string | null;
  benefit_code?: string | null;
  track_in_memento?: TrackInMemento;
  benefit_value?: string | null;
  cadence?: string | null;
  reset_timing?: string | null;
  source_url?: string | null;
  notes?: string | null;
  display_description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeBenefitName(value: string | null | undefined) {
  return normalizeText(value);
}

function isLegacyBenefitCode(value: string | null | undefined) {
  return normalizeText(value).startsWith("amex_amex_");
}

function getTrackPriority(value: TrackInMemento | undefined) {
  switch (value) {
    case "yes":
      return 3;
    case "later":
      return 2;
    case "no":
      return 1;
    default:
      return 0;
  }
}

function getMetadataScore(benefit: CatalogBenefitForDedupe) {
  return [
    benefit.benefit_value,
    benefit.cadence,
    benefit.reset_timing,
    benefit.source_url,
    benefit.notes,
    benefit.display_description,
  ].reduce((score, value) => score + (normalizeText(value).length > 0 ? 1 : 0), 0);
}

function getTimestampScore(value: string | null | undefined) {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function shouldReplaceCandidate<T extends CatalogBenefitForDedupe>(current: T, candidate: T) {
  const candidateTrack = getTrackPriority(candidate.track_in_memento);
  const currentTrack = getTrackPriority(current.track_in_memento);
  if (candidateTrack !== currentTrack) return candidateTrack > currentTrack;

  const candidateLegacy = isLegacyBenefitCode(candidate.benefit_code);
  const currentLegacy = isLegacyBenefitCode(current.benefit_code);
  if (candidateLegacy !== currentLegacy) return currentLegacy;

  const candidateMetadata = getMetadataScore(candidate);
  const currentMetadata = getMetadataScore(current);
  if (candidateMetadata !== currentMetadata) return candidateMetadata > currentMetadata;

  const candidateUpdated = getTimestampScore(candidate.updated_at);
  const currentUpdated = getTimestampScore(current.updated_at);
  if (candidateUpdated !== currentUpdated) return candidateUpdated > currentUpdated;

  const candidateCreated = getTimestampScore(candidate.created_at);
  const currentCreated = getTimestampScore(current.created_at);
  if (candidateCreated !== currentCreated) return candidateCreated > currentCreated;

  return false;
}

export function dedupeCatalogBenefits<T extends CatalogBenefitForDedupe>(benefits: T[]): T[] {
  const winners = new Map<string, { benefit: T; firstIndex: number }>();

  benefits.forEach((benefit, index) => {
    const key = `${benefit.card_id}|${normalizeBenefitName(benefit.benefit_name)}`;
    const existing = winners.get(key);
    if (!existing) {
      winners.set(key, { benefit, firstIndex: index });
      return;
    }

    if (shouldReplaceCandidate(existing.benefit, benefit)) {
      winners.set(key, {
        benefit,
        firstIndex: existing.firstIndex,
      });
    }
  });

  return [...winners.values()]
    .sort((left, right) => left.firstIndex - right.firstIndex)
    .map((entry) => entry.benefit);
}
