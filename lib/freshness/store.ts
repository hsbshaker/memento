import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ExtractionJobReason,
  RunTrigger,
} from "@/lib/constants/freshness-schema";
import type {
  BenefitRowForReconcile,
  BenefitSourceRow,
  ExtractionJobRow,
  SnapshotChunkRow,
  SourceSnapshotRow,
} from "@/lib/types/freshness-schema";
import { computeAttemptRetryAt, leaseExpiry, shouldDeadLetter } from "@/lib/freshness/leases";
import type { ProposalDraft, ReconcileCard } from "@/lib/freshness/reconcile";
import { isStrongerEvidence } from "@/lib/freshness/evidence-strength";

/**
 * FreshnessStore is the orchestrator's persistence boundary. The production
 * implementation is a thin Supabase (service-role) adapter; the e2e suite runs
 * against the in-memory implementation (in-memory-store.ts) so pipeline
 * behavior is tested without a database. SQL semantics themselves (RPCs, RLS,
 * triggers) are covered by pgTAP — the in-memory mirror is not the only test
 * of them.
 */

export interface RunCounters {
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
}

export const emptyRunCounters = (): RunCounters => ({
  sources_due: 0,
  sources_checked: 0,
  fetch_failures: 0,
  suspect_count: 0,
  not_modified_count: 0,
  changed_count: 0,
  extractions_attempted: 0,
  extractions_failed: 0,
  extractions_partial: 0,
  proposals_created: 0,
  proposals_deduped: 0,
  proposals_reopened: 0,
  no_change_verified: 0,
  scheduled_published: 0,
  scheduled_failed: 0,
  leases_recovered: 0,
  dead_lettered: 0,
  input_tokens: 0,
  output_tokens: 0,
  cache_read_tokens: 0,
});

export interface RunFinishPatch extends RunCounters {
  status: "completed" | "halted" | "failed";
  halted_reason: string | null;
  error: string | null;
  estimated_cost_usd: number | null;
}

export interface SourceFetchPatch {
  processing_state?: "idle" | "fetching" | "dead_letter";
  claimed_by_run_id?: string | null;
  claimed_at?: string | null;
  lease_expires_at?: string | null;
  attempt_count?: number;
  next_retry_at?: string | null;
  next_check_at?: string;
  last_attempted_at?: string;
  last_successful_at?: string;
  last_changed_at?: string;
  last_content_verified_at?: string;
  last_http_status?: number | null;
  etag?: string | null;
  last_modified?: string | null;
  last_raw_sha256?: string | null;
  last_normalized_sha256?: string | null;
  consecutive_failure_count?: number;
}

export interface NewSnapshot {
  source_id: string;
  run_id: string;
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
  validation_status: "ok" | "suspect";
  validation_reasons: string[] | null;
  chunk_count: number | null;
  chunks_processed: number | null;
  truncated: boolean;
  extraction_outcome: "not_required" | "pending" | "extracted" | "partial" | "failed";
}

export interface NewChunk {
  chunk_index: number;
  chunk_id: string;
  page_number: number | null;
  section_heading: string | null;
  start_offset: number;
  end_offset: number;
  chunk_text: string;
}

export interface SnapshotPatch {
  extraction_outcome?: "not_required" | "pending" | "extracted" | "partial" | "failed";
  extraction_model?: string | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_tokens?: number | null;
  extraction_error?: string | null;
  chunks_processed?: number | null;
}

export interface ChunkPatch {
  status?: "pending" | "extracted" | "failed";
  attempts?: number;
  model?: string | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_tokens?: number | null;
  last_error?: string | null;
  result?: unknown;
}

export interface NewProposalInput {
  runId: string;
  sourceId: string;
  snapshotId: string;
  cardId: string;
  sourceUrl: string;
  sourceAuthorityLevel: "official" | "secondary";
  draft: ProposalDraft;
}

export type ProposalInsertOutcome =
  | { outcome: "inserted"; proposalId: string }
  | { outcome: "deduped"; proposalId: string }
  | { outcome: "revision"; proposalId: string; previousProposalId: string }
  | { outcome: "reobserved"; proposalId: string };

/** Source row joined with its card's issuer (drives the fetch allowlist). */
export type DueSource = BenefitSourceRow & { card_issuer: string | null };

