import type { ModelConfig, MonitorLimits } from "@/lib/freshness/constants";
import {
  CHUNK_MAX_CHARS,
  CHUNK_OVERLAP_CHARS,
  ESCALATION_CONFIDENCE_THRESHOLD,
  EXTRACTOR_VERSION,
  MAX_EXTRACTED_TEXT_CHARS,
} from "@/lib/freshness/constants";
import type { CostRates } from "@/lib/freshness/constants";
import type { RunTrigger } from "@/lib/constants/freshness-schema";
import type { ExtractionJobRow, SnapshotChunkRow } from "@/lib/types/freshness-schema";
import type { ArtifactStore } from "@/lib/freshness/artifacts";
import { extensionForContent } from "@/lib/freshness/artifacts";
import type { AlertSender } from "@/lib/freshness/alerts";
import { getAllowedHostsForIssuer } from "@/lib/freshness/allowlist";
import { chunkDocument } from "@/lib/freshness/chunking";
import { validateContent } from "@/lib/freshness/content-validation";
import { estimateCostUsd } from "@/lib/freshness/cost";
import type { PdfExtractor } from "@/lib/freshness/extract-pdf-text";
import { assemblePdfDocument, extractPdfText } from "@/lib/freshness/extract-pdf-text";
import type { ExtractionProvider } from "@/lib/freshness/extraction-provider";
import type { ExtractedCandidate } from "@/lib/freshness/extraction-schema";
import { validateExtractionOutput } from "@/lib/freshness/extraction-schema";
import { extractHtmlText } from "@/lib/freshness/html-content";
import { fetchSource } from "@/lib/freshness/fetch-source";
import { sha256Hex } from "@/lib/freshness/hashing";
import { evaluateMassChangeGuard } from "@/lib/freshness/mass-change-guard";
import {
  flagEscalationChunks,
  reconcileExtraction,
  type ChunkCandidate,
} from "@/lib/freshness/reconcile";
import { computeNextCheckAt, computeRetryAt, isMonthlyVerificationDue } from "@/lib/freshness/scheduling";
import type { DueSource, FreshnessStore, RunCounters } from "@/lib/freshness/store";
import { emptyRunCounters } from "@/lib/freshness/store";
import type { ModelValidationResult } from "@/lib/freshness/validate-model-config";
import { validateModelConfig } from "@/lib/freshness/validate-model-config";

/**
 * The monitor orchestrator. Every dependency is injected so the e2e suite runs
 * it with in-memory stores, a scripted fetch, a fake extraction provider, and
 * a fixed clock. Safety recap:
 *  - scheduled publication runs FIRST, isolated — a monitoring failure can
 *    never block approved effective-dated changes (and vice versa);
 *  - retrieval/parse/soft-block failures only ever set failure/suspect state;
 *  - extraction is chunked with persistent per-chunk state; partial documents
 *    verify nothing and stay retryable;
 *  - the mass-change guard halts before any proposal insert;
 *  - runs are overlap-safe (leases/CAS) and rerun-safe (dedupe keys).
 */

