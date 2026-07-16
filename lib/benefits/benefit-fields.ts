/**
 * Canonical benefit-field contracts.
 *
 * This module is the single source of truth for which benefit fields flow through
 * extraction, validation, diffing, version history, publishing, and rollback.
 * The freshness pipeline (lib/freshness/*), the publish RPCs (asserted via pgTAP +
 * the SQL drift test), and the admin edit validator all derive from these lists.
 */

/** Fields the extraction/diff layer reasons about (user-visible benefit content). */
export const BENEFIT_CANONICAL_FIELDS = [
  "benefit_name",
  "benefit_value",
  "cadence",
  "reset_timing",
  "enrollment_required",
  "requires_setup",
  "display_description",
] as const;

export type BenefitCanonicalField = (typeof BENEFIT_CANONICAL_FIELDS)[number];

/**
 * Fields whose change bumps benefits.content_version and is captured in
 * before_value/after_value, benefit_history, and rollback. Excludes
 * verification-only fields such as last_verified_at.
 */
export const BENEFIT_VERSIONED_FIELDS = [
  ...BENEFIT_CANONICAL_FIELDS,
  "benefit_status",
  "retired_at",
  "source_url",
  "track_in_memento",
] as const;

export type BenefitVersionedField = (typeof BENEFIT_VERSIONED_FIELDS)[number];

export interface BenefitCanonicalState {
  benefit_name: string | null;
  benefit_value: string | null;
  cadence: string | null;
  reset_timing: string | null;
  enrollment_required: boolean | null;
  requires_setup: boolean | null;
  display_description: string | null;
}

export interface BenefitVersionedState extends BenefitCanonicalState {
  benefit_status: string | null;
  retired_at: string | null;
  source_url: string | null;
  track_in_memento: string | null;
}

/**
 * The immutable shape stored in benefit_change_proposals.before_value /
 * after_value: the versioned state plus identifying metadata.
 */
export interface BenefitValueSnapshot extends BenefitVersionedState {
  benefit_code: string | null;
  benefit_hash: string | null;
  content_version: number | null;
}

type BenefitLikeRow = Partial<Record<BenefitVersionedField, unknown>> & {
  benefit_code?: unknown;
  benefit_hash?: unknown;
  content_version?: unknown;
};

const asStringOrNull = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const asBooleanOrNull = (value: unknown): boolean | null =>
  typeof value === "boolean" ? value : null;

export function pickCanonicalState(row: BenefitLikeRow): BenefitCanonicalState {
  return {
    benefit_name: asStringOrNull(row.benefit_name),
    benefit_value: asStringOrNull(row.benefit_value),
    cadence: asStringOrNull(row.cadence),
    reset_timing: asStringOrNull(row.reset_timing),
    enrollment_required: asBooleanOrNull(row.enrollment_required),
    requires_setup: asBooleanOrNull(row.requires_setup),
    display_description: asStringOrNull(row.display_description),
  };
}

export function pickVersionedSnapshot(row: BenefitLikeRow): BenefitValueSnapshot {
  return {
    ...pickCanonicalState(row),
    benefit_status: asStringOrNull(row.benefit_status),
    retired_at: asStringOrNull(row.retired_at),
    source_url: asStringOrNull(row.source_url),
    track_in_memento: asStringOrNull(row.track_in_memento),
    benefit_code: asStringOrNull(row.benefit_code),
    benefit_hash: asStringOrNull(row.benefit_hash),
    content_version:
      typeof row.content_version === "number" && Number.isInteger(row.content_version)
        ? row.content_version
        : null,
  };
}

/** Keys allowed in before_value/after_value snapshots (versioned fields + metadata). */
export const BENEFIT_SNAPSHOT_KEYS = [
  ...BENEFIT_VERSIONED_FIELDS,
  "benefit_code",
  "benefit_hash",
  "content_version",
] as const;

export type BenefitSnapshotKey = (typeof BENEFIT_SNAPSHOT_KEYS)[number];