export interface FreshnessStore {
  // Runs
  createRun(run: { id: string; trigger: RunTrigger }): Promise<void>;
  finishRun(runId: string, patch: RunFinishPatch): Promise<void>;
  reconcileStaleRuns(now: Date, timeBudgetMs: number): Promise<number>;

  // Crash recovery
  recoverExpiredSourceClaims(
    now: Date,
    maxAttempts: number,
  ): Promise<{ recovered: number; deadLettered: number }>;
  recoverExpiredJobClaims(
    now: Date,
    maxAttempts: number,
  ): Promise<{ recovered: number; deadLettered: number }>;

  // Sources (fetch phase)
  getDueSources(now: Date, limit: number, sourceId?: string): Promise<DueSource[]>;
  getSource(sourceId: string): Promise<DueSource | null>;
  claimSourceForFetch(
    source: BenefitSourceRow,
    runId: string,
    now: Date,
    leaseMinutes: number,
  ): Promise<boolean>;
  updateSource(sourceId: string, patch: SourceFetchPatch): Promise<void>;

  // Snapshots & chunks
  getSnapshot(snapshotId: string): Promise<SourceSnapshotRow | null>;
  getLatestOkExtractedSnapshot(sourceId: string): Promise<SourceSnapshotRow | null>;
  insertSnapshot(row: NewSnapshot): Promise<string>;
  insertChunks(snapshotId: string, chunks: NewChunk[]): Promise<void>;
  getChunks(snapshotId: string): Promise<SnapshotChunkRow[]>;
  updateChunk(chunkRowId: string, patch: ChunkPatch): Promise<void>;
  updateSnapshot(snapshotId: string, patch: SnapshotPatch): Promise<void>;
  pruneSnapshots(sourceId: string, keepLatest: number): Promise<number>;

  // Extraction jobs
  supersedeOlderJobs(sourceId: string, keepSnapshotId: string): Promise<void>;
  createExtractionJob(input: {
    snapshotId: string;
    sourceId: string;
    reason: ExtractionJobReason;
  }): Promise<"created" | "exists">;
  getWorkableJobs(now: Date, limit: number, sourceId?: string): Promise<ExtractionJobRow[]>;
  claimJob(jobId: string, runId: string, now: Date, leaseMinutes: number): Promise<boolean>;
  completeJob(jobId: string): Promise<void>;
  failJobAttempt(
    jobId: string,
    error: string,
    now: Date,
    maxAttempts: number,
  ): Promise<"retry" | "dead_letter">;

  // Catalog
  getCardWithActiveBenefits(
    cardId: string,
  ): Promise<{ card: ReconcileCard; benefits: BenefitRowForReconcile[] }>;
  getLinkedBenefitIds(sourceId: string): Promise<string[]>;
  markBenefitsVerified(benefitIds: string[], now: Date): Promise<void>;
  markSourceContentVerified(sourceId: string, now: Date): Promise<void>;

  // Proposals
  insertProposal(input: NewProposalInput): Promise<ProposalInsertOutcome>;
}

/* -------------------------------------------------------------------------- */
/* Supabase implementation (service-role; deliberately thin — pgTAP covers SQL) */
/* -------------------------------------------------------------------------- */

const throwIf = (error: { message: string } | null, context: string) => {
  if (error) throw new Error(`${context}: ${error.message}`);
};

const draftToRow = (input: NewProposalInput) => ({
  run_id: input.runId,
  source_id: input.sourceId,
  snapshot_id: input.snapshotId,
  card_id: input.cardId,
  benefit_id: input.draft.benefitId,
  source_url: input.sourceUrl,
  source_authority_level: input.sourceAuthorityLevel,
  investigation_only: input.draft.investigationOnly,
  publish_block_reason: input.draft.publishBlockReason,
  operation: input.draft.operation,
  before_value: input.draft.beforeValue,
  after_value: input.draft.afterValue,
  field_diff: input.draft.fieldDiff,
  before_version: input.draft.beforeVersion,
  effective_date: input.draft.effectiveDate,
  evidence_excerpt: input.draft.evidenceExcerpt,
  evidence_chunk_id: input.draft.evidenceChunkId,
  evidence_offset: input.draft.evidenceOffset,
  confidence: Number(input.draft.confidence.toFixed(2)),
  explanation: input.draft.explanation,
  extractor_version: input.draft.extractorVersion,
  extraction_model: input.draft.extractionModel,
  removal_gate: input.draft.removalGate,
  status: "needs_review" as const,
  dedupe_key: input.draft.dedupeKey,
});

