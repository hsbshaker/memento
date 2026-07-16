/**
 * Env-driven configuration for the freshness pipeline. All knobs read at call
 * time so tests can set process.env, and every value has a safe default.
 * Model IDs are intentionally NOT defaulted: extraction is skipped with a clear
 * configuration error until FRESHNESS_MODEL is set.
 */

const readInt = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const readFloat = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const readOptionalFloat = (name: string): number | null => {
  const raw = process.env[name];
  if (!raw) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export interface MonitorLimits {
  batchLimit: number;
  timeBudgetMs: number;
  maxExtractionsPerRun: number;
  maxProposalsPerRun: number;
  cardChangeRatio: number;
  massChangeMinTripCount: number;
  failureAlertThreshold: number;
  leaseMinutes: number;
  maxAttempts: number;
}

export function getMonitorLimits(): MonitorLimits {
  return {
    batchLimit: readInt("FRESHNESS_BATCH_LIMIT", 25),
    timeBudgetMs: readInt("FRESHNESS_TIME_BUDGET_MS", 250_000),
    maxExtractionsPerRun: readInt("FRESHNESS_MAX_EXTRACTIONS_PER_RUN", 4),
    maxProposalsPerRun: readInt("FRESHNESS_MAX_PROPOSALS_PER_RUN", 25),
    cardChangeRatio: readFloat("FRESHNESS_CARD_CHANGE_RATIO", 0.4),
    massChangeMinTripCount: readInt("FRESHNESS_MASS_CHANGE_MIN_TRIP", 3),
    failureAlertThreshold: readInt("FRESHNESS_FAILURE_ALERT_THRESHOLD", 3),
    leaseMinutes: readInt("FRESHNESS_LEASE_MINUTES", 10),
    maxAttempts: readInt("FRESHNESS_MAX_ATTEMPTS", 5),
  };
}

export interface ModelConfig {
  apiKey: string | null;
  model: string | null;
  escalationModel: string | null;
}

export function getModelConfig(): ModelConfig {
  return {
    apiKey: process.env.ANTHROPIC_API_KEY ?? null,
    model: process.env.FRESHNESS_MODEL ?? null,
    escalationModel: process.env.FRESHNESS_MODEL_ESCALATION ?? null,
  };
}

export interface CostRates {
  inputPerMTok: number | null;
  outputPerMTok: number | null;
}

export function getCostRates(): CostRates {
  return {
    inputPerMTok: readOptionalFloat("FRESHNESS_INPUT_COST_PER_MTOK"),
    outputPerMTok: readOptionalFloat("FRESHNESS_OUTPUT_COST_PER_MTOK"),
  };
}

export function getAlertEmail(adminEmails: string[]): string | null {
  return process.env.FRESHNESS_ALERT_EMAIL ?? adminEmails[0] ?? null;
}

/** Fetch layer limits. */
export const FETCH_TIMEOUT_MS = 15_000;
export const MAX_HTML_BYTES = 2 * 1024 * 1024;
export const MAX_PDF_BYTES = 10 * 1024 * 1024;
export const MAX_REDIRECT_HOPS = 3;

/** Normalized text cap persisted on snapshots (bytes of UTF-16 code units, approx). */
export const MAX_EXTRACTED_TEXT_CHARS = 512 * 1024;

/** Chunking defaults. */
export const CHUNK_MAX_CHARS = 24_000;
export const CHUNK_OVERLAP_CHARS = 800;

/** Escalation threshold: candidates below this confidence trigger the second pass. */
export const ESCALATION_CONFIDENCE_THRESHOLD = 0.6;

/** Version stamp recorded on every proposal (bump when extraction/reconcile logic changes materially). */
export const EXTRACTOR_VERSION = "freshness-extractor/1";