export interface MonitorLogger {
  info(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export interface MonitorDeps {
  store: FreshnessStore;
  artifactStore: ArtifactStore;
  fetchImpl: typeof fetch;
  extractionProvider: ExtractionProvider | null;
  publishDueScheduled: () => Promise<{ published: number; failed: number; skipped: number }>;
  pdfExtractor?: PdfExtractor;
  clock: () => Date;
  limits: MonitorLimits;
  modelConfig: ModelConfig;
  costRates: CostRates;
  validateModels?: (config: ModelConfig) => Promise<ModelValidationResult>;
  logger: MonitorLogger;
  sendAlert: AlertSender;
}

export interface RunSummary extends RunCounters {
  runId: string;
  trigger: RunTrigger;
  status: "completed" | "halted" | "failed";
  haltedReason: string | null;
  error: string | null;
  modelConfigErrors: string[];
  estimatedCostUsd: number | null;
}

export interface RunOptions {
  /** Restrict the run to a single source (admin "Run now"). */
  sourceId?: string;
}

const SNAPSHOT_KEEP_LATEST = 5;

export async function runMonitorSources(
  runId: string,
  trigger: RunTrigger,
  deps: MonitorDeps,
  options: RunOptions = {},
): Promise<RunSummary> {
  const { store, limits, logger } = deps;
  const counters: CountersWithHalt = emptyRunCounters();
  const startedMs = deps.clock().getTime();
  const deadlineMs = startedMs + limits.timeBudgetMs;
  const phaseADeadlineMs = startedMs + Math.floor(limits.timeBudgetMs * 0.6);

  let status: RunSummary["status"] = "completed";
  let haltedReason: string | null = null;
  let runError: string | null = null;
  const modelConfigErrors: string[] = [];

  await store.createRun({ id: runId, trigger });
  logger.info("freshness run started", { runId, trigger, sourceId: options.sourceId ?? null });

  try {
    // ---- 0. Scheduled publication — FIRST and isolated ----------------------
    try {
      const sweep = await deps.publishDueScheduled();
      counters.scheduled_published = sweep.published;
      counters.scheduled_failed = sweep.failed;
      logger.info("scheduled publish sweep", { runId, ...sweep });
    } catch (error) {
      counters.scheduled_failed += 1;
      logger.error("scheduled publish sweep failed", {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // ---- 1. Crash recovery ---------------------------------------------------
    const staleRuns = await store.reconcileStaleRuns(deps.clock(), limits.timeBudgetMs);
    const sourceRecovery = await store.recoverExpiredSourceClaims(deps.clock(), limits.maxAttempts);
    const jobRecovery = await store.recoverExpiredJobClaims(deps.clock(), limits.maxAttempts);
    counters.leases_recovered = sourceRecovery.recovered + jobRecovery.recovered;
    counters.dead_lettered = sourceRecovery.deadLettered + jobRecovery.deadLettered;
    if (counters.dead_lettered > 0) {
      await deps.sendAlert({
        type: "dead_letter",
        message: `${counters.dead_lettered} work item(s) dead-lettered after exhausting attempts.`,
        context: { runId },
      });
    }
    if (staleRuns > 0) {
      logger.info("reconciled stale runs", { runId, staleRuns });
    }

    // ---- 2. PHASE A: fetch + hash gate ---------------------------------------
    const due = await store.getDueSources(deps.clock(), limits.batchLimit, options.sourceId);
    counters.sources_due = due.length;

    for (const source of due) {
      if (deps.clock().getTime() > phaseADeadlineMs) break;
      const claimed = await store.claimSourceForFetch(source, runId, deps.clock(), limits.leaseMinutes);
      if (!claimed) continue;
      counters.sources_checked += 1;
      try {
        await processSourceFetch(source, runId, deps, counters);
      } catch (error) {
        // Unexpected processing error: release the claim as a failure.
        const failures = source.consecutive_failure_count + 1;
        await store.updateSource(source.id, {
          processing_state: "idle",
          claimed_by_run_id: null,
          claimed_at: null,
          lease_expires_at: null,
          last_attempted_at: deps.clock().toISOString(),
          consecutive_failure_count: failures,
          next_retry_at: computeRetryAt(deps.clock(), failures, source.check_cadence_days).toISOString(),
        });
        counters.fetch_failures += 1;
        logger.error("source processing failed", {
          runId,
          sourceId: source.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // ---- 3. PHASE B: bounded chunked extraction --------------------------------
    if (!deps.extractionProvider) {
      logger.info("extraction skipped: no provider configured", { runId });
    } else {
      const validate = deps.validateModels ?? validateModelConfig;
      const validation = await validate(deps.modelConfig);
      if (!validation.ok) {
        modelConfigErrors.push(...validation.errors);
        logger.error("extraction skipped: model configuration invalid", {
          runId,
          errors: validation.errors,
        });
        await deps.sendAlert({
          type: "model_config_error",
          message: `Extraction skipped — model configuration invalid: ${validation.errors.join("; ")}`,
          context: { runId },
        });
      } else {
        const jobs = await store.getWorkableJobs(
          deps.clock(),
          limits.maxExtractionsPerRun,
          options.sourceId,
        );
        for (const job of jobs) {
          if (deps.clock().getTime() > deadlineMs) break;
          const claimed = await store.claimJob(job.id, runId, deps.clock(), limits.leaseMinutes);
          if (!claimed) continue;
          const outcome = await processExtractionJob(job, runId, deps, counters, deadlineMs);
          if (outcome === "halted") {
            status = "halted";
            haltedReason = counters._haltedReason ?? "mass_change_guard";
            break;
          }
        }
      }
    }
  } catch (error) {
    status = "failed";
    runError = error instanceof Error ? error.message : String(error);
    logger.error("freshness run failed", { runId, error: runError });
    await deps.sendAlert({
      type: "run_failed",
      message: `Freshness run ${runId} failed: ${runError}`,
      context: { runId },
    });
  }

  const { _haltedReason, ...persistedCounters } = counters;
  void _haltedReason;
  const estimatedCostUsd = estimateCostUsd(
    {
      inputTokens: counters.input_tokens,
      outputTokens: counters.output_tokens,
      cacheReadTokens: counters.cache_read_tokens,
    },
    deps.costRates,
  );

  await store.finishRun(runId, {
    ...(persistedCounters as RunCounters),
    status,
    halted_reason: haltedReason,
    error: runError ?? (modelConfigErrors.length > 0 ? `model_config: ${modelConfigErrors.join("; ")}` : null),
    estimated_cost_usd: estimatedCostUsd,
  });

  const summary: RunSummary = {
    ...(persistedCounters as RunCounters),
    runId,
    trigger,
    status,
    haltedReason,
    error: runError,
    modelConfigErrors,
    estimatedCostUsd,
  };
  logger.info("freshness run finished", { ...summary });
  return summary;
}

/* -------------------------------------------------------------------------- */

type CountersWithHalt = RunCounters & { _haltedReason?: string };

async function processSourceFetch(
  source: DueSource,
  runId: string,
  deps: MonitorDeps,
  counters: CountersWithHalt,
): Promise<void> {
  const { store, logger, limits } = deps;
  const releaseBase = {
    processing_state: "idle" as const,
    claimed_by_run_id: null,
    claimed_at: null,
    lease_expires_at: null,
  };

  const allowedHosts = getAllowedHostsForIssuer(source.card_issuer);
  const result = await fetchSource(
    {
      url: source.source_url,
      etag: source.etag,
      lastModified: source.last_modified,
      expectedType: source.source_type === "pdf" ? "pdf" : "html",
    },
    { fetchImpl: deps.fetchImpl, allowedHosts },
  );

  const now = deps.clock();

  if (result.kind === "failed") {
    const failures = source.consecutive_failure_count + 1;
    await store.updateSource(source.id, {
      ...releaseBase,
      last_attempted_at: now.toISOString(),
      last_http_status: result.status ?? null,
      consecutive_failure_count: failures,
      next_retry_at: computeRetryAt(now, failures, source.check_cadence_days).toISOString(),
    });
    counters.fetch_failures += 1;
    logger.error("source fetch failed", {
      runId,
      sourceId: source.id,
      reason: result.reason,
      status: result.status ?? null,
      failures,
    });
    if (failures === limits.failureAlertThreshold) {
      await deps.sendAlert({
        type: "source_unavailable",
        message: `Source ${source.source_url} has failed ${failures} consecutive checks (latest: ${result.reason}).`,
        context: { runId, sourceId: source.id },
      });
    }
    return;
  }

  const monthlyDue = isMonthlyVerificationDue(now, source.last_content_verified_at);

  if (result.kind === "not_modified") {
    counters.not_modified_count += 1;
    await store.updateSource(source.id, {
      ...releaseBase,
      last_attempted_at: now.toISOString(),
      last_successful_at: now.toISOString(),
      last_http_status: 304,
      consecutive_failure_count: 0,
      next_retry_at: null,
      next_check_at: computeNextCheckAt(now, source.check_cadence_days).toISOString(),
    });

    const prior = await store.getLatestOkExtractedSnapshot(source.id);
    if (!prior) return; // nothing ever fully processed — a 304 proves nothing

    const validatorsMatch =
      (source.etag !== null && prior.etag === source.etag) ||
      (source.last_modified !== null && prior.last_modified === source.last_modified);
    if (!validatorsMatch) return;

    if (monthlyDue) {
      // Monthly semantic verification: re-extract the preserved, fully
      // processed artifact — never merely renew timestamps.
      await store.createExtractionJob({
        snapshotId: prior.id,
        sourceId: source.id,
        reason: "monthly_verification",
      });
      logger.info("monthly verification re-extraction enqueued (304)", {
        runId,
        sourceId: source.id,
        snapshotId: prior.id,
      });
    } else {
      const linked = await store.getLinkedBenefitIds(source.id);
      await store.markBenefitsVerified(linked, now);
      counters.no_change_verified += linked.length;
    }
    return;
  }

  // ---- 200 OK ---------------------------------------------------------------
  const rawSha = sha256Hex(result.bodyBytes);

  // Immutable artifact BEFORE anything else; failure = retrieval failure.
  let artifactPath: string;
  try {
    artifactPath = (
      await deps.artifactStore.put({
        sha256: rawSha,
        bytes: result.bodyBytes,
        contentType: result.contentType,
        extension: extensionForContent(result.contentType, source.source_type),
      })
    ).path;
  } catch (error) {
    const failures = source.consecutive_failure_count + 1;
    await store.updateSource(source.id, {
      ...releaseBase,
      last_attempted_at: now.toISOString(),
      last_http_status: result.status,
      consecutive_failure_count: failures,
      next_retry_at: computeRetryAt(now, failures, source.check_cadence_days).toISOString(),
    });
    counters.fetch_failures += 1;
    logger.error("artifact upload failed (treated as retrieval failure)", {
      runId,
      sourceId: source.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  // Parse per strategy. Parse failure ⇒ suspect snapshot, never verified.
  let text = "";
  let headings: Array<{ text: string; offset: number }> = [];
  let pageOffsets: Array<{ page: number; offset: number }> | undefined;
  let rawTextForValidation: string | null = null;
  let parseFailed = false;

  try {
    if (source.source_type === "pdf" || source.parser_strategy === "pdf_text") {
      const pdf = await extractPdfText(result.bodyBytes, deps.pdfExtractor);
      const assembled = assemblePdfDocument(pdf.pages);
      text = assembled.text;
      pageOffsets = assembled.pageOffsets;
    } else {
      const html = new TextDecoder().decode(result.bodyBytes);
      rawTextForValidation = html;
      const extracted = extractHtmlText(html, source.parser_config ?? {});
      text = extracted.text;
      headings = extracted.headings;
    }
  } catch (error) {
    parseFailed = true;
    logger.error("content parse failed", {
      runId,
      sourceId: source.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const truncated = text.length > MAX_EXTRACTED_TEXT_CHARS;
  if (truncated) text = text.slice(0, MAX_EXTRACTED_TEXT_CHARS);
  const normSha = sha256Hex(text);

  const prior = await store.getLatestOkExtractedSnapshot(source.id);
  const card = await store.getCardWithActiveBenefits(source.card_id);
  const expectedMarkers =
    source.parser_config?.expected_markers ??
    (card.card.displayName ? [card.card.displayName] : []);

  const validation = parseFailed
    ? { status: "suspect" as const, reasons: ["parse_failure"] }
    : validateContent({
        normalizedText: text,
        rawText: rawTextForValidation,
        requestedUrl: source.source_url,
        finalUrl: result.finalUrl,
        expectedMarkers,
        minExpectedLength: source.parser_config?.min_expected_length ?? null,
        lastGoodLength: prior?.extracted_text?.length ?? null,
        truncated,
      });

  if (validation.status === "suspect") {
    await store.insertSnapshot({
      source_id: source.id,
      run_id: runId,
      http_status: result.status,
      content_type: result.contentType,
      mime_type: result.contentType,
      content_length: result.bodyBytes.byteLength,
      etag: result.etag,
      last_modified: result.lastModified,
      final_url: result.finalUrl,
      response_headers: result.responseHeaders,
      raw_sha256: rawSha,
      normalized_sha256: normSha,
      artifact_path: artifactPath,
      extracted_text: parseFailed ? null : text,
      validation_status: "suspect",
      validation_reasons: validation.reasons,
      chunk_count: null,
      chunks_processed: null,
      truncated,
      extraction_outcome: "not_required",
    });

    const failures = source.consecutive_failure_count + 1;
    await store.updateSource(source.id, {
      ...releaseBase,
      last_attempted_at: now.toISOString(),
      last_successful_at: now.toISOString(),
      last_http_status: result.status,
      consecutive_failure_count: failures,
      next_retry_at: computeRetryAt(now, failures, source.check_cadence_days).toISOString(),
      next_check_at: computeNextCheckAt(now, source.check_cadence_days).toISOString(),
    });
    counters.suspect_count += 1;
    logger.error("suspect content detected — never verified, never extracted", {
      runId,
      sourceId: source.id,
      reasons: validation.reasons,
    });
    if (failures === limits.failureAlertThreshold) {
      await deps.sendAlert({
        type: "source_unavailable",
        message: `Source ${source.source_url} returned suspect content ${failures} times (${validation.reasons.join(", ")}).`,
        context: { runId, sourceId: source.id },
      });
    }
    return;
  }

  const unchanged = source.last_normalized_sha256 === normSha;
  const successPatch = {
    ...releaseBase,
    last_attempted_at: now.toISOString(),
    last_successful_at: now.toISOString(),
    last_http_status: result.status,
    etag: result.etag,
    last_modified: result.lastModified,
    last_raw_sha256: rawSha,
    last_normalized_sha256: normSha,
    consecutive_failure_count: 0,
    next_retry_at: null,
    next_check_at: computeNextCheckAt(now, source.check_cadence_days).toISOString(),
  };

  if (unchanged && !monthlyDue) {
    counters.not_modified_count += 1;
    await store.updateSource(source.id, successPatch);
    // Equivalent of the 304 rule: renewal only against a prior fully
    // processed snapshot with identical content, for linked benefits.
    if (prior && prior.normalized_sha256 === normSha) {
      const linked = await store.getLinkedBenefitIds(source.id);
      await store.markBenefitsVerified(linked, now);
      counters.no_change_verified += linked.length;
    }
    return;
  }

  if (unchanged && monthlyDue && prior && prior.normalized_sha256 === normSha) {
    // Content identical to the fully processed artifact: monthly semantic
    // verification re-extracts that snapshot rather than duplicating it.
    await store.updateSource(source.id, successPatch);
    await store.createExtractionJob({
      snapshotId: prior.id,
      sourceId: source.id,
      reason: "monthly_verification",
    });
    return;
  }

  // Material change (or first fetch / monthly without a processed prior):
  // persist snapshot + chunks, queue extraction, supersede stale jobs.
  const chunks = chunkDocument(
    { text, headings, pageOffsets, normalizedSha256: normSha },
    { maxChars: CHUNK_MAX_CHARS, overlapChars: CHUNK_OVERLAP_CHARS },
  );

  const snapshotId = await store.insertSnapshot({
    source_id: source.id,
    run_id: runId,
    http_status: result.status,
    content_type: result.contentType,
    mime_type: result.contentType,
    content_length: result.bodyBytes.byteLength,
    etag: result.etag,
    last_modified: result.lastModified,
    final_url: result.finalUrl,
    response_headers: result.responseHeaders,
    raw_sha256: rawSha,
    normalized_sha256: normSha,
    artifact_path: artifactPath,
    extracted_text: text,
    validation_status: "ok",
    validation_reasons: null,
    chunk_count: chunks.length,
    chunks_processed: 0,
    truncated,
    extraction_outcome: "pending",
  });

  await store.insertChunks(
    snapshotId,
    chunks.map((chunk) => ({
      chunk_index: chunk.index,
      chunk_id: chunk.chunkId,
      page_number: chunk.pageNumber,
      section_heading: chunk.sectionHeading,
      start_offset: chunk.startOffset,
      end_offset: chunk.endOffset,
      chunk_text: chunk.text,
    })),
  );

  await store.supersedeOlderJobs(source.id, snapshotId);
  await store.createExtractionJob({
    snapshotId,
    sourceId: source.id,
    reason: unchanged ? "monthly_verification" : "content_changed",
  });

  counters.changed_count += 1;
  await store.updateSource(source.id, {
    ...successPatch,
    last_changed_at: unchanged ? undefined : now.toISOString(),
  });
  await store.pruneSnapshots(source.id, SNAPSHOT_KEEP_LATEST);
  logger.info("material change detected — extraction queued", {
    runId,
    sourceId: source.id,
    snapshotId,
    chunkCount: chunks.length,
  });
}

/* -------------------------------------------------------------------------- */

async function processExtractionJob(
  job: ExtractionJobRow,
  runId: string,
  deps: MonitorDeps,
  counters: CountersWithHalt,
  deadlineMs: number,
): Promise<"done" | "halted"> {
  const { store, logger, limits } = deps;
  const provider = deps.extractionProvider!;
  const model = deps.modelConfig.model!;
  const escalationModel = deps.modelConfig.escalationModel;

  counters.extractions_attempted += 1;

  const snapshot = await store.getSnapshot(job.snapshot_id);
  const source = await store.getSource(job.source_id);
  if (!snapshot || !source) {
    await store.failJobAttempt(job.id, "snapshot or source missing", deps.clock(), limits.maxAttempts);
    counters.extractions_failed += 1;
    return "done";
  }

  const { card, benefits } = await store.getCardWithActiveBenefits(source.card_id);
  const allChunks = await store.getChunks(job.snapshot_id);
  const chunkCandidates: ChunkCandidate[] = [];
  const usageTotals = { input: 0, output: 0, cacheRead: 0 };

  const extractChunk = async (
    chunk: SnapshotChunkRow,
    useModel: string,
  ): Promise<ExtractedCandidate[] | null> => {
    try {
      const result = await provider.extract({
        model: useModel,
        cardDisplayName: card.displayName ?? card.cardCode ?? "unknown card",
        existingBenefits: benefits.map((b) => ({
          benefit_code: b.benefit_code,
          benefit_name: b.benefit_name,
          benefit_value: b.benefit_value,
          cadence: b.cadence,
        })),
        sourceUrl: source.source_url,
        chunkText: chunk.chunk_text,
        sectionHeading: chunk.section_heading,
        pageNumber: chunk.page_number,
      });
      usageTotals.input += result.usage.inputTokens;
      usageTotals.output += result.usage.outputTokens;
      usageTotals.cacheRead += result.usage.cacheReadTokens;
      await store.updateChunk(chunk.id, {
        status: "extracted",
        attempts: chunk.attempts + 1,
        model: result.model,
        input_tokens: (chunk.input_tokens ?? 0) + result.usage.inputTokens,
        output_tokens: (chunk.output_tokens ?? 0) + result.usage.outputTokens,
        cache_read_tokens: (chunk.cache_read_tokens ?? 0) + result.usage.cacheReadTokens,
        last_error: null,
        result: { candidates: result.candidates },
      });
      return result.candidates;
    } catch (error) {
      await store.updateChunk(chunk.id, {
        status: "failed",
        attempts: chunk.attempts + 1,
        last_error: error instanceof Error ? error.message.slice(0, 2000) : String(error),
      });
      return null;
    }
  };

  // ---- Pass 1: only unfinished/failed chunks; completed results are reused ---
  for (const chunk of allChunks) {
    if (chunk.status === "extracted" && chunk.result) {
      const validated = validateExtractionOutput(chunk.result);
      if (validated.ok) {
        for (const candidate of validated.value.candidates) {
          chunkCandidates.push({ candidate, chunkId: chunk.chunk_id });
        }
        continue;
      }
      // Stored result no longer valid — re-extract this chunk.
    }
    if (deps.clock().getTime() > deadlineMs) break; // leftovers stay pending
    const candidates = await extractChunk(chunk, model);
    if (candidates) {
      for (const candidate of candidates) {
        chunkCandidates.push({ candidate, chunkId: chunk.chunk_id });
      }
    }
  }

  // ---- Pass 2: escalation model for removal-sensitive/ambiguous chunks -------
  if (escalationModel) {
    const flagged = new Set(
      flagEscalationChunks(chunkCandidates, benefits, ESCALATION_CONFIDENCE_THRESHOLD),
    );
    for (const chunkId of flagged) {
      if (deps.clock().getTime() > deadlineMs) break;
      const chunkRows = await store.getChunks(job.snapshot_id);
      const chunk = chunkRows.find((c) => c.chunk_id === chunkId);
      if (!chunk) continue;
      const escalated = await extractChunk(chunk, escalationModel);
      // Escalated output replaces pass-1 output for the chunk. An escalation
      // failure fails the chunk closed (removal-sensitive content must not
      // proceed on the weaker pass alone).
      for (let i = chunkCandidates.length - 1; i >= 0; i -= 1) {
        if (chunkCandidates[i].chunkId === chunkId) chunkCandidates.splice(i, 1);
      }
      if (escalated) {
        for (const candidate of escalated) {
          chunkCandidates.push({ candidate, chunkId });
        }
      }
      logger.info("escalation pass on chunk", { runId, chunkId, model: escalationModel });
    }
  }

  const chunksAfter = await store.getChunks(job.snapshot_id);
  const processed = chunksAfter.filter((c) => c.status === "extracted").length;
  const total = chunksAfter.length;

  const snapshotUsagePatch = {
    extraction_model: model,
    input_tokens: (snapshot.input_tokens ?? 0) + usageTotals.input,
    output_tokens: (snapshot.output_tokens ?? 0) + usageTotals.output,
    cache_read_tokens: (snapshot.cache_read_tokens ?? 0) + usageTotals.cacheRead,
    chunks_processed: processed,
  };
  counters.input_tokens += usageTotals.input;
  counters.output_tokens += usageTotals.output;
  counters.cache_read_tokens += usageTotals.cacheRead;

  if (processed < total) {
    // Partially processed documents NEVER verify anything and stay retryable.
    await store.updateSnapshot(job.snapshot_id, {
      ...snapshotUsagePatch,
      extraction_outcome: processed === 0 ? "failed" : "partial",
      extraction_error: "one or more chunks failed or were not processed",
    });
    const disposition = await store.failJobAttempt(
      job.id,
      `processed ${processed}/${total} chunks`,
      deps.clock(),
      limits.maxAttempts,
    );
    if (processed === 0) counters.extractions_failed += 1;
    else counters.extractions_partial += 1;
    if (disposition === "dead_letter") {
      counters.dead_lettered += 1;
      await deps.sendAlert({
        type: "dead_letter",
        message: `Extraction job for source ${source.source_url} dead-lettered after ${limits.maxAttempts} attempts.`,
        context: { runId, jobId: job.id, sourceId: source.id },
      });
    }
    return "done";
  }

  // ---- Final reconciliation over the merged chunk results --------------------
  const reconciled = reconcileExtraction({
    card,
    benefits,
    candidates: chunkCandidates,
    chunks: chunksAfter.map((chunk) => ({
      chunkId: chunk.chunk_id,
      text: chunk.chunk_text,
      startOffset: chunk.start_offset,
    })),
    sourceUrl: source.source_url,
    sourceAuthorityLevel: source.authority_level,
    extractorVersion: EXTRACTOR_VERSION,
    extractionModel: model,
  });

  if (!reconciled.ok) {
    await store.updateSnapshot(job.snapshot_id, {
      ...snapshotUsagePatch,
      extraction_outcome: "failed",
      extraction_error: reconciled.failReason,
    });
    await store.failJobAttempt(
      job.id,
      reconciled.failReason ?? "reconciliation failed",
      deps.clock(),
      limits.maxAttempts,
    );
    counters.extractions_failed += 1;
    logger.error("reconciliation failed closed", {
      runId,
      jobId: job.id,
      reason: reconciled.failReason,
      droppedCandidates: reconciled.droppedCandidates,
    });
    return "done";
  }

  // ---- Mass-change guard: halt BEFORE any insert ------------------------------
  const guard = evaluateMassChangeGuard({
    cardProposalCount: reconciled.proposals.length,
    cardBenefitCount: benefits.length,
    runProposalsSoFar: counters.proposals_created,
    limits: {
      cardChangeRatio: limits.cardChangeRatio,
      minTripCount: limits.massChangeMinTripCount,
      maxProposalsPerRun: limits.maxProposalsPerRun,
    },
  });

  if (guard.halted) {
    counters._haltedReason = guard.reason ?? "mass_change_guard";
    await store.updateSnapshot(job.snapshot_id, {
      ...snapshotUsagePatch,
      extraction_outcome: "failed",
      extraction_error: `mass change guard: ${guard.reason}`,
    });
    await store.failJobAttempt(
      job.id,
      `mass change guard: ${guard.reason}`,
      deps.clock(),
      limits.maxAttempts,
    );
    logger.error("mass-change guard halted the run — zero proposals inserted", {
      runId,
      jobId: job.id,
      reason: guard.reason,
      proposalCount: reconciled.proposals.length,
      benefitCount: benefits.length,
    });
    await deps.sendAlert({
      type: "mass_change_halt",
      message: `Run halted: proposed changes to ${reconciled.proposals.length}/${benefits.length} benefits for ${card.displayName ?? source.card_id} — treating as a likely parser or source failure. Nothing was inserted.`,
      context: { runId, sourceId: source.id, reason: guard.reason },
    });
    return "halted";
  }

  for (const draft of reconciled.proposals) {
    const outcome = await store.insertProposal({
      runId,
      sourceId: source.id,
      snapshotId: job.snapshot_id,
      cardId: source.card_id,
      sourceUrl: source.source_url,
      sourceAuthorityLevel: source.authority_level,
      draft,
    });
    if (outcome.outcome === "inserted") counters.proposals_created += 1;
    else if (outcome.outcome === "revision") {
      counters.proposals_created += 1;
      counters.proposals_reopened += 1;
    } else if (outcome.outcome === "deduped" || outcome.outcome === "reobserved") {
      counters.proposals_deduped += 1;
    }
  }

  // Individual benefit verification: NO_CHANGE benefits that are linked to
  // this source (coverage-gated).
  const linked = new Set(await store.getLinkedBenefitIds(source.id));
  const verifiable = reconciled.verifiedBenefitIds.filter((id) => linked.has(id));
  await store.markBenefitsVerified(verifiable, deps.clock());
  counters.no_change_verified += verifiable.length;

  await store.updateSnapshot(job.snapshot_id, {
    ...snapshotUsagePatch,
    extraction_outcome: "extracted",
    extraction_error: null,
  });
  await store.markSourceContentVerified(source.id, deps.clock());
  await store.completeJob(job.id);

  logger.info("extraction job completed", {
    runId,
    jobId: job.id,
    sourceId: source.id,
    proposals: reconciled.proposals.length,
    verifiedBenefits: verifiable.length,
    droppedCandidates: reconciled.droppedCandidates,
  });
  return "done";
}
