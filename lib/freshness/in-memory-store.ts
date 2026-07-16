import { randomUUID } from "node:crypto";

import type {
  BenefitRowForReconcile,
  BenefitSourceRow,
  ExtractionJobRow,
  SnapshotChunkRow,
  SourceSnapshotRow,
} from "@/lib/types/freshness-schema";
import { BENEFIT_VERSIONED_FIELDS, BENEFIT_SNAPSHOT_KEYS } from "@/lib/benefits/benefit-fields";
import { computeAttemptRetryAt, leaseExpiry, shouldDeadLetter } from "@/lib/freshness/leases";
import { isStrongerEvidence } from "@/lib/freshness/evidence-strength";
import type {
  ChunkPatch,
  FreshnessStore,
  NewChunk,
  NewProposalInput,
  NewSnapshot,
  ProposalInsertOutcome,
  RunFinishPatch,
  SnapshotPatch,
  SourceFetchPatch,
} from "@/lib/freshness/store";

/**
 * In-memory FreshnessStore for the e2e suite: real dedupe-window semantics,
 * lease/attempt bookkeeping, a content_version "trigger", and a faithful
 * mirror of the publish/rollback/scheduled-sweep RPC semantics (the SQL itself
 * is covered by pgTAP; this mirror lets the orchestrator suite run with no
 * database).
 */

interface MemoryRun {
  id: string;
  trigger: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  patch: RunFinishPatch | null;
}

export interface MemoryBenefit extends BenefitRowForReconcile {
  last_verified_at: string | null;
}

export interface MemoryProposal {
  id: string;
  run_id: string;
  source_id: string;
  snapshot_id: string;
  card_id: string;
  benefit_id: string | null;
  source_url: string;
  source_authority_level: "official" | "secondary";
  investigation_only: boolean;
  publish_block_reason: string | null;
  operation: "add" | "modify" | "expire" | "remove";
  before_value: Record<string, unknown> | null;
  after_value: Record<string, unknown> | null;
  field_diff: unknown;
  before_version: number | null;
  effective_date: string | null;
  evidence_excerpt: string;
  evidence_chunk_id: string | null;
  evidence_offset: number | null;
  confidence: number;
  explanation: string;
  extractor_version: string;
  extraction_model: string | null;
  removal_gate: { version: number; passed: boolean } | null;
  status: string;
  dedupe_key: string;
  seen_count: number;
  last_seen_at: string;
  revision: number;
  previous_proposal_id: string | null;
  reviewer_email: string | null;
  edited_after_value: Record<string, unknown> | null;
  published_at: string | null;
  published_history_id: string | null;
  published_version: number | null;
  rolled_back_at: string | null;
  created_at: string;
}

export interface MemoryEvent {
  proposal_id: string;
  event_type: string;
  actor: string;
  detail: Record<string, unknown> | null;
}

export interface MemoryHistoryRow {
  id: string;
  benefit_id: string;
  change_type: string;
  change_summary: string;
  content_version: number | null;
  snapshot: Record<string, unknown>;
}

const ACCEPTED_GATE_VERSIONS = [1];
const ALLOWED_AFTER_KEYS = new Set<string>(BENEFIT_SNAPSHOT_KEYS);

const normalizeWs = (value: string) => value.replace(/\s+/g, " ").trim();

/** Mirrors PostgREST behavior: undefined patch values are dropped, not written. */
const assignDefined = <T extends object>(target: T, patch: Record<string, unknown>) => {
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      (target as Record<string, unknown>)[key] = value;
    }
  }
};

export class InMemoryFreshnessStore implements FreshnessStore {
  runs = new Map<string, MemoryRun>();
  sources = new Map<string, BenefitSourceRow>();
  snapshots = new Map<string, SourceSnapshotRow>();
  chunks = new Map<string, SnapshotChunkRow>();
  jobs = new Map<string, ExtractionJobRow>();
  cards = new Map<string, { id: string; displayName: string | null; cardCode: string | null }>();
  benefits = new Map<string, MemoryBenefit>();
  links: Array<{ benefit_id: string; source_id: string; is_primary: boolean }> = [];
  proposals = new Map<string, MemoryProposal>();
  events: MemoryEvent[] = [];
  history: MemoryHistoryRow[] = [];

