import type { RemovalGateRecord } from "@/lib/types/freshness-schema";

/**
 * Versioned deterministic removal gate. A REMOVE/EXPIRE proposal is publishable
 * only when this gate passed; the publish RPC independently re-verifies both
 * the persisted `passed` flag and that the gate `version` is one it accepts.
 * Bump REMOVAL_GATE_VERSION whenever phrase/negation logic changes materially
 * (and add the new version to the RPC's accepted list in a migration).
 */
export const REMOVAL_GATE_VERSION = 1;

export const REMOVAL_GATE_MIN_CONFIDENCE = 0.7;

const DISCONTINUATION_PATTERNS: RegExp[] = [
  /no longer (?:available|offered|eligible|included)/gi,
  /discontinued/gi,
  /has (?:been )?ended/gi,
  /has been removed/gi,
  /will (?:be )?end(?:ed|ing)?\b/gi,
  /will be (?:discontinued|removed|retired)/gi,
  /is being (?:discontinued|removed|retired)/gi,
  /expire[sd]? on/gi,
  /ends? on \w+/gi,
  /benefit (?:ends|is ending)/gi,
];

/** Tokens that negate a discontinuation phrase when they appear just before it. */
const NEGATION_WINDOW_CHARS = 30;
const NEGATION_PATTERN =
  /\b(not|never|isn['’]t|aren['’]t|hasn['’]t|haven['’]t|won['’]t|wasn['’]t|doesn['’]t|don['’]t|will not|has not|is not|are not)\b/i;

export interface RemovalGateInput {
  /** The model asserted the document claims removal/discontinuation. */
  removalClaim: boolean;
  /** The candidate was matched to an existing benefit. */
  matchedExistingBenefit: boolean;
  /** The evidence excerpt passed the verbatim-in-snapshot check. */
  evidenceVerified: boolean;
  evidenceExcerpt: string;
  confidence: number;
}

export function evaluateRemovalGate(input: RemovalGateInput): RemovalGateRecord {
  const reasons: string[] = [];
  const matched: string[] = [];
  const negated: string[] = [];

  const evidence = input.evidenceExcerpt;

  for (const pattern of DISCONTINUATION_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(evidence)) !== null) {
      const window = evidence.slice(
        Math.max(0, match.index - NEGATION_WINDOW_CHARS),
        match.index,
      );
      if (NEGATION_PATTERN.test(window)) {
        negated.push(match[0]);
      } else {
        matched.push(match[0]);
      }
      // Avoid infinite loops on zero-length matches (defensive).
      if (match.index === pattern.lastIndex) pattern.lastIndex += 1;
    }
  }

  if (!input.removalClaim) reasons.push("no_removal_claim");
  if (!input.matchedExistingBenefit) reasons.push("no_matched_benefit");
  if (!input.evidenceVerified) reasons.push("evidence_not_verified");
  if (matched.length === 0) {
    reasons.push(
      negated.length > 0 ? "discontinuation_language_negated" : "no_discontinuation_language",
    );
  }
  if (input.confidence < REMOVAL_GATE_MIN_CONFIDENCE) reasons.push("confidence_below_threshold");

  return {
    version: REMOVAL_GATE_VERSION,
    passed: reasons.length === 0,
    matched_phrases: [...new Set(matched)],
    negated_phrases: [...new Set(negated)],
    reasons,
  };
}
