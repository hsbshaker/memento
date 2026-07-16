import type { BenefitRowForReconcile } from "@/lib/types/freshness-schema";
import {
  CHUNK_MAX_CHARS,
  CHUNK_OVERLAP_CHARS,
  ESCALATION_CONFIDENCE_THRESHOLD,
  EXTRACTOR_VERSION,
} from "@/lib/freshness/constants";
import { chunkDocument } from "@/lib/freshness/chunking";
import type { ExtractionProvider } from "@/lib/freshness/extraction-provider";
import { EXTRACTION_SYSTEM_PROMPT } from "@/lib/freshness/extraction-prompt";
import type { ExtractedCandidate } from "@/lib/freshness/extraction-schema";
import { extractHtmlText } from "@/lib/freshness/html-content";
import { sha256Hex } from "@/lib/freshness/hashing";
import {
  flagEscalationChunks,
  reconcileExtraction,
  type ChunkCandidate,
  type ProposalDraft,
  type ReconcileCard,
} from "@/lib/freshness/reconcile";
import { REMOVAL_GATE_VERSION } from "@/lib/freshness/removal-gate";

/**
 * Extraction evaluation harness. Runs the EXACT production path — HTML
 * extraction, chunking, per-chunk extraction with two-pass escalation, and
 * reconciliation — against a labeled corpus, and scores the result.
 *
 * The live-gate policy (documented in freshness-operations.md): before any
 * source is enabled, a LIVE run with the production models must show ZERO
 * false removals and meet the documented field-accuracy threshold, and the
 * persisted report (data/evals/) records every version involved.
 */

export interface EvalExpectedProposal {
  operation: "add" | "modify" | "expire" | "remove";
  /** benefit_code for matched benefits; benefit_name for adds. */
  benefit_code?: string;
  benefit_name?: string;
  /** Expected after-state field values to check. */
  fields?: Record<string, string | boolean | null>;
}

export interface EvalCase {
  name: string;
  documentHtml: string;
  sourceUrl: string;
  card: ReconcileCard;
  benefits: BenefitRowForReconcile[];
  /** Drives the fake provider in offline mode (plumbing tests / CI). */
  fakeCandidates: ExtractedCandidate[];
  expected: {
    proposals: EvalExpectedProposal[];
    verified_benefit_codes: string[];
  };
}

export interface EvalCaseResult {
  name: string;
  ok: boolean;
  failReason: string | null;
  proposalsProduced: number;
  proposalsExpected: number;
  proposalsMatched: number;
  fieldChecks: number;
  fieldMatches: number;
  falseRemovals: string[];
  missedRemovals: string[];
  verifiedExpected: number;
  verifiedMatched: number;
  errors: string[];
}

export interface EvalReport {
  generated_at: string;
  mode: "live" | "fake";
  versions: {
    model: string;
    escalation_model: string | null;
    extractor_version: string;
    removal_gate_version: number;
    corpus_version: number;
    system_prompt_sha256: string;
  };
  cases: EvalCaseResult[];
  totals: {
    cases: number;
    proposals_expected: number;
    proposals_matched: number;
    field_checks: number;
    field_matches: number;
    field_accuracy: number;
    false_removals: number;
    missed_removals: number;
  };
  hard_gate: {
    zero_false_removals: boolean;
    field_accuracy_threshold: number;
    field_accuracy_met: boolean;
    passed: boolean;
  };
}

export const EVAL_FIELD_ACCURACY_THRESHOLD = 0.98;

const isRemoval = (operation: string) => operation === "remove" || operation === "expire";

const proposalIdentity = (draft: ProposalDraft, benefits: BenefitRowForReconcile[]): string => {
  if (draft.benefitId) {
    const benefit = benefits.find((b) => b.id === draft.benefitId);
    return benefit?.benefit_code ?? draft.benefitId;
  }
  return draft.candidateName;
};

