import type { BenefitCanonicalState } from "@/lib/benefits/benefit-fields";
import { BENEFIT_CANONICAL_FIELDS } from "@/lib/benefits/benefit-fields";
import type { ProposalOperation } from "@/lib/constants/freshness-schema";
import { sha256Hex } from "@/lib/freshness/hashing";

/**
 * Proposal dedupe key. Properties:
 * - reruns over unchanged content regenerate the identical key (no duplicate
 *   proposals; the store bumps seen_count via the unique index instead);
 * - a materially different proposed after-state produces a different key, so
 *   e.g. "$300 → $400" and "$300 → $450" coexist as separate proposals.
 */

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[™®℠]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

/** Stable hash over the canonical after-state, in contract field order. */
export function canonicalStateHash(state: BenefitCanonicalState): string {
  const parts = BENEFIT_CANONICAL_FIELDS.map((field) => {
    const value = state[field];
    if (value === null || value === undefined) return "";
    return String(value);
  });
  return sha256Hex(parts.join("|"));
}

export interface DedupeKeyInput {
  cardId: string;
  benefitId: string | null;
  operation: ProposalOperation;
  after: BenefitCanonicalState | null;
  effectiveDate: string | null;
  /** Used to derive identity for ADD proposals (no benefit id yet). */
  candidateName: string;
}

export function computeProposalDedupeKey(input: DedupeKeyInput): string {
  const identity = input.benefitId ?? `new:${slugify(input.candidateName)}`;

  let afterHash: string;
  switch (input.operation) {
    case "add":
    case "modify":
      afterHash = input.after ? canonicalStateHash(input.after) : "missing_after";
      break;
    case "expire":
      afterHash = `expire:${input.effectiveDate ?? "unknown"}`;
      break;
    case "remove":
      afterHash = "remove";
      break;
  }

  return sha256Hex(`${input.cardId}|${identity}|${input.operation}|${afterHash}`);
}
