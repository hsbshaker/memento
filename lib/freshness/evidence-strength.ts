import { evaluateRemovalGate } from "@/lib/freshness/removal-gate";

/**
 * Decides whether a re-observed claim carries STRONGER evidence than the
 * rejected proposal it matches. Stronger evidence creates a new linked revision
 * row (the rejected row is immutable); weaker/equal evidence only logs a
 * `reobserved` event. Rules (any one suffices):
 *  1. confidence improved by at least +0.15;
 *  2. non-negated discontinuation language newly present in the evidence;
 *  3. corroboration from a different source.
 */

export const EVIDENCE_CONFIDENCE_MARGIN = 0.15;

export interface EvidenceSample {
  confidence: number;
  evidenceExcerpt: string;
  sourceId: string;
}

export interface EvidenceStrengthResult {
  stronger: boolean;
  reasons: string[];
}

const hasDiscontinuationLanguage = (evidence: string): boolean =>
  evaluateRemovalGate({
    removalClaim: true,
    matchedExistingBenefit: true,
    evidenceVerified: true,
    evidenceExcerpt: evidence,
    confidence: 1,
  }).matched_phrases.length > 0;

export function isStrongerEvidence(
  previous: EvidenceSample,
  incoming: EvidenceSample,
): EvidenceStrengthResult {
  const reasons: string[] = [];

  if (incoming.confidence >= previous.confidence + EVIDENCE_CONFIDENCE_MARGIN) {
    reasons.push("confidence_improved");
  }

  if (
    hasDiscontinuationLanguage(incoming.evidenceExcerpt) &&
    !hasDiscontinuationLanguage(previous.evidenceExcerpt)
  ) {
    reasons.push("discontinuation_language_new");
  }

  if (incoming.sourceId !== previous.sourceId) {
    reasons.push("corroborating_source");
  }

  return { stronger: reasons.length > 0, reasons };
}
