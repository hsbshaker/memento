import { createHash } from "node:crypto";

/**
 * Canonical benefit content hash shared by the CSV importer and the freshness
 * pipeline. The recipe (7 fields joined with "|", SHA-256 hex) must not change:
 * every existing benefits.benefit_hash value in the database was computed with
 * it. It is a change-detection fingerprint only — row concurrency uses
 * benefits.content_version, never this hash.
 */
export interface BenefitHashInput {
  benefitCode: string;
  benefitValue: string;
  cadence: string;
  resetTiming: string;
  enrollmentRequired: boolean;
  requiresSetup: boolean;
  trackInMemento: string;
}

export const computeBenefitHash = ({
  benefitCode,
  benefitValue,
  cadence,
  resetTiming,
  enrollmentRequired,
  requiresSetup,
  trackInMemento,
}: BenefitHashInput): string =>
  createHash("sha256")
    .update(
      [
        benefitCode,
        benefitValue,
        cadence,
        resetTiming,
        String(enrollmentRequired),
        String(requiresSetup),
        trackInMemento,
      ].join("|"),
    )
    .digest("hex");
