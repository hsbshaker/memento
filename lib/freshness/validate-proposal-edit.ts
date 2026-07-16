import { BENEFIT_CANONICAL_FIELDS } from "@/lib/benefits/benefit-fields";
import {
  BENEFIT_CADENCES,
  TRACK_IN_MEMENTO_VALUES,
} from "@/lib/constants/memento-schema";
import type { ValidationResult } from "@/lib/freshness/extraction-schema";

/**
 * Server-side validation of reviewer edits (edited_after_value). The publish
 * RPC independently whitelists jsonb keys; this is the first, friendlier gate.
 * Reviewers may edit canonical content fields plus benefit_code (for ADD
 * naming), source_url, and track_in_memento. Lifecycle fields
 * (benefit_status, retired_at, content_version, benefit_hash) are never
 * editable — they are derived by the publish RPC.
 */

const EDITABLE_STRING_FIELDS = new Set<string>([
  "benefit_name",
  "benefit_value",
  "reset_timing",
  "display_description",
  "benefit_code",
  "source_url",
]);

const EDITABLE_BOOLEAN_FIELDS = new Set<string>(["enrollment_required", "requires_setup"]);

export const EDITABLE_PROPOSAL_FIELDS = [
  ...BENEFIT_CANONICAL_FIELDS,
  "benefit_code",
  "source_url",
  "track_in_memento",
] as const;

export function validateProposalEdit(
  value: unknown,
): ValidationResult<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, errors: ["edited_after_value must be an object"] };
  }

  const record = value as Record<string, unknown>;
  const errors: string[] = [];
  const allowed = new Set<string>(EDITABLE_PROPOSAL_FIELDS);

  for (const [key, fieldValue] of Object.entries(record)) {
    if (!allowed.has(key)) {
      errors.push(`unknown field: ${key}`);
      continue;
    }

    if (key === "cadence") {
      if (
        fieldValue !== null &&
        !(BENEFIT_CADENCES as readonly string[]).includes(fieldValue as string)
      ) {
        errors.push(`cadence must be null or one of ${BENEFIT_CADENCES.join(", ")}`);
      }
      continue;
    }

    if (key === "track_in_memento") {
      if (
        fieldValue !== null &&
        !(TRACK_IN_MEMENTO_VALUES as readonly string[]).includes(fieldValue as string)
      ) {
        errors.push(
          `track_in_memento must be null or one of ${TRACK_IN_MEMENTO_VALUES.join(", ")}`,
        );
      }
      continue;
    }

    if (EDITABLE_BOOLEAN_FIELDS.has(key)) {
      if (fieldValue !== null && typeof fieldValue !== "boolean") {
        errors.push(`${key} must be a boolean or null`);
      }
      continue;
    }

    if (EDITABLE_STRING_FIELDS.has(key)) {
      if (fieldValue !== null && typeof fieldValue !== "string") {
        errors.push(`${key} must be a string or null`);
      } else if (typeof fieldValue === "string" && fieldValue.trim().length === 0) {
        errors.push(`${key} must not be blank (use null to clear)`);
      }
    }
  }

  if (Object.keys(record).length === 0) {
    errors.push("edited_after_value must contain at least one field");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: record };
}
