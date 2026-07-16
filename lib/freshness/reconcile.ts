import type {
  BenefitValueSnapshot,
} from "@/lib/benefits/benefit-fields";
import {
  BENEFIT_CANONICAL_FIELDS,
  pickVersionedSnapshot,
} from "@/lib/benefits/benefit-fields";
import type { AuthorityLevel, ProposalOperation } from "@/lib/constants/freshness-schema";
import type {
  BenefitRowForReconcile,
  FieldDiffEntry,
  RemovalGateRecord,
} from "@/lib/types/freshness-schema";
import { computeProposalDedupeKey } from "@/lib/freshness/dedupe-key";
import type { ExtractedCandidate } from "@/lib/freshness/extraction-schema";
import { evaluateRemovalGate } from "@/lib/freshness/removal-gate";

/**
 * Deterministic reconciliation of validated extraction candidates against a
 * card's active benefits. Structural guarantees:
 *  - a candidate whose evidence is not verbatim-present in its chunk is dropped
 *    (and >30% dropped fails the whole extraction closed);
 *  - absence of a benefit from the document produces NOTHING (never a REMOVE);
 *  - removal/expiration requires the versioned removal gate; failing candidates
 *    are downgraded and persisted as structurally non-publishable
 *    (publish_block_reason='removal_gate_failed');
 *  - ambiguous matches become a single non-publishable review signal
 *    (publish_block_reason='ambiguous_match'), never a guess;
 *  - secondary-authority sources mark every draft investigation_only.
 */

export const EVIDENCE_DROP_FAIL_RATIO = 0.3;
export const FUZZY_MATCH_CONFIDENCE_PENALTY = 0.1;

export interface ChunkCandidate {
  candidate: ExtractedCandidate;
  chunkId: string;
}

export interface ReconcileChunk {
  chunkId: string;
  text: string;
  startOffset: number;
}

export interface ReconcileCard {
  id: string;
  displayName: string | null;
  cardCode: string | null;
}

export interface ReconcileInput {
  card: ReconcileCard;
  /** Active benefits for the card (caller filters out retired). */
  benefits: BenefitRowForReconcile[];
  candidates: ChunkCandidate[];
  chunks: ReconcileChunk[];
  sourceUrl: string;
  sourceAuthorityLevel: AuthorityLevel;
  extractorVersion: string;
  extractionModel: string | null;
}

export interface ProposalDraft {
  operation: ProposalOperation;
  benefitId: string | null;
  beforeValue: BenefitValueSnapshot | null;
  afterValue: BenefitValueSnapshot | null;
  fieldDiff: FieldDiffEntry[] | null;
  beforeVersion: number | null;
  effectiveDate: string | null;
  evidenceExcerpt: string;
  evidenceChunkId: string | null;
  evidenceOffset: number | null;
  confidence: number;
  explanation: string;
  removalGate: RemovalGateRecord | null;
  publishBlockReason: string | null;
  investigationOnly: boolean;
  dedupeKey: string;
  extractorVersion: string;
  extractionModel: string | null;
  candidateName: string;
}

export interface ReconcileResult {
  ok: boolean;
  failReason: string | null;
  proposals: ProposalDraft[];
  verifiedBenefitIds: string[];
  droppedCandidates: number;
}

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Whitespace-tolerant verbatim search: the excerpt must appear in the chunk
 * with only whitespace differences. Returns the offset within the chunk text,
 * or null when absent.
 */
export function findExcerptOffset(chunkText: string, excerpt: string): number | null {
  const tokens = excerpt.trim().split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length === 0) return null;

  const pattern = new RegExp(tokens.map(escapeRegExp).join("\\s+"));
  const match = pattern.exec(chunkText);
  return match ? match.index : null;
}

