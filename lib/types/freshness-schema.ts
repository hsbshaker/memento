import type {
  AuthorityLevel,
  ChunkStatus,
  ExtractionJobReason,
  ExtractionJobStatus,
  ExtractionOutcome,
  LinkCoverageType,
  ParserStrategy,
  ProposalOperation,
  ProposalStatus,
  RunStatus,
  RunTrigger,
  SnapshotValidationStatus,
  SourceProcessingState,
  SourceType,
} from "@/lib/constants/freshness-schema";
import type { BenefitValueSnapshot } from "@/lib/benefits/benefit-fields";

export interface SourceParserConfig {
  content_selectors?: string[];
  ignore_selectors?: string[];
  expected_markers?: string[];
  min_expected_length?: number;
}

export interface BenefitSourceRow {
  id: string;
  card_id: string;
  source_type: SourceType;
  source_url: string;
  authority_level: AuthorityLevel;
  parser_strategy: ParserStrategy;
  parser_config: SourceParserConfig | null;
  check_cadence_days: number;
  monthly_full_verification: boolean;
  enabled: boolean;
  notes: string | null;
  next_check_at: string;
  processing_state: SourceProcessingState;
  claimed_by_run_id: string | null;
  claimed_at: string | null;
  lease_expires_at: string | null;
  attempt_count: number;
  next_retry_at: string | null;
  last_attempted_at: string | null;
  last_successful_at: string | null;
  last_changed_at: string | null;
  last_content_verified_at: string | null;
  last_http_status: number | null;
  etag: string | null;
  last_modified: string | null;
  last_raw_sha256: string | null;
  last_normalized_sha256: string | null;
  consecutive_failure_count: number;
  created_at: string;
  updated_at: string;
}

export interface SourceSnapshotRow {
  id: string;
  source_id: string;
  run_id: string;
  fetched_at: string;
  http_status: number | null;
  content_type: string | null;
  mime_type: string | null;
  content_length: number | null;
  etag: string | null;
  last_modified: string | null;
  final_url: string | null;
  response_headers: Record<string, string> | null;
  raw_sha256: string;
  normalized_sha256: string;
  artifact_path: string | null;
  extracted_text: string | null;
  validation_status: SnapshotValidationStatus;
  validation_reasons: string[] | null;
  chunk_count: number | null;
  chunks_processed: number | null;
  truncated: boolean;
  extraction_outcome: ExtractionOutcome; // 'not_required' | 'pending' | 'extracted' | 'partial' | 'failed'
  extraction_model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cache_read_tokens: number | null;
  extraction_error: string | null;
  created_at: string;
}

export interface SnapshotChunkRow {
  id: string;
  snapshot_id: string;
  chunk_index: number;
  chunk_id: string;
  page_number: number | null;
  section_heading: string | null;
  start_offset: number;
  end_offset: number;
  chunk_text: string;
  status: ChunkStatus;
  attempts: number;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cache_read_tokens: number | null;
  last_error: string | null;
  result: unknown | null;
  created_at: string;
  updated_at: string;
}

export interface ExtractionJobRow {
  id: string;
  snapshot_id: string;
  source_id: string;
  status: ExtractionJobStatus;
  reason: ExtractionJobReason;
  claimed_by_run_id: string | null;
  claimed_at: string | null;
  lease_expires_at: string | null;
  attempt_count: number;
  next_retry_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface RemovalGateRecord {
  version: number;
  passed: boolean;
  matched_phrases: string[];
  negated_phrases: string[];
  reasons: string[];
}

export interface FieldDiffEntry {
  field: string;
  before: string | boolean | null;
  after: string | boolean | null;
}

export interface BenefitChangeProposalRow {
  id: string;
  run_id: string;
  source_id: string;
  snapshot_id: string;
  card_id: string;
  benefit_id: string | null;
  source_url: string;
  source_authority_level: AuthorityLevel;
  investigation_only: boolean;
  publish_block_reason: string | null;
  operation: ProposalOperation;
  before_value: BenefitValueSnapshot | null;
  after_value: BenefitValueSnapshot | null;
  field_diff: FieldDiffEntry[] | null;
  before_version: number | null;
  effective_date: string | null;
  evidence_excerpt: string;
  evidence_chunk_id: string | null;
  evidence_offset: number | null;
  confidence: number;
  explanation: string;
  extractor_version: string;
  extraction_model: string | null;
  removal_gate: RemovalGateRecord | null;
  status: ProposalStatus;
  dedupe_key: string;
  seen_count: number;
  last_seen_at: string;
  revision: number;
  previous_proposal_id: string | null;
  reviewer_email: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  edited_after_value: Record<string, unknown> | null;
  published_at: string | null;
  published_history_id: string | null;
  published_version: number | null;
  rolled_back_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProposalEventRow {
  id: string;
  proposal_id: string;
  event_type: string;
  actor: string;
  from_status: string | null;
  to_status: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
}

export interface BenefitSourceLinkRow {
  benefit_id: string;
  source_id: string;
  is_primary: boolean;
  coverage_type: LinkCoverageType;
  created_at: string;
}

export interface PipelineRunRow {
  id: string;
  trigger: RunTrigger;
  status: RunStatus;
  started_at: string;
  finished_at: string | null;
  sources_due: number;
  sources_checked: number;
  fetch_failures: number;
  suspect_count: number;
  not_modified_count: number;
  changed_count: number;
  extractions_attempted: number;
  extractions_failed: number;
  extractions_partial: number;
  proposals_created: number;
  proposals_deduped: number;
  proposals_reopened: number;
  no_change_verified: number;
  scheduled_published: number;
  scheduled_failed: number;
  leases_recovered: number;
  dead_lettered: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  estimated_cost_usd: number | null;
  halted_reason: string | null;
  error: string | null;
  created_at: string;
}

/** Benefit row shape the reconciler needs (subset of public.benefits). */
export interface BenefitRowForReconcile {
  id: string;
  card_id: string;
  benefit_code: string | null;
  benefit_name: string | null;
  benefit_value: string | null;
  cadence: string | null;
  reset_timing: string | null;
  enrollment_required: boolean | null;
  requires_setup: boolean | null;
  display_description: string | null;
  benefit_status: string | null;
  retired_at: string | null;
  source_url: string | null;
  track_in_memento: string | null;
  benefit_hash: string | null;
  content_version: number | null;
}