  private nowIso = () => new Date().toISOString();

  /* ----------------------------- seeding helpers ---------------------------- */

  seedCard(card: { id: string; displayName: string | null; cardCode: string | null }) {
    this.cards.set(card.id, card);
  }

  seedBenefit(benefit: MemoryBenefit) {
    this.benefits.set(benefit.id, { ...benefit });
  }

  seedSource(source: BenefitSourceRow & { card_issuer?: string | null }) {
    const { card_issuer, ...row } = source;
    this.sources.set(source.id, { ...(row as BenefitSourceRow) });
    this.sourceIssuers.set(source.id, card_issuer ?? "amex");
  }

  private sourceIssuers = new Map<string, string | null>();

  seedLink(benefitId: string, sourceId: string, isPrimary = true) {
    this.links.push({ benefit_id: benefitId, source_id: sourceId, is_primary: isPrimary });
  }

  /** Mirrors the benefits content_version trigger. */
  private applyBenefitFields(benefit: MemoryBenefit, fields: Record<string, unknown>) {
    let changed = false;
    const target = benefit as unknown as Record<string, unknown>;
    for (const field of BENEFIT_VERSIONED_FIELDS) {
      if (field in fields) {
        const next = fields[field];
        const current = target[field] ?? null;
        if ((next ?? null) !== current) {
          target[field] = next ?? null;
          changed = true;
        }
      }
    }
    if (changed) {
      benefit.content_version = (benefit.content_version ?? 1) + 1;
    }
    return changed;
  }

  /** Direct catalog edit (simulates the importer / manual SQL). */
  updateBenefitDirectly(benefitId: string, fields: Record<string, unknown>) {
    const benefit = this.benefits.get(benefitId);
    if (!benefit) throw new Error(`no benefit ${benefitId}`);
    this.applyBenefitFields(benefit, fields);
  }

  /* ------------------------------- runs ------------------------------------ */

  async createRun(run: { id: string; trigger: "cron" | "manual" | "single_source" }) {
    this.runs.set(run.id, {
      id: run.id,
      trigger: run.trigger,
      status: "running",
      started_at: this.nowIso(),
      finished_at: null,
      patch: null,
    });
  }

  async finishRun(runId: string, patch: RunFinishPatch) {
    const run = this.runs.get(runId);
    if (!run) throw new Error(`no run ${runId}`);
    run.status = patch.status;
    run.finished_at = this.nowIso();
    run.patch = patch;
  }

  async reconcileStaleRuns(now: Date, timeBudgetMs: number) {
    let count = 0;
    for (const run of this.runs.values()) {
      if (
        run.status === "running" &&
        now.getTime() - new Date(run.started_at).getTime() > 2 * timeBudgetMs
      ) {
        run.status = "failed";
        run.finished_at = now.toISOString();
        count += 1;
      }
    }
    return count;
  }

  /* --------------------------- crash recovery ------------------------------- */

  async recoverExpiredSourceClaims(now: Date, maxAttempts: number) {
    let recovered = 0;
    let deadLettered = 0;
    for (const source of this.sources.values()) {
      if (
        source.processing_state === "fetching" &&
        source.lease_expires_at &&
        new Date(source.lease_expires_at).getTime() < now.getTime()
      ) {
        const attempts = source.attempt_count + 1;
        source.attempt_count = attempts;
        source.claimed_by_run_id = null;
        source.claimed_at = null;
        source.lease_expires_at = null;
        if (shouldDeadLetter(attempts, maxAttempts)) {
          source.processing_state = "dead_letter";
          deadLettered += 1;
        } else {
          source.processing_state = "idle";
          source.next_retry_at = computeAttemptRetryAt(now, attempts).toISOString();
          recovered += 1;
        }
      }
    }
    return { recovered, deadLettered };
  }