export function createSupabaseFreshnessStore(client: SupabaseClient): FreshnessStore {
  const insertEvent = async (
    proposalId: string,
    eventType: string,
    detail: Record<string, unknown> | null,
  ) => {
    const { error } = await client.from("proposal_events").insert({
      proposal_id: proposalId,
      event_type: eventType,
      actor: "system",
      detail,
    });
    throwIf(error, "insert proposal event");
  };

  return {
    async createRun(run) {
      const { error } = await client
        .from("pipeline_runs")
        .insert({ id: run.id, trigger: run.trigger, status: "running" });
      throwIf(error, "create run");
    },

    async finishRun(runId, patch) {
      const { error } = await client
        .from("pipeline_runs")
        .update({ ...patch, finished_at: new Date().toISOString() })
        .eq("id", runId);
      throwIf(error, "finish run");
    },

    async reconcileStaleRuns(now, timeBudgetMs) {
      const cutoff = new Date(now.getTime() - 2 * timeBudgetMs).toISOString();
      const { data, error } = await client
        .from("pipeline_runs")
        .update({ status: "failed", error: "stale", finished_at: now.toISOString() })
        .eq("status", "running")
        .lt("started_at", cutoff)
        .select("id");
      throwIf(error, "reconcile stale runs");
      return data?.length ?? 0;
    },

    async recoverExpiredSourceClaims(now, maxAttempts) {
      const { data, error } = await client
        .from("benefit_sources")
        .select("id, attempt_count")
        .eq("processing_state", "fetching")
        .lt("lease_expires_at", now.toISOString());
      throwIf(error, "list expired source claims");

      let recovered = 0;
      let deadLettered = 0;
      for (const row of data ?? []) {
        const attempts = (row.attempt_count as number) + 1;
        const dead = shouldDeadLetter(attempts, maxAttempts);
        const { error: updateError } = await client
          .from("benefit_sources")
          .update({
            processing_state: dead ? "dead_letter" : "idle",
            claimed_by_run_id: null,
            claimed_at: null,
            lease_expires_at: null,
            attempt_count: attempts,
            next_retry_at: dead ? null : computeAttemptRetryAt(now, attempts).toISOString(),
          })
          .eq("id", row.id)
          .eq("processing_state", "fetching");
        throwIf(updateError, "recover source claim");
        if (dead) deadLettered += 1;
        else recovered += 1;
      }
      return { recovered, deadLettered };
    },

    async recoverExpiredJobClaims(now, maxAttempts) {
      const { data, error } = await client
        .from("extraction_jobs")
        .select("id, attempt_count")
        .eq("status", "claimed")
        .lt("lease_expires_at", now.toISOString());
      throwIf(error, "list expired job claims");

      let recovered = 0;
      let deadLettered = 0;
      for (const row of data ?? []) {
        const attempts = (row.attempt_count as number) + 1;
        const dead = shouldDeadLetter(attempts, maxAttempts);
        const { error: updateError } = await client
          .from("extraction_jobs")
          .update({
            status: dead ? "dead_letter" : "failed",
            claimed_by_run_id: null,
            claimed_at: null,
            lease_expires_at: null,
            attempt_count: attempts,
            next_retry_at: dead ? null : computeAttemptRetryAt(now, attempts).toISOString(),
            last_error: "lease expired (crashed run)",
          })
          .eq("id", row.id)
          .eq("status", "claimed");
        throwIf(updateError, "recover job claim");
        if (dead) deadLettered += 1;
        else recovered += 1;
      }
      return { recovered, deadLettered };
    },

    async getDueSources(now, limit, sourceId) {
      let query = client
        .from("benefit_sources")
        .select("*, cards!inner(issuer)")
        .eq("enabled", true)
        .neq("processing_state", "dead_letter")
        .lte("next_check_at", now.toISOString())
        .or(`next_retry_at.is.null,next_retry_at.lte.${now.toISOString()}`)
        .order("next_check_at", { ascending: true })
        .limit(limit);
      if (sourceId) query = query.eq("id", sourceId);
      const { data, error } = await query;
      throwIf(error, "get due sources");
      return (data ?? []).map((row) => {
        const { cards, ...source } = row as Record<string, unknown> & {
          cards: { issuer: string | null } | null;
        };
        return { ...(source as unknown as BenefitSourceRow), card_issuer: cards?.issuer ?? null };
      });
    },

    async getSource(sourceId) {
      const { data, error } = await client
        .from("benefit_sources")
        .select("*, cards!inner(issuer)")
        .eq("id", sourceId)
        .maybeSingle();
      throwIf(error, "get source");
      if (!data) return null;
      const { cards, ...source } = data as Record<string, unknown> & {
        cards: { issuer: string | null } | null;
      };
      return { ...(source as unknown as BenefitSourceRow), card_issuer: cards?.issuer ?? null };
    },

    async claimSourceForFetch(source, runId, now, leaseMinutes) {
      const { data, error } = await client
        .from("benefit_sources")
        .update({
          processing_state: "fetching",
          claimed_by_run_id: runId,
          claimed_at: now.toISOString(),
          lease_expires_at: leaseExpiry(now, leaseMinutes).toISOString(),
        })
        .eq("id", source.id)
        .eq("processing_state", "idle")
        .eq("next_check_at", source.next_check_at)
        .select("id");
      throwIf(error, "claim source");
      return (data?.length ?? 0) > 0;
    },

    async updateSource(sourceId, patch) {
      const { error } = await client.from("benefit_sources").update(patch).eq("id", sourceId);
      throwIf(error, "update source");
    },

    async getSnapshot(snapshotId) {
      const { data, error } = await client
        .from("source_snapshots")
        .select("*")
        .eq("id", snapshotId)
        .maybeSingle();
      throwIf(error, "get snapshot");
      return (data as SourceSnapshotRow | null) ?? null;
    },

    async getLatestOkExtractedSnapshot(sourceId) {
      const { data, error } = await client
        .from("source_snapshots")
        .select("*")
        .eq("source_id", sourceId)
        .eq("validation_status", "ok")
        .eq("extraction_outcome", "extracted")
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      throwIf(error, "get latest ok snapshot");
      return (data as SourceSnapshotRow | null) ?? null;
    },

    async insertSnapshot(row) {
      const { data, error } = await client
        .from("source_snapshots")
        .insert(row)
        .select("id")
        .single();
      throwIf(error, "insert snapshot");
      return data!.id as string;
    },

    async insertChunks(snapshotId, chunks) {
      if (chunks.length === 0) return;
      const { error } = await client.from("snapshot_chunks").insert(
        chunks.map((chunk) => ({ ...chunk, snapshot_id: snapshotId, status: "pending" })),
      );
      throwIf(error, "insert chunks");
    },

    async getChunks(snapshotId) {
      const { data, error } = await client
        .from("snapshot_chunks")
        .select("*")
        .eq("snapshot_id", snapshotId)
        .order("chunk_index", { ascending: true });
      throwIf(error, "get chunks");
      return (data ?? []) as SnapshotChunkRow[];
    },

    async updateChunk(chunkRowId, patch) {
      const { error } = await client.from("snapshot_chunks").update(patch).eq("id", chunkRowId);
      throwIf(error, "update chunk");
    },

    async updateSnapshot(snapshotId, patch) {
      const { error } = await client.from("source_snapshots").update(patch).eq("id", snapshotId);
      throwIf(error, "update snapshot");
    },

    async pruneSnapshots(sourceId, keepLatest) {
      // Only unchanged (never-extracted), unreferenced snapshots beyond the
      // newest N are ever pruned. Artifacts for changed/referenced snapshots
      // are permanent.
      const { data, error } = await client
        .from("source_snapshots")
        .select("id")
        .eq("source_id", sourceId)
        .eq("extraction_outcome", "not_required")
        .order("fetched_at", { ascending: false });
      throwIf(error, "prune: list snapshots");

      const candidates = (data ?? []).slice(keepLatest).map((row) => row.id as string);
      if (candidates.length === 0) return 0;

      const { data: referenced, error: refError } = await client
        .from("benefit_change_proposals")
        .select("snapshot_id")
        .in("snapshot_id", candidates);
      throwIf(refError, "prune: list references");

      const referencedIds = new Set((referenced ?? []).map((row) => row.snapshot_id as string));
      const deletable = candidates.filter((id) => !referencedIds.has(id));
      if (deletable.length === 0) return 0;

      const { error: deleteError } = await client
        .from("source_snapshots")
        .delete()
        .in("id", deletable);
      throwIf(deleteError, "prune: delete");
      return deletable.length;
    },

    async supersedeOlderJobs(sourceId, keepSnapshotId) {
      const { error } = await client
        .from("extraction_jobs")
        .update({ status: "superseded" })
        .eq("source_id", sourceId)
        .neq("snapshot_id", keepSnapshotId)
        .in("status", ["pending", "claimed", "failed"]);
      throwIf(error, "supersede older jobs");
    },

    async createExtractionJob(input) {
      const { error } = await client.from("extraction_jobs").insert({
        snapshot_id: input.snapshotId,
        source_id: input.sourceId,
        reason: input.reason,
        status: "pending",
      });
      if (error) {
        if (error.code === "23505") return "exists";
        throw new Error(`create extraction job: ${error.message}`);
      }
      return "created";
    },

    async getWorkableJobs(now, limit, sourceId) {
      let query = client
        .from("extraction_jobs")
        .select("*")
        .or(`status.eq.pending,and(status.eq.failed,next_retry_at.lte.${now.toISOString()})`)
        .order("created_at", { ascending: true })
        .limit(limit);
      if (sourceId) query = query.eq("source_id", sourceId);
      const { data, error } = await query;
      throwIf(error, "get workable jobs");
      return (data ?? []) as ExtractionJobRow[];
    },

    async claimJob(jobId, runId, now, leaseMinutes) {
      const { data, error } = await client
        .from("extraction_jobs")
        .update({
          status: "claimed",
          claimed_by_run_id: runId,
          claimed_at: now.toISOString(),
          lease_expires_at: leaseExpiry(now, leaseMinutes).toISOString(),
        })
        .eq("id", jobId)
        .in("status", ["pending", "failed"])
        .select("id");
      throwIf(error, "claim job");
      return (data?.length ?? 0) > 0;
    },

    async completeJob(jobId) {
      const { error } = await client
        .from("extraction_jobs")
        .update({
          status: "completed",
          claimed_by_run_id: null,
          claimed_at: null,
          lease_expires_at: null,
          last_error: null,
        })
        .eq("id", jobId);
      throwIf(error, "complete job");
    },

    async failJobAttempt(jobId, errorMessage, now, maxAttempts) {
      const { data, error } = await client
        .from("extraction_jobs")
        .select("attempt_count")
        .eq("id", jobId)
        .single();
      throwIf(error, "fail job: read attempts");

      const attempts = ((data?.attempt_count as number) ?? 0) + 1;
      const dead = shouldDeadLetter(attempts, maxAttempts);
      const { error: updateError } = await client
        .from("extraction_jobs")
        .update({
          status: dead ? "dead_letter" : "failed",
          claimed_by_run_id: null,
          claimed_at: null,
          lease_expires_at: null,
          attempt_count: attempts,
          next_retry_at: dead ? null : computeAttemptRetryAt(now, attempts).toISOString(),
          last_error: errorMessage.slice(0, 2000),
        })
        .eq("id", jobId);
      throwIf(updateError, "fail job: update");
      return dead ? "dead_letter" : "retry";
    },

    async getCardWithActiveBenefits(cardId) {
      const { data: card, error: cardError } = await client
        .from("cards")
        .select("id, display_name, card_code")
        .eq("id", cardId)
        .single();
      throwIf(cardError, "get card");

      const { data: benefits, error: benefitsError } = await client
        .from("benefits")
        .select(
          "id, card_id, benefit_code, benefit_name, benefit_value, cadence, reset_timing, enrollment_required, requires_setup, display_description, benefit_status, retired_at, source_url, track_in_memento, benefit_hash, content_version",
        )
        .eq("card_id", cardId)
        .eq("benefit_status", "active");
      throwIf(benefitsError, "get benefits");

      return {
        card: {
          id: card!.id as string,
          displayName: (card!.display_name as string | null) ?? null,
          cardCode: (card!.card_code as string | null) ?? null,
        },
        benefits: (benefits ?? []) as BenefitRowForReconcile[],
      };
    },

    async getLinkedBenefitIds(sourceId) {
      const { data, error } = await client
        .from("benefit_source_links")
        .select("benefit_id")
        .eq("source_id", sourceId);
      throwIf(error, "get linked benefits");
      return (data ?? []).map((row) => row.benefit_id as string);
    },

    async markBenefitsVerified(benefitIds, now) {
      if (benefitIds.length === 0) return;
      const { error } = await client
        .from("benefits")
        .update({ last_verified_at: now.toISOString() })
        .in("id", benefitIds);
      throwIf(error, "mark benefits verified");
    },

    async markSourceContentVerified(sourceId, now) {
      const { error } = await client
        .from("benefit_sources")
        .update({ last_content_verified_at: now.toISOString() })
        .eq("id", sourceId);
      throwIf(error, "mark source verified");
    },

    async insertProposal(input) {
      const row = draftToRow(input);

      // 1. Active row with the same dedupe key → corroboration bump.
      const { data: active, error: activeError } = await client
        .from("benefit_change_proposals")
        .select("id, seen_count")
        .eq("dedupe_key", row.dedupe_key)
        .in("status", ["needs_review", "approved"])
        .maybeSingle();
      throwIf(activeError, "insertProposal: find active");

      if (active) {
        const { error } = await client
          .from("benefit_change_proposals")
          .update({
            seen_count: (active.seen_count as number) + 1,
            last_seen_at: new Date().toISOString(),
          })
          .eq("id", active.id);
        throwIf(error, "insertProposal: bump seen_count");
        return { outcome: "deduped", proposalId: active.id as string };
      }

      // 2. Rejected row: immutable. Stronger evidence → new linked revision;
      //    weaker/equal → audited reobserved event only.
      const { data: rejected, error: rejectedError } = await client
        .from("benefit_change_proposals")
        .select("id, confidence, evidence_excerpt, source_id, revision")
        .eq("dedupe_key", row.dedupe_key)
        .eq("status", "rejected")
        .order("revision", { ascending: false })
        .limit(1)
        .maybeSingle();
      throwIf(rejectedError, "insertProposal: find rejected");

      if (rejected) {
        const strength = isStrongerEvidence(
          {
            confidence: Number(rejected.confidence),
            evidenceExcerpt: rejected.evidence_excerpt as string,
            sourceId: rejected.source_id as string,
          },
          {
            confidence: input.draft.confidence,
            evidenceExcerpt: input.draft.evidenceExcerpt,
            sourceId: input.sourceId,
          },
        );

        if (!strength.stronger) {
          await insertEvent(rejected.id as string, "reobserved", {
            run_id: input.runId,
            confidence: input.draft.confidence,
            source_id: input.sourceId,
          });
          return { outcome: "reobserved", proposalId: rejected.id as string };
        }

        const { data: inserted, error } = await client
          .from("benefit_change_proposals")
          .insert({
            ...row,
            revision: (rejected.revision as number) + 1,
            previous_proposal_id: rejected.id,
          })
          .select("id")
          .single();
        throwIf(error, "insertProposal: insert revision");
        await insertEvent(inserted!.id as string, "created", { run_id: input.runId });
        await insertEvent(rejected.id as string, "revision_created", {
          new_proposal_id: inserted!.id,
          reasons: strength.reasons,
        });
        return {
          outcome: "revision",
          proposalId: inserted!.id as string,
          previousProposalId: rejected.id as string,
        };
      }

      // 3. Plain insert. A concurrent duplicate is caught by the unique index.
      const { data: inserted, error } = await client
        .from("benefit_change_proposals")
        .insert(row)
        .select("id")
        .single();
      if (error) {
        if (error.code === "23505") {
          const { data: winner } = await client
            .from("benefit_change_proposals")
            .select("id")
            .eq("dedupe_key", row.dedupe_key)
            .in("status", ["needs_review", "approved"])
            .maybeSingle();
          return { outcome: "deduped", proposalId: (winner?.id as string) ?? "unknown" };
        }
        throw new Error(`insertProposal: ${error.message}`);
      }
      await insertEvent(inserted!.id as string, "created", { run_id: input.runId });
      return { outcome: "inserted", proposalId: inserted!.id as string };
    },
  };
}
