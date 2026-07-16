import { BENEFIT_CADENCES } from "@/lib/constants/memento-schema";

/**
 * Extraction output contract + hand-rolled validator. The Anthropic provider
 * enforces this shape via strict tool use; this validator runs regardless as
 * defense-in-depth and is the only gate for non-Anthropic providers. Any
 * validation failure fails the extraction attempt closed — invalid output can
 * never become a proposal.
 */

export interface ExtractedCandidate {
  /** The existing benefit_code this candidate maps to, or null for new/unknown. */
  matched_benefit_code: string | null;
  benefit_name: string;
  benefit_value: string | null;
  cadence: string | null;
  reset_timing: string | null;
  enrollment_required: boolean | null;
  requires_setup: boolean | null;
  display_description: string | null;
  /** True only when the document explicitly states the benefit is ending/removed. */
  removal_claim: boolean;
  /** ISO date (YYYY-MM-DD) when the document states an effective date. */
  effective_date: string | null;
  /** Verbatim excerpt from the provided document text supporting this candidate. */
  evidence_excerpt: string;
  explanation: string;
  /** 0..1 */
  confidence: number;
}

export interface ExtractionOutput {
  candidates: ExtractedCandidate[];
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stringOrNull = (value: unknown): value is string | null =>
  value === null || typeof value === "string";

const booleanOrNull = (value: unknown): value is boolean | null =>
  value === null || typeof value === "boolean";

export function validateExtractionOutput(
  value: unknown,
): ValidationResult<ExtractionOutput> {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { ok: false, errors: ["output must be an object"] };
  }

  const rawCandidates = value.candidates;
  if (!Array.isArray(rawCandidates)) {
    return { ok: false, errors: ["candidates must be an array"] };
  }

  const candidates: ExtractedCandidate[] = [];

  rawCandidates.forEach((raw, index) => {
    const at = `candidates[${index}]`;
    if (!isRecord(raw)) {
      errors.push(`${at} must be an object`);
      return;
    }

    if (!stringOrNull(raw.matched_benefit_code)) errors.push(`${at}.matched_benefit_code must be string or null`);
    if (typeof raw.benefit_name !== "string" || raw.benefit_name.trim().length === 0) {
      errors.push(`${at}.benefit_name must be a non-empty string`);
    }
    if (!stringOrNull(raw.benefit_value)) errors.push(`${at}.benefit_value must be string or null`);
    if (!stringOrNull(raw.cadence)) {
      errors.push(`${at}.cadence must be string or null`);
    } else if (
      typeof raw.cadence === "string" &&
      !(BENEFIT_CADENCES as readonly string[]).includes(raw.cadence)
    ) {
      errors.push(`${at}.cadence must be one of ${BENEFIT_CADENCES.join(", ")}`);
    }
    if (!stringOrNull(raw.reset_timing)) errors.push(`${at}.reset_timing must be string or null`);
    if (!booleanOrNull(raw.enrollment_required)) errors.push(`${at}.enrollment_required must be boolean or null`);
    if (!booleanOrNull(raw.requires_setup)) errors.push(`${at}.requires_setup must be boolean or null`);
    if (!stringOrNull(raw.display_description)) errors.push(`${at}.display_description must be string or null`);
    if (typeof raw.removal_claim !== "boolean") errors.push(`${at}.removal_claim must be a boolean`);
    if (!stringOrNull(raw.effective_date)) {
      errors.push(`${at}.effective_date must be string or null`);
    } else if (typeof raw.effective_date === "string" && !ISO_DATE.test(raw.effective_date)) {
      errors.push(`${at}.effective_date must be an ISO date (YYYY-MM-DD)`);
    }
    if (typeof raw.evidence_excerpt !== "string" || raw.evidence_excerpt.trim().length === 0) {
      errors.push(`${at}.evidence_excerpt must be a non-empty string`);
    }
    if (typeof raw.explanation !== "string" || raw.explanation.trim().length === 0) {
      errors.push(`${at}.explanation must be a non-empty string`);
    }
    if (
      typeof raw.confidence !== "number" ||
      !Number.isFinite(raw.confidence) ||
      raw.confidence < 0 ||
      raw.confidence > 1
    ) {
      errors.push(`${at}.confidence must be a number between 0 and 1`);
    }

    if (errors.length === 0) {
      candidates.push({
        matched_benefit_code: raw.matched_benefit_code as string | null,
        benefit_name: raw.benefit_name as string,
        benefit_value: raw.benefit_value as string | null,
        cadence: raw.cadence as string | null,
        reset_timing: raw.reset_timing as string | null,
        enrollment_required: raw.enrollment_required as boolean | null,
        requires_setup: raw.requires_setup as boolean | null,
        display_description: raw.display_description as string | null,
        removal_claim: raw.removal_claim as boolean,
        effective_date: raw.effective_date as string | null,
        evidence_excerpt: raw.evidence_excerpt as string,
        explanation: raw.explanation as string,
        confidence: raw.confidence as number,
      });
    }
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: { candidates } };
}

/**
 * JSON schema for strict tool use. `additionalProperties: false` + a full
 * `required` list means the API guarantees schema-valid tool input on
 * supporting providers.
 */
export const EXTRACTION_TOOL_SCHEMA = {
  type: "object",
  properties: {
    candidates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          matched_benefit_code: { type: ["string", "null"] },
          benefit_name: { type: "string" },
          benefit_value: { type: ["string", "null"] },
          cadence: {
            anyOf: [{ type: "string", enum: [...BENEFIT_CADENCES] }, { type: "null" }],
          },
          reset_timing: { type: ["string", "null"] },
          enrollment_required: { type: ["boolean", "null"] },
          requires_setup: { type: ["boolean", "null"] },
          display_description: { type: ["string", "null"] },
          removal_claim: { type: "boolean" },
          effective_date: { type: ["string", "null"], format: "date" },
          evidence_excerpt: { type: "string" },
          explanation: { type: "string" },
          confidence: { type: "number" },
        },
        required: [
          "matched_benefit_code",
          "benefit_name",
          "benefit_value",
          "cadence",
          "reset_timing",
          "enrollment_required",
          "requires_setup",
          "display_description",
          "removal_claim",
          "effective_date",
          "evidence_excerpt",
          "explanation",
          "confidence",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["candidates"],
  additionalProperties: false,
} as const;