  async recoverExpiredJobClaims(now: Date, maxAttempts: number) {
    let recovered = 0;
    let deadLettered = 0;
    for (const job of this.jobs.values()) {
      if (
        job.status === "claimed" &&
        job.lease_expires_at &&
        new Date(job.lease_expires_at).getTime() < now.getTime()
      ) {
        const attempts = job.attempt_count + 1;
        job.attempt_count = attempts;
        job.claimed_by_run_id = null;
        job.claimed_at = null;
        job.lease_expires_at = null;
        if (shouldDeadLetter(attempts, maxAttempts)) {
          job.status = "dead_letter";
          deadLettered += 1;
        } else {
          job.status = "failed";
          job.next_retry_at = computeAttemptRetryAt(now, attempts).toISOString();
          job.last_error = "lease expired (crashed run)";
          recovered += 1;
        }
      }
    }
    return { recovered, deadLettered };
  }

  /* ------------------------------- sources ---------------------------------- */

  async getDueSources(now: Date, limit: number, sourceId?: string) {
    return [...this.sources.values()]
      .filter(
        (source) =>
          source.enabled &&
          source.processing_state !== "dead_letter" &&
          new Date(source.next_check_at).getTime() <= now.getTime() &&
          (!source.next_retry_at || new Date(source.next_retry_at).getTime() <= now.getTime()) &&
          (!sourceId || source.id === sourceId),
      )
      .sort((a, b) => a.next_check_at.localeCompare(b.next_check_at))
      .slice(0, limit)
      .map((source) => ({ ...source, card_issuer: this.sourceIssuers.get(source.id) ?? null }));
  }

  async getSource(sourceId: string) {
    const source = this.sources.get(sourceId);
    if (!source) return null;
    return { ...source, card_issuer: this.sourceIssuers.get(sourceId) ?? null };
  }

  async getSnapshot(snapshotId: string) {
    const snapshot = this.snapshots.get(snapshotId);
    return snapshot ? { ...snapshot } : null;
  }

  async claimSourceForFetch(
    source: BenefitSourceRow,
    runId: string,
    now: Date,
    leaseMinutes: number,
  ) {
    const live = this.sources.get(source.id);
    if (!live) return false;
    if (live.processing_state !== "idle" || live.next_check_at !== source.next_check_at) {
      return false;
    }
    live.processing_state = "fetching";
    live.claimed_by_run_id = runId;
    live.claimed_at = now.toISOString();
    live.lease_expires_at = leaseExpiry(now, leaseMinutes).toISOString();
    return true;
  }

  async updateSource(sourceId: string, patch: SourceFetchPatch) {
    const source = this.sources.get(sourceId);
    if (!source) throw new Error(`no source ${sourceId}`);
    assignDefined(source, patch as Record<string, unknown>);
  }

  /* --------------------------- snapshots & chunks ---------------------------- */

  async getLatestOkExtractedSnapshot(sourceId: string) {
    const candidates = [...this.snapshots.values()]
      .filter(
        (snapshot) =>
          snapshot.source_id === sourceId &&
          snapshot.validation_status === "ok" &&
          snapshot.extraction_outcome === "extracted",
      )
      .sort((a, b) => b.fetched_at.localeCompare(a.fetched_at));
    return candidates[0] ? { ...candidates[0] } : null;
  }

  async insertSnapshot(row: NewSnapshot) {
    const id = randomUUID();
    this.snapshots.set(id, {
      id,
      ...row,
      extraction_model: null,
      input_tokens: null,
      output_tokens: null,
      cache_read_tokens: null,
      extraction_error: null,
      fetched_at: this.nowIso(),
      created_at: this.nowIso(),
    });
    return id;
  }