const normalizeName = (value: string | null): string =>
  (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[™®℠]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

type MatchOutcome =
  | { kind: "code" | "exact_name" | "fuzzy"; benefit: BenefitRowForReconcile }
  | { kind: "none" }
  | { kind: "ambiguous"; matches: BenefitRowForReconcile[] };

export function matchCandidate(
  candidate: ExtractedCandidate,
  benefits: BenefitRowForReconcile[],
): MatchOutcome {
  // 1. Model-asserted code — validated against real codes, never trusted blindly.
  if (candidate.matched_benefit_code) {
    const byCode = benefits.find((b) => b.benefit_code === candidate.matched_benefit_code);
    if (byCode) return { kind: "code", benefit: byCode };
  }

  const candidateName = normalizeName(candidate.benefit_name);
  if (candidateName.length === 0) return { kind: "none" };

  // 2. Exact normalized-name match.
  const exact = benefits.filter((b) => normalizeName(b.benefit_name) === candidateName);
  if (exact.length === 1) return { kind: "exact_name", benefit: exact[0] };
  if (exact.length > 1) return { kind: "ambiguous", matches: exact };

  // 3. Unique fuzzy containment (either direction, minimum length guard).
  const fuzzy = benefits.filter((b) => {
    const name = normalizeName(b.benefit_name);
    if (name.length < 6 || candidateName.length < 6) return false;
    return name.includes(candidateName) || candidateName.includes(name);
  });
  if (fuzzy.length === 1) return { kind: "fuzzy", benefit: fuzzy[0] };
  if (fuzzy.length > 1) return { kind: "ambiguous", matches: fuzzy };

  return { kind: "none" };
}

const candidateAsserts = (candidate: ExtractedCandidate, field: string): boolean => {
  const value = candidate[field as keyof ExtractedCandidate];
  return value !== null && value !== undefined;
};

const diffAgainstBenefit = (
  candidate: ExtractedCandidate,
  benefit: BenefitRowForReconcile,
): FieldDiffEntry[] => {
  const diff: FieldDiffEntry[] = [];

  for (const field of BENEFIT_CANONICAL_FIELDS) {
    if (!candidateAsserts(candidate, field)) continue; // null = not asserted, never a diff

    const after = candidate[field as keyof ExtractedCandidate] as string | boolean;
    const before = benefit[field as keyof BenefitRowForReconcile] as string | boolean | null;

    const equal =
      typeof after === "string" && typeof before === "string"
        ? after.trim() === before.trim()
        : after === before;

    if (!equal) {
      diff.push({ field, before: before ?? null, after });
    }
  }

  return diff;
};

const mergeAfterState = (
  before: BenefitValueSnapshot,
  candidate: ExtractedCandidate,
): BenefitValueSnapshot => {
  const after: BenefitValueSnapshot = { ...before, content_version: null };
  const target = after as unknown as Record<string, unknown>;
  for (const field of BENEFIT_CANONICAL_FIELDS) {
    if (candidateAsserts(candidate, field)) {
      target[field] = candidate[field as keyof ExtractedCandidate];
    }
  }
  return after;
};

const snapshotFromBenefit = (benefit: BenefitRowForReconcile): BenefitValueSnapshot =>
  pickVersionedSnapshot(benefit);

/**
 * Chunks that must be re-run with the escalation model before final
 * reconciliation: removal claims, expirations, ambiguous matches, and
 * low-confidence candidates.
 */
export function flagEscalationChunks(
  candidates: ChunkCandidate[],
  benefits: BenefitRowForReconcile[],
  confidenceThreshold: number,
): string[] {
  const flagged = new Set<string>();

  for (const { candidate, chunkId } of candidates) {
    if (
      candidate.removal_claim ||
      candidate.effective_date !== null ||
      candidate.confidence < confidenceThreshold ||
      matchCandidate(candidate, benefits).kind === "ambiguous"
    ) {
      flagged.add(chunkId);
    }
  }

  return [...flagged];
}

export function reconcileExtraction(input: ReconcileInput): ReconcileResult {
  const chunksById = new Map(input.chunks.map((chunk) => [chunk.chunkId, chunk]));
  const investigationOnly = input.sourceAuthorityLevel === "secondary";

  interface VerifiedCandidate {
    candidate: ExtractedCandidate;
    chunkId: string;
    evidenceOffset: number;
  }

  const verified: VerifiedCandidate[] = [];
  let dropped = 0;

  for (const { candidate, chunkId } of input.candidates) {
    const chunk = chunksById.get(chunkId);
    if (!chunk) {
      dropped += 1;
      continue;
    }
    const localOffset = findExcerptOffset(chunk.text, candidate.evidence_excerpt);
    if (localOffset === null) {
      dropped += 1;
      continue;
    }
    verified.push({
      candidate,
      chunkId,
      evidenceOffset: chunk.startOffset + localOffset,
    });
  }

  const total = input.candidates.length;
  if (total > 0 && dropped / total > EVIDENCE_DROP_FAIL_RATIO) {
    return {
      ok: false,
      failReason: "evidence_grounding_failed",
      proposals: [],
      verifiedBenefitIds: [],
      droppedCandidates: dropped,
    };
  }

  const proposals: ProposalDraft[] = [];
  const verifiedBenefitIds = new Set<string>();
  const candidatesByBenefit = new Map<string, VerifiedCandidate[]>();
  const unmatchedOrAmbiguous: Array<{
    entry: VerifiedCandidate;
    outcome: MatchOutcome;
  }> = [];

  for (const entry of verified) {
    const outcome = matchCandidate(entry.candidate, input.benefits);
    if (outcome.kind === "none" || outcome.kind === "ambiguous") {
      unmatchedOrAmbiguous.push({ entry, outcome });
      continue;
    }
    const list = candidatesByBenefit.get(outcome.benefit.id) ?? [];
    list.push(entry);
    candidatesByBenefit.set(outcome.benefit.id, list);
  }

  const baseDraft = (entry: VerifiedCandidate) => ({
    evidenceExcerpt: entry.candidate.evidence_excerpt,
    evidenceChunkId: entry.chunkId,
    evidenceOffset: entry.evidenceOffset,
    explanation: entry.candidate.explanation,
    investigationOnly,
    extractorVersion: input.extractorVersion,
    extractionModel: input.extractionModel,
    candidateName: entry.candidate.benefit_name,
  });

  // Ambiguous / unmatched candidates.
  for (const { entry, outcome } of unmatchedOrAmbiguous) {
    const { candidate } = entry;

    if (outcome.kind === "ambiguous") {
      const codes = outcome.matches.map((b) => b.benefit_code ?? b.benefit_name ?? b.id);
      const afterValue: BenefitValueSnapshot = {
        benefit_name: candidate.benefit_name,
        benefit_value: candidate.benefit_value,
        cadence: candidate.cadence,
        reset_timing: candidate.reset_timing,
        enrollment_required: candidate.enrollment_required,
        requires_setup: candidate.requires_setup,
        display_description: candidate.display_description,
        benefit_status: "active",
        retired_at: null,
        source_url: input.sourceUrl,
        track_in_memento: null,
        benefit_code: null,
        benefit_hash: null,
        content_version: null,
      };
      proposals.push({
        ...baseDraft(entry),
        operation: "add",
        benefitId: null,
        beforeValue: null,
        afterValue,
        fieldDiff: null,
        beforeVersion: null,
        effectiveDate: candidate.effective_date,
        confidence: candidate.confidence,
        removalGate: null,
        publishBlockReason: "ambiguous_match",
        explanation: `Ambiguous match — candidate "${candidate.benefit_name}" matches multiple existing benefits (${codes.join(", ")}). ${candidate.explanation}`,
        dedupeKey: computeProposalDedupeKey({
          cardId: input.card.id,
          benefitId: null,
          operation: "add",
          after: afterValue,
          effectiveDate: candidate.effective_date,
          candidateName: candidate.benefit_name,
        }),
      });
      continue;
    }

    // Unmatched → ADD candidate. A removal claim with no matched benefit can
    // never become a REMOVE (there is nothing to remove) — it is skipped.
    if (candidate.removal_claim) {
      dropped += 0; // explicit no-op: absence + removal claim without a match produces nothing
      continue;
    }

    const derivedCode = input.card.cardCode
      ? `${input.card.cardCode}_${slugify(candidate.benefit_name)}`
      : null;

    const afterValue: BenefitValueSnapshot = {
      benefit_name: candidate.benefit_name,
      benefit_value: candidate.benefit_value,
      cadence: candidate.cadence,
      reset_timing: candidate.reset_timing,
      enrollment_required: candidate.enrollment_required,
      requires_setup: candidate.requires_setup,
      display_description: candidate.display_description,
      benefit_status: "active",
      retired_at: null,
      source_url: input.sourceUrl,
      track_in_memento: null,
      benefit_code: derivedCode,
      benefit_hash: null,
      content_version: null,
    };

    proposals.push({
      ...baseDraft(entry),
      operation: "add",
      benefitId: null,
      beforeValue: null,
      afterValue,
      fieldDiff: null,
      beforeVersion: null,
      effectiveDate: candidate.effective_date,
      confidence: candidate.confidence,
      removalGate: null,
      publishBlockReason: null,
      dedupeKey: computeProposalDedupeKey({
        cardId: input.card.id,
        benefitId: null,
        operation: "add",
        after: afterValue,
        effectiveDate: candidate.effective_date,
        candidateName: candidate.benefit_name,
      }),
    });
  }

  // Matched candidates, grouped per benefit.
  for (const [benefitId, entries] of candidatesByBenefit) {
    const benefit = input.benefits.find((b) => b.id === benefitId);
    if (!benefit) continue;

    if (entries.length > 1) {
      // Multiple candidates map to one benefit — a single ambiguity signal.
      const names = entries.map((e) => e.candidate.benefit_name);
      const first = entries[0];
      proposals.push({
        ...baseDraft(first),
        operation: "modify",
        benefitId,
        beforeValue: snapshotFromBenefit(benefit),
        afterValue: null,
        fieldDiff: null,
        beforeVersion: benefit.content_version,
        effectiveDate: null,
        confidence: Math.min(...entries.map((e) => e.candidate.confidence)),
        removalGate: null,
        publishBlockReason: "ambiguous_match",
        explanation: `Ambiguous match — multiple extracted candidates (${names.join("; ")}) map to benefit ${benefit.benefit_code ?? benefit.benefit_name}.`,
        dedupeKey: computeProposalDedupeKey({
          cardId: input.card.id,
          benefitId,
          operation: "modify",
          after: null,
          effectiveDate: null,
          candidateName: names.join("|"),
        }),
      });
      continue;
    }

    const entry = entries[0];
    const { candidate } = entry;
    const outcome = matchCandidate(candidate, input.benefits);
    const confidencePenalty = outcome.kind === "fuzzy" ? FUZZY_MATCH_CONFIDENCE_PENALTY : 0;
    const confidence = Math.max(0, candidate.confidence - confidencePenalty);
    const beforeValue = snapshotFromBenefit(benefit);

    if (candidate.removal_claim) {
      const gate = evaluateRemovalGate({
        removalClaim: true,
        matchedExistingBenefit: true,
        evidenceVerified: true,
        evidenceExcerpt: candidate.evidence_excerpt,
        confidence,
      });

      if (gate.passed) {
        const operation: ProposalOperation = candidate.effective_date ? "expire" : "remove";
        const afterValue: BenefitValueSnapshot = {
          ...beforeValue,
          benefit_status: "retired",
          content_version: null,
        };
        proposals.push({
          ...baseDraft(entry),
          operation,
          benefitId,
          beforeValue,
          afterValue,
          fieldDiff: [
            { field: "benefit_status", before: beforeValue.benefit_status, after: "retired" },
          ],
          beforeVersion: benefit.content_version,
          effectiveDate: candidate.effective_date,
          confidence,
          removalGate: gate,
          publishBlockReason: null,
          dedupeKey: computeProposalDedupeKey({
            cardId: input.card.id,
            benefitId,
            operation,
            after: null,
            effectiveDate: candidate.effective_date,
            candidateName: candidate.benefit_name,
          }),
        });
      } else {
        // Downgraded: structurally non-publishable review signal.
        const afterValue = mergeAfterState(beforeValue, candidate);
        proposals.push({
          ...baseDraft(entry),
          operation: "modify",
          benefitId,
          beforeValue,
          afterValue,
          fieldDiff: diffAgainstBenefit(candidate, benefit),
          beforeVersion: benefit.content_version,
          effectiveDate: candidate.effective_date,
          confidence,
          removalGate: gate,
          publishBlockReason: "removal_gate_failed",
          explanation: `Possible removal — evidence insufficient (${gate.reasons.join(", ")}). ${candidate.explanation}`,
          dedupeKey: computeProposalDedupeKey({
            cardId: input.card.id,
            benefitId,
            operation: "modify",
            after: afterValue,
            effectiveDate: candidate.effective_date,
            candidateName: candidate.benefit_name,
          }),
        });
      }
      continue;
    }

    const fieldDiff = diffAgainstBenefit(candidate, benefit);

    if (fieldDiff.length === 0) {
      // NO_CHANGE: no proposal row; the benefit is verified.
      verifiedBenefitIds.add(benefitId);
      continue;
    }

    const afterValue = mergeAfterState(beforeValue, candidate);
    proposals.push({
      ...baseDraft(entry),
      operation: "modify",
      benefitId,
      beforeValue,
      afterValue,
      fieldDiff,
      beforeVersion: benefit.content_version,
      effectiveDate: candidate.effective_date,
      confidence,
      removalGate: null,
      publishBlockReason: null,
      dedupeKey: computeProposalDedupeKey({
        cardId: input.card.id,
        benefitId,
        operation: "modify",
        after: afterValue,
        effectiveDate: candidate.effective_date,
        candidateName: candidate.benefit_name,
      }),
    });
  }

  return {
    ok: true,
    failReason: null,
    proposals,
    verifiedBenefitIds: [...verifiedBenefitIds],
    droppedCandidates: dropped,
  };
}