export async function runEvalCase(
  evalCase: EvalCase,
  options: { provider: ExtractionProvider; model: string; escalationModel: string | null },
): Promise<EvalCaseResult> {
  const errors: string[] = [];
  const { text, headings } = extractHtmlText(evalCase.documentHtml);
  const normalizedSha = sha256Hex(text);
  const chunks = chunkDocument(
    { text, headings, normalizedSha256: normalizedSha },
    { maxChars: CHUNK_MAX_CHARS, overlapChars: CHUNK_OVERLAP_CHARS },
  );

  const extractChunk = async (chunk: (typeof chunks)[number], model: string) => {
    const result = await options.provider.extract({
      model,
      cardDisplayName: evalCase.card.displayName ?? "unknown",
      existingBenefits: evalCase.benefits.map((b) => ({
        benefit_code: b.benefit_code,
        benefit_name: b.benefit_name,
        benefit_value: b.benefit_value,
        cadence: b.cadence,
      })),
      sourceUrl: evalCase.sourceUrl,
      chunkText: chunk.text,
      sectionHeading: chunk.sectionHeading,
      pageNumber: chunk.pageNumber,
    });
    return result.candidates;
  };

  const chunkCandidates: ChunkCandidate[] = [];
  for (const chunk of chunks) {
    try {
      const candidates = await extractChunk(chunk, options.model);
      for (const candidate of candidates) {
        chunkCandidates.push({ candidate, chunkId: chunk.chunkId });
      }
    } catch (error) {
      errors.push(`chunk ${chunk.index}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (options.escalationModel) {
    const flagged = new Set(
      flagEscalationChunks(chunkCandidates, evalCase.benefits, ESCALATION_CONFIDENCE_THRESHOLD),
    );
    for (const chunkId of flagged) {
      const chunk = chunks.find((c) => c.chunkId === chunkId);
      if (!chunk) continue;
      try {
        const escalated = await extractChunk(chunk, options.escalationModel);
        for (let i = chunkCandidates.length - 1; i >= 0; i -= 1) {
          if (chunkCandidates[i].chunkId === chunkId) chunkCandidates.splice(i, 1);
        }
        for (const candidate of escalated) {
          chunkCandidates.push({ candidate, chunkId });
        }
      } catch (error) {
        errors.push(
          `escalation ${chunk.index}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  const reconciled = reconcileExtraction({
    card: evalCase.card,
    benefits: evalCase.benefits,
    candidates: chunkCandidates,
    chunks: chunks.map((chunk) => ({
      chunkId: chunk.chunkId,
      text: chunk.text,
      startOffset: chunk.startOffset,
    })),
    sourceUrl: evalCase.sourceUrl,
    sourceAuthorityLevel: "official",
    extractorVersion: EXTRACTOR_VERSION,
    extractionModel: options.model,
  });

  // ---- scoring ---------------------------------------------------------------
  const expected = evalCase.expected;
  let proposalsMatched = 0;
  let fieldChecks = 0;
  let fieldMatches = 0;
  const falseRemovals: string[] = [];
  const missedRemovals: string[] = [];

  const producedPublishable = reconciled.proposals.filter((p) => p.publishBlockReason === null);

  for (const expectedProposal of expected.proposals) {
    const identity = expectedProposal.benefit_code ?? expectedProposal.benefit_name ?? "";
    const match = producedPublishable.find(
      (draft) =>
        draft.operation === expectedProposal.operation &&
        proposalIdentity(draft, evalCase.benefits)
          .toLowerCase()
          .includes(identity.toLowerCase()),
    );
    if (!match) {
      if (isRemoval(expectedProposal.operation)) missedRemovals.push(identity);
      continue;
    }
    proposalsMatched += 1;
    for (const [field, expectedValue] of Object.entries(expectedProposal.fields ?? {})) {
      fieldChecks += 1;
      const actual =
        (match.afterValue as unknown as Record<string, unknown> | null)?.[field] ?? null;
      if (actual === expectedValue) fieldMatches += 1;
    }
  }

  // False removals: any publishable removal not present in the expectations.
  for (const draft of producedPublishable) {
    if (!isRemoval(draft.operation)) continue;
    const identity = proposalIdentity(draft, evalCase.benefits);
    const expectedRemoval = expected.proposals.some(
      (p) =>
        isRemoval(p.operation) &&
        identity.toLowerCase().includes((p.benefit_code ?? p.benefit_name ?? "").toLowerCase()),
    );
    if (!expectedRemoval) falseRemovals.push(identity);
  }

  const verifiedCodes = new Set(
    reconciled.verifiedBenefitIds
      .map((id) => evalCase.benefits.find((b) => b.id === id)?.benefit_code)
      .filter((code): code is string => Boolean(code)),
  );
  const verifiedMatched = expected.verified_benefit_codes.filter((code) =>
    verifiedCodes.has(code),
  ).length;

  return {
    name: evalCase.name,
    ok: reconciled.ok,
    failReason: reconciled.failReason,
    proposalsProduced: reconciled.proposals.length,
    proposalsExpected: expected.proposals.length,
    proposalsMatched,
    fieldChecks,
    fieldMatches,
    falseRemovals,
    missedRemovals,
    verifiedExpected: expected.verified_benefit_codes.length,
    verifiedMatched,
    errors,
  };
}

export async function runEvalCorpus(
  cases: EvalCase[],
  options: {
    provider: ExtractionProvider;
    model: string;
    escalationModel: string | null;
    mode: "live" | "fake";
    corpusVersion: number;
  },
): Promise<EvalReport> {
  const results: EvalCaseResult[] = [];
  for (const evalCase of cases) {
    results.push(await runEvalCase(evalCase, options));
  }

  const totals = results.reduce(
    (acc, result) => ({
      cases: acc.cases + 1,
      proposals_expected: acc.proposals_expected + result.proposalsExpected,
      proposals_matched: acc.proposals_matched + result.proposalsMatched,
      field_checks: acc.field_checks + result.fieldChecks,
      field_matches: acc.field_matches + result.fieldMatches,
      false_removals: acc.false_removals + result.falseRemovals.length,
      missed_removals: acc.missed_removals + result.missedRemovals.length,
    }),
    {
      cases: 0,
      proposals_expected: 0,
      proposals_matched: 0,
      field_checks: 0,
      field_matches: 0,
      false_removals: 0,
      missed_removals: 0,
    },
  );

  const fieldAccuracy = totals.field_checks > 0 ? totals.field_matches / totals.field_checks : 1;
  const zeroFalseRemovals = totals.false_removals === 0;
  const fieldAccuracyMet = fieldAccuracy >= EVAL_FIELD_ACCURACY_THRESHOLD;

  return {
    generated_at: new Date().toISOString(),
    mode: options.mode,
    versions: {
      model: options.model,
      escalation_model: options.escalationModel,
      extractor_version: EXTRACTOR_VERSION,
      removal_gate_version: REMOVAL_GATE_VERSION,
      corpus_version: options.corpusVersion,
      system_prompt_sha256: sha256Hex(EXTRACTION_SYSTEM_PROMPT),
    },
    cases: results,
    totals: { ...totals, field_accuracy: Number(fieldAccuracy.toFixed(4)) },
    hard_gate: {
      zero_false_removals: zeroFalseRemovals,
      field_accuracy_threshold: EVAL_FIELD_ACCURACY_THRESHOLD,
      field_accuracy_met: fieldAccuracyMet,
      passed: zeroFalseRemovals && fieldAccuracyMet,
    },
  };
}