  async insertChunks(snapshotId: string, chunks: NewChunk[]) {
    for (const chunk of chunks) {
      const id = randomUUID();
      this.chunks.set(id, {
        id,
        snapshot_id: snapshotId,
        ...chunk,
        status: "pending",
        attempts: 0,
        model: null,
        input_tokens: null,
        output_tokens: null,
        cache_read_tokens: null,
        last_error: null,
        result: null,
        created_at: this.nowIso(),
        updated_at: this.nowIso(),
      });
    }
  }

  async getChunks(snapshotId: string) {
    return [...this.chunks.values()]
      .filter((chunk) => chunk.snapshot_id === snapshotId)
      .sort((a, b) => a.chunk_index - b.chunk_index)
      .map((chunk) => ({ ...chunk }));
  }

  async updateChunk(chunkRowId: string, patch: ChunkPatch) {
    const chunk = this.chunks.get(chunkRowId);
    if (!chunk) throw new Error(`no chunk ${chunkRowId}`);
    assignDefined(chunk, patch as Record<string, unknown>);
    chunk.updated_at = this.nowIso();
  }

  async updateSnapshot(snapshotId: string, patch: SnapshotPatch) {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) throw new Error(`no snapshot ${snapshotId}`);
    assignDefined(snapshot, patch as Record<string, unknown>);
  }

  async pruneSnapshots(sourceId: string, keepLatest: number) {
    const referenced = new Set([...this.proposals.values()].map((p) => p.snapshot_id));
    const candidates = [...this.snapshots.values()]
      .filter(
        (snapshot) =>
          snapshot.source_id === sourceId && snapshot.extraction_outcome === "not_required",
      )
      .sort((a, b) => b.fetched_at.localeCompare(a.fetched_at))
      .slice(keepLatest)
      .filter((snapshot) => !referenced.has(snapshot.id));
    for (const snapshot of candidates) {
      this.snapshots.delete(snapshot.id);
    }
    return candidates.length;
  }

  /* ------------------------------ extraction jobs ---------------------------- */

  async supersedeOlderJobs(sourceId: string, keepSnapshotId: string) {
    for (const job of this.jobs.values()) {
      if (
        job.source_id === sourceId &&
        job.snapshot_id !== keepSnapshotId &&
        ["pending", "claimed", "failed"].includes(job.status)
      ) {
        job.status = "superseded";
      }
    }
  }

  async createExtractionJob(input: {
    snapshotId: string;
    sourceId: string;
    reason: "content_changed" | "monthly_verification" | "manual_retry";
  }) {
    const active = [...this.jobs.values()].some(
      (job) => job.snapshot_id === input.snapshotId && ["pending", "claimed"].includes(job.status),
    );
    if (active) return "exists" as const;
    const id = randomUUID();
    this.jobs.set(id, {
      id,
      snapshot_id: input.snapshotId,
      source_id: input.sourceId,
      status: "pending",
      reason: input.reason,
      claimed_by_run_id: null,
      claimed_at: null,
      lease_expires_at: null,
      attempt_count: 0,
      next_retry_at: null,
      last_error: null,
      created_at: this.nowIso(),
      updated_at: this.nowIso(),
    });
    return "created" as const;
  }

  async getWorkableJobs(now: Date, limit: number, sourceId?: string) {
    return [...this.jobs.values()]
      .filter(
        (job) =>
          (job.status === "pending" ||
            (job.status === "failed" &&
              job.next_retry_at &&
              new Date(job.next_retry_at).getTime() <= now.getTime())) &&
          (!sourceId || job.source_id === sourceId),
      )
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .slice(0, limit)
      .map((job) => ({ ...job }));
  }

  async claimJob(jobId: string, runId: string, now: Date, leaseMinutes: number) {
    const job = this.jobs.get(jobId);
    if (!job || !["pending", "failed"].includes(job.status)) return false;
    job.status = "claimed";
    job.claimed_by_run_id = runId;
    job.claimed_at = now.toISOString();
    job.lease_expires_at = leaseExpiry(now, leaseMinutes).toISOString();
    return true;
  }

  async completeJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`no job ${jobId}`);
    job.status = "completed";
    job.claimed_by_run_id = null;
    job.claimed_at = null;
    job.lease_expires_at = null;
    job.last_error = null;
  }

  async failJobAttempt(jobId: string, error: string, now: Date, maxAttempts: number) {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`no job ${jobId}`);
    const attempts = job.attempt_count + 1;
    job.attempt_count = attempts;
    job.claimed_by_run_id = null;
    job.claimed_at = null;
    job.lease_expires_at = null;
    job.last_error = error;
    if (shouldDeadLetter(attempts, maxAttempts)) {
      job.status = "dead_letter";
      job.next_retry_at = null;
      return "dead_letter" as const;
    }
    job.status = "failed";
    job.next_retry_at = computeAttemptRetryAt(now, attempts).toISOString();
    return "retry" as const;
  }

  /* -------------------------------- catalog ---------------------------------- */

  async getCardWithActiveBenefits(cardId: string) {
    const card = this.cards.get(cardId);
    if (!card) throw new Error(`no card ${cardId}`);
    const benefits = [...this.benefits.values()]
      .filter((benefit) => benefit.card_id === cardId && benefit.benefit_status === "active")
      .map((benefit) => ({ ...benefit }));
    return { card: { ...card }, benefits };
  }

  async getLinkedBenefitIds(sourceId: string) {
    return this.links.filter((link) => link.source_id === sourceId).map((link) => link.benefit_id);
  }

  async markBenefitsVerified(benefitIds: string[], now: Date) {
    for (const id of benefitIds) {
      const benefit = this.benefits.get(id);
      if (benefit) benefit.last_verified_at = now.toISOString();
    }
  }

  async markSourceContentVerified(sourceId: string, now: Date) {
    const source = this.sources.get(sourceId);
    if (source) source.last_content_verified_at = now.toISOString();
  }

  /* ------------------------------- proposals ---------------------------------- */

  private addEvent(proposalId: string, eventType: string, detail: Record<string, unknown> | null) {
    this.events.push({ proposal_id: proposalId, event_type: eventType, actor: "system", detail });
  }

  async insertProposal(input: NewProposalInput): Promise<ProposalInsertOutcome> {
    const { draft } = input;

    const active = [...this.proposals.values()].find(
      (p) => p.dedupe_key === draft.dedupeKey && ["needs_review", "approved"].includes(p.status),
    );
    if (active) {
      active.seen_count += 1;
      active.last_seen_at = this.nowIso();
      return { outcome: "deduped", proposalId: active.id };
    }

    const rejected = [...this.proposals.values()]
      .filter((p) => p.dedupe_key === draft.dedupeKey && p.status === "rejected")
      .sort((a, b) => b.revision - a.revision)[0];

    if (rejected) {
      const strength = isStrongerEvidence(
        {
          confidence: rejected.confidence,
          evidenceExcerpt: rejected.evidence_excerpt,
          sourceId: rejected.source_id,
        },
        {
          confidence: draft.confidence,
          evidenceExcerpt: draft.evidenceExcerpt,
          sourceId: input.sourceId,
        },
      );
      if (!strength.stronger) {
        this.addEvent(rejected.id, "reobserved", { run_id: input.runId });
        return { outcome: "reobserved", proposalId: rejected.id };
      }
      const id = this.storeProposal(input, rejected.revision + 1, rejected.id);
      this.addEvent(id, "created", { run_id: input.runId });
      this.addEvent(rejected.id, "revision_created", {
        new_proposal_id: id,
        reasons: strength.reasons,
      });
      return { outcome: "revision", proposalId: id, previousProposalId: rejected.id };
    }

    const id = this.storeProposal(input, 1, null);
    this.addEvent(id, "created", { run_id: input.runId });
    return { outcome: "inserted", proposalId: id };
  }

  private storeProposal(
    input: NewProposalInput,
    revision: number,
    previousProposalId: string | null,
  ): string {
    const { draft } = input;
    const id = randomUUID();
    this.proposals.set(id, {
      id,
      run_id: input.runId,
      source_id: input.sourceId,
      snapshot_id: input.snapshotId,
      card_id: input.cardId,
      benefit_id: draft.benefitId,
      source_url: input.sourceUrl,
      source_authority_level: input.sourceAuthorityLevel,
      investigation_only: draft.investigationOnly,
      publish_block_reason: draft.publishBlockReason,
      operation: draft.operation,
      before_value: draft.beforeValue as Record<string, unknown> | null,
      after_value: draft.afterValue as Record<string, unknown> | null,
      field_diff: draft.fieldDiff,
      before_version: draft.beforeVersion,
      effective_date: draft.effectiveDate,
      evidence_excerpt: draft.evidenceExcerpt,
      evidence_chunk_id: draft.evidenceChunkId,
      evidence_offset: draft.evidenceOffset,
      confidence: draft.confidence,
      explanation: draft.explanation,
      extractor_version: draft.extractorVersion,
      extraction_model: draft.extractionModel,
      removal_gate: draft.removalGate,
      status: "needs_review",
      dedupe_key: draft.dedupeKey,
      seen_count: 1,
      last_seen_at: this.nowIso(),
      revision,
      previous_proposal_id: previousProposalId,
      reviewer_email: null,
      edited_after_value: null,
      published_at: null,
      published_history_id: null,
      published_version: null,
      rolled_back_at: null,
      created_at: this.nowIso(),
    });
    return id;
  }

  /* ---------------- publish/rollback mirror of the SQL RPCs ------------------- */

  approveProposal(proposalId: string, reviewer: string) {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error(`no proposal ${proposalId}`);
    proposal.status = "approved";
    proposal.reviewer_email = reviewer;
    this.addEvent(proposalId, "status_changed", { to: "approved", actor: reviewer });
  }

  rejectProposal(proposalId: string, reviewer: string) {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error(`no proposal ${proposalId}`);
    proposal.status = "rejected";
    proposal.reviewer_email = reviewer;
    this.addEvent(proposalId, "status_changed", { to: "rejected", actor: reviewer });
  }

  publishProposal(
    proposalId: string,
    reviewer: string,
    today = new Date(),
  ): { status: string; reason?: string } {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return { status: "blocked", reason: "proposal_not_found" };
    if (proposal.status === "published") return { status: "noop" };

    const blocked = (reason: string) => {
      this.addEvent(proposalId, "publish_blocked", { reason });
      return { status: "blocked", reason };
    };

    if (proposal.status !== "approved") return blocked("not_approved");
    if (proposal.investigation_only) return blocked("investigation_only");
    if (proposal.publish_block_reason) {
      return blocked(`publish_block_reason:${proposal.publish_block_reason}`);
    }

    if (proposal.effective_date) {
      const todayStr = today.toISOString().slice(0, 10);
      if (proposal.effective_date > todayStr) return { status: "scheduled" };
    }

    const source = this.sources.get(proposal.source_id);
    if (!source) return blocked("source_missing");
    if (source.authority_level !== "official") return blocked("source_not_official");
    if (source.card_id !== proposal.card_id) return blocked("source_card_mismatch");

    const snapshot = this.snapshots.get(proposal.snapshot_id);
    if (!snapshot) return blocked("snapshot_missing");
    if (snapshot.validation_status !== "ok") return blocked("snapshot_suspect");
    if (snapshot.truncated) return blocked("snapshot_truncated");
    if (snapshot.extraction_outcome !== "extracted") return blocked("snapshot_not_fully_extracted");
    if (!snapshot.artifact_path) return blocked("artifact_missing");

    const needle = normalizeWs(proposal.evidence_excerpt);
    if (proposal.evidence_chunk_id) {
      const chunk = [...this.chunks.values()].find(
        (c) => c.snapshot_id === proposal.snapshot_id && c.chunk_id === proposal.evidence_chunk_id,
      );
      if (!chunk) return blocked("evidence_chunk_missing");
      if (!normalizeWs(chunk.chunk_text).includes(needle)) return blocked("evidence_not_in_chunk");
    } else if (!normalizeWs(snapshot.extracted_text ?? "").includes(needle)) {
      return blocked("evidence_not_in_snapshot");
    }

    let benefit: MemoryBenefit | undefined;
    if (["modify", "expire", "remove"].includes(proposal.operation)) {
      if (!proposal.benefit_id) return blocked("benefit_id_missing");
      benefit = this.benefits.get(proposal.benefit_id);
      if (!benefit) return blocked("benefit_missing");
      if (benefit.card_id !== proposal.card_id) return blocked("benefit_card_mismatch");
      const linked = this.links.some(
        (link) => link.benefit_id === proposal.benefit_id && link.source_id === proposal.source_id,
      );
      if (!linked) return blocked("source_benefit_link_missing");
    }

    if (["expire", "remove"].includes(proposal.operation)) {
      if (!proposal.removal_gate) return blocked("removal_gate_missing");
      if (!proposal.removal_gate.passed) return blocked("removal_gate_not_passed");
      if (!ACCEPTED_GATE_VERSIONS.includes(proposal.removal_gate.version)) {
        return blocked("removal_gate_version_not_accepted");
      }
      if (proposal.confidence < 0.7) return blocked("confidence_below_removal_threshold");
    }

    let after: Record<string, unknown> | null = null;
    if (["add", "modify"].includes(proposal.operation)) {
      after = proposal.edited_after_value ?? proposal.after_value;
      if (!after) return blocked("after_value_missing");
      for (const key of Object.keys(after)) {
        if (!ALLOWED_AFTER_KEYS.has(key)) return blocked("after_value_unknown_key");
      }
      if (proposal.operation === "add") {
        if (!after.benefit_code) return blocked("benefit_code_missing");
        if (!after.benefit_name) return blocked("benefit_name_missing");
        if (!after.benefit_value) return blocked("benefit_value_missing");
        if (!after.cadence) return blocked("cadence_missing");
        const conflict = [...this.benefits.values()].some(
          (b) => b.benefit_code === after!.benefit_code,
        );
        if (conflict) return blocked("benefit_code_conflict");
      }
    }

    // Concurrency CAS.
    if (benefit && (benefit.content_version ?? 1) !== proposal.before_version) {
      proposal.status = "superseded";
      this.addEvent(proposalId, "superseded", {
        reason: "content_version_drift",
        expected_version: proposal.before_version,
        actual_version: benefit.content_version,
      });
      return { status: "superseded", reason: "content_version_drift" };
    }

    let benefitId: string;
    let changeType: string;
    if (proposal.operation === "add") {
      benefitId = randomUUID();
      this.benefits.set(benefitId, {
        id: benefitId,
        card_id: proposal.card_id,
        benefit_code: (after!.benefit_code as string) ?? null,
        benefit_name: (after!.benefit_name as string) ?? null,
        benefit_value: (after!.benefit_value as string) ?? null,
        cadence: (after!.cadence as string) ?? null,
        reset_timing: (after!.reset_timing as string) ?? null,
        enrollment_required: (after!.enrollment_required as boolean) ?? false,
        requires_setup: (after!.requires_setup as boolean) ?? false,
        display_description: (after!.display_description as string) ?? null,
        benefit_status: "active",
        retired_at: null,
        source_url: (after!.source_url as string) ?? proposal.source_url,
        track_in_memento: (after!.track_in_memento as string) ?? "later",
        benefit_hash: "in-memory-hash",
        content_version: 1,
        last_verified_at: this.nowIso(),
      });
      this.links.push({ benefit_id: benefitId, source_id: proposal.source_id, is_primary: true });
      changeType = "created";
    } else if (proposal.operation === "modify") {
      benefitId = benefit!.id;
      this.applyBenefitFields(benefit!, after!);
      benefit!.last_verified_at = this.nowIso();
      changeType = "updated";
    } else {
      benefitId = benefit!.id;
      this.applyBenefitFields(benefit!, {
        benefit_status: "retired",
        retired_at: this.nowIso(),
      });
      benefit!.last_verified_at = this.nowIso();
      changeType = "retired";
    }

    const published = this.benefits.get(benefitId)!;
    const historyId = randomUUID();
    this.history.push({
      id: historyId,
      benefit_id: benefitId,
      change_type: changeType,
      change_summary: `freshness publish ${proposalId}: ${proposal.explanation}`,
      content_version: published.content_version,
      snapshot: { ...published },
    });

    proposal.status = "published";
    proposal.published_at = this.nowIso();
    proposal.published_history_id = historyId;
    proposal.published_version = published.content_version;
    proposal.reviewer_email = reviewer;
    this.addEvent(proposalId, "published", {
      history_id: historyId,
      benefit_id: benefitId,
      published_version: published.content_version,
    });

    return { status: "published" };
  }

  rollbackProposal(proposalId: string, reviewer: string): { status: string; reason?: string } {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return { status: "blocked", reason: "proposal_not_found" };
    if (proposal.status === "rolled_back") return { status: "noop" };

    const blocked = (reason: string) => {
      this.addEvent(proposalId, "publish_blocked", { action: "rollback", reason });
      return { status: "blocked", reason };
    };

    if (proposal.status !== "published") return blocked("not_published");

    const benefitId =
      proposal.benefit_id ??
      this.history.find((h) => h.id === proposal.published_history_id)?.benefit_id;
    const benefit = benefitId ? this.benefits.get(benefitId) : undefined;
    if (!benefit) return blocked("benefit_missing");
    if ((benefit.content_version ?? 1) !== proposal.published_version) {
      return blocked("benefit_changed_since_publish");
    }

    let changeType: string;
    if (proposal.operation === "add" || !proposal.before_value) {
      this.applyBenefitFields(benefit, { benefit_status: "retired", retired_at: this.nowIso() });
      changeType = "retired";
    } else {
      const restore: Record<string, unknown> = {};
      for (const field of BENEFIT_VERSIONED_FIELDS) {
        restore[field] = proposal.before_value[field] ?? null;
      }
      this.applyBenefitFields(benefit, restore);
      benefit.benefit_hash = (proposal.before_value.benefit_hash as string) ?? benefit.benefit_hash;
      changeType = "updated";
    }

    const historyId = randomUUID();
    this.history.push({
      id: historyId,
      benefit_id: benefit.id,
      change_type: changeType,
      change_summary: `rollback of proposal ${proposalId}`,
      content_version: benefit.content_version,
      snapshot: { ...benefit },
    });

    proposal.status = "rolled_back";
    proposal.rolled_back_at = this.nowIso();
    this.addEvent(proposalId, "rolled_back", { history_id: historyId, actor: reviewer });
    return { status: "rolled_back" };
  }

  publishDueScheduled(today = new Date()): { published: number; failed: number; skipped: number } {
    const todayStr = today.toISOString().slice(0, 10);
    let published = 0;
    let failed = 0;
    let skipped = 0;
    for (const proposal of [...this.proposals.values()]) {
      if (
        proposal.status !== "approved" ||
        !proposal.effective_date ||
        proposal.effective_date > todayStr
      ) {
        continue;
      }
      const result = this.publishProposal(proposal.id, "system:scheduled", today);
      if (result.status === "published") published += 1;
      else if (result.status === "noop") skipped += 1;
      else failed += 1;
    }
    return { published, failed, skipped };
  }
}
