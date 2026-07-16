export const SOURCE_TYPES = ["html", "pdf", "manual_upload"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const AUTHORITY_LEVELS = ["official", "secondary"] as const;
export type AuthorityLevel = (typeof AUTHORITY_LEVELS)[number];

export const PARSER_STRATEGIES = ["generic_html", "pdf_text"] as const;
export type ParserStrategy = (typeof PARSER_STRATEGIES)[number];

export const SOURCE_PROCESSING_STATES = ["idle", "fetching", "dead_letter"] as const;
export type SourceProcessingState = (typeof SOURCE_PROCESSING_STATES)[number];

export const SNAPSHOT_VALIDATION_STATUSES = ["ok", "suspect"] as const;
export type SnapshotValidationStatus = (typeof SNAPSHOT_VALIDATION_STATUSES)[number];

export const EXTRACTION_OUTCOMES = [
  "not_required",
  "pending",
  "extracted",
  "partial",
  "failed",
] as const;
export type ExtractionOutcome = (typeof EXTRACTION_OUTCOMES)[number];

export const EXTRACTION_JOB_STATUSES = [
  "pending",
  "claimed",
  "completed",
  "failed",
  "dead_letter",
  "superseded",
] as const;
export type ExtractionJobStatus = (typeof EXTRACTION_JOB_STATUSES)[number];

export const EXTRACTION_JOB_REASONS = [
  "content_changed",
  "monthly_verification",
  "manual_retry",
] as const;
export type ExtractionJobReason = (typeof EXTRACTION_JOB_REASONS)[number];

export const CHUNK_STATUSES = ["pending", "extracted", "failed"] as const;
export type ChunkStatus = (typeof CHUNK_STATUSES)[number];

export const PROPOSAL_OPERATIONS = ["add", "modify", "expire", "remove"] as const;
export type ProposalOperation = (typeof PROPOSAL_OPERATIONS)[number];

export const PROPOSAL_STATUSES = [
  "needs_review",
  "approved",
  "rejected",
  "published",
  "superseded",
  "failed",
  "rolled_back",
] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export const PROPOSAL_EVENT_TYPES = [
  "created",
  "status_changed",
  "edited",
  "reobserved",
  "revision_created",
  "published",
  "publish_failed",
  "publish_blocked",
  "rolled_back",
  "superseded",
] as const;
export type ProposalEventType = (typeof PROPOSAL_EVENT_TYPES)[number];

export const LINK_COVERAGE_TYPES = ["full", "partial", "mention"] as const;
export type LinkCoverageType = (typeof LINK_COVERAGE_TYPES)[number];

export const RUN_TRIGGERS = ["cron", "manual", "single_source"] as const;
export type RunTrigger = (typeof RUN_TRIGGERS)[number];

export const RUN_STATUSES = ["running", "completed", "halted", "failed"] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

export const STALENESS_STATES = [
  "current",
  "verification_due",
  "stale",
  "source_unavailable",
  "review_required",
] as const;
export type StalenessState = (typeof STALENESS_STATES)[number];

/** Reasons a proposal is structurally non-publishable. */
export const PUBLISH_BLOCK_REASONS = ["removal_gate_failed", "ambiguous_match"] as const;
export type PublishBlockReason = (typeof PUBLISH_BLOCK_REASONS)[number];

/** Private storage bucket holding immutable raw source artifacts. */
export const SOURCE_ARTIFACTS_BUCKET = "source-artifacts";
