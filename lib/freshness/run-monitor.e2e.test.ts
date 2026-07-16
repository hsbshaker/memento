import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import type { FreshnessAlert } from "./alerts";
import { InMemoryArtifactStore } from "./artifacts";
import { InMemoryFreshnessStore, type MemoryBenefit } from "./in-memory-store";
import { createFakeExtractionProvider, type ExtractionRequest } from "./extraction-provider";
import type { ExtractedCandidate } from "./extraction-schema";
import { runMonitorSources, type MonitorDeps } from "./run-monitor";
import type { BenefitSourceRow } from "@/lib/types/freshness-schema";

/**
 * End-to-end orchestrator suite: in-memory stores, scripted fetch, fake
 * extraction provider, fixed clock. No network, no database, no LLM.
 */

const FIXTURES = path.join(process.cwd(), "lib", "freshness", "__fixtures__");
const fixture = (name: string) => readFileSync(path.join(FIXTURES, name), "utf8");

const CARD_ID = "card-1";
const SOURCE_ID = "source-1";
const SOURCE_URL = "https://www.americanexpress.com/us/credit-cards/card/test-platinum/";
const AIR_ID = "benefit-air";
const HOTEL_ID = "benefit-hotel";

const htmlResponse = (body: string, headers: Record<string, string> = {}) =>
  new Response(body, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8", etag: '"v1"', ...headers },
  });

const makeBenefit = (overrides: Partial<MemoryBenefit>): MemoryBenefit => ({
  id: "b",
  card_id: CARD_ID,
  benefit_code: "code",
  benefit_name: "name",
  benefit_value: "value",
  cadence: "annual",
  reset_timing: "calendar year",
  enrollment_required: false,
  requires_setup: false,
  display_description: null,
  benefit_status: "active",
  retired_at: null,
  source_url: SOURCE_URL,
  track_in_memento: "yes",
  benefit_hash: "hash",
  content_version: 1,
  last_verified_at: null,
  ...overrides,
});

const makeSource = (overrides: Partial<BenefitSourceRow> = {}): BenefitSourceRow & {
  card_issuer: string;
} => ({
  id: SOURCE_ID,
  card_id: CARD_ID,
  source_type: "html",
  source_url: SOURCE_URL,
  authority_level: "official",
  parser_strategy: "generic_html",
  parser_config: { expected_markers: ["Test Platinum Card"], min_expected_length: 100 },
  check_cadence_days: 7,
  monthly_full_verification: true,
  enabled: true,
  notes: null,
  next_check_at: "2026-07-15T00:00:00.000Z",
  processing_state: "idle",
  claimed_by_run_id: null,
  claimed_at: null,
  lease_expires_at: null,
  attempt_count: 0,
  next_retry_at: null,
  last_attempted_at: null,
  last_successful_at: null,
  last_changed_at: null,
  last_content_verified_at: null,
  last_http_status: null,
  etag: null,
  last_modified: null,
  last_raw_sha256: null,
  last_normalized_sha256: null,
  consecutive_failure_count: 0,
  created_at: "2026-07-01T00:00:00.000Z",
  updated_at: "2026-07-01T00:00:00.000Z",
  card_issuer: "amex",
  ...overrides,
});

const candidate = (overrides: Partial<ExtractedCandidate>): ExtractedCandidate => ({
  matched_benefit_code: null,
  benefit_name: "unnamed",
  benefit_value: null,
  cadence: null,
  reset_timing: null,
  enrollment_required: null,
  requires_setup: null,
  display_description: null,
  removal_claim: false,
  effective_date: null,
  evidence_excerpt: "missing",
  explanation: "test candidate",
  confidence: 0.9,
  ...overrides,
});

const airlineCandidate = (overrides: Partial<ExtractedCandidate> = {}) =>
  candidate({
    matched_benefit_code: "amex_test_airline",
    benefit_name: "Airline Fee Credit",
    benefit_value: "Up to $200 annually",
    cadence: "annual",
    evidence_excerpt: "Receive up to $200 in airline fee credits each calendar year",
    ...overrides,
  });

const hotelCandidate = (overrides: Partial<ExtractedCandidate> = {}) =>
  candidate({
    matched_benefit_code: "amex_test_hotel",
    benefit_name: "Hotel Credit",
    benefit_value: "Up to $300 semiannually",
    cadence: "semiannual",
    evidence_excerpt: "Enjoy up to $300 in hotel credits semiannually",
    ...overrides,
  });

function createWorld() {
  const store = new InMemoryFreshnessStore();
  const artifactStore = new InMemoryArtifactStore();
  const alerts: FreshnessAlert[] = [];
  let nowMs = Date.parse("2026-07-15T01:00:00Z");
  const clock = () => new Date(nowMs);
  const advanceDays = (days: number) => {
    nowMs += days * 24 * 60 * 60 * 1000;
  };
  const advanceHours = (hours: number) => {
    nowMs += hours * 60 * 60 * 1000;
  };

  let respond: (url: string) => Response = () => new Response("unconfigured", { status: 500 });
  const fetchImpl = (async (input: RequestInfo | URL) => respond(String(input))) as typeof fetch;

  let script: (req: ExtractionRequest) => ExtractedCandidate[] | Error = () => [];
  const extractCalls: ExtractionRequest[] = [];
  const provider = createFakeExtractionProvider((req) => {
    extractCalls.push(req);
    return script(req);
  });

  const deps: MonitorDeps = {
    store,
    artifactStore,
    fetchImpl,
    extractionProvider: provider,
    publishDueScheduled: async () => store.publishDueScheduled(clock()),
    clock,
    limits: {
      batchLimit: 25,
      timeBudgetMs: 250_000,
      maxExtractionsPerRun: 4,
      maxProposalsPerRun: 25,
      cardChangeRatio: 0.4,
      massChangeMinTripCount: 3,
      failureAlertThreshold: 3,
      leaseMinutes: 10,
      maxAttempts: 3,
    },
    modelConfig: { apiKey: "test-key", model: "fake-routine", escalationModel: "fake-escalation" },
    costRates: { inputPerMTok: null, outputPerMTok: null },
    validateModels: async () => ({ ok: true, errors: [] }),
    logger: { info() {}, error() {} },
    sendAlert: async (alert) => {
      alerts.push(alert);
    },
  };

  store.seedCard({ id: CARD_ID, displayName: "Test Platinum Card", cardCode: "amex_test" });
  store.seedBenefit(
    makeBenefit({
      id: AIR_ID,
      benefit_code: "amex_test_airline",
      benefit_name: "Airline Fee Credit",
      benefit_value: "Up to $200 annually",
      cadence: "annual",
    }),
  );
  store.seedBenefit(
    makeBenefit({
      id: HOTEL_ID,
      benefit_code: "amex_test_hotel",
      benefit_name: "Hotel Credit",
      benefit_value: "Up to $300 semiannually",
      cadence: "semiannual",
    }),
  );
  store.seedSource(makeSource());
  store.seedLink(AIR_ID, SOURCE_ID);
  store.seedLink(HOTEL_ID, SOURCE_ID);

  const run = (options: { sourceId?: string } = {}) =>
    runMonitorSources(randomUUID(), "cron", deps, options);

  return {
    store,
    artifactStore,
    alerts,
    deps,
    clock,
    advanceDays,
    advanceHours,
    extractCalls,
    run,
    setRespond: (fn: (url: string) => Response) => {
      respond = fn;
    },
    setScript: (fn: (req: ExtractionRequest) => ExtractedCandidate[] | Error) => {
      script = fn;
    },
  };
}

const openProposals = (store: InMemoryFreshnessStore) =>
  [...store.proposals.values()].filter((p) => p.status === "needs_review");

/* ------------------------------------------------------------------------- */

test("e2e 1: no-change retrieval — hash gate skips extraction and renews verification", async () => {
  const world = createWorld();
  world.setRespond(() => htmlResponse(fixture("amex-platinum.html")));
  world.setScript(() => [airlineCandidate(), hotelCandidate()]);

  const run1 = await world.run();
  assert.equal(run1.status, "completed");
  assert.equal(run1.changed_count, 1);
  assert.equal(run1.extractions_attempted, 1);
  assert.equal(run1.proposals_created, 0);
  assert.equal(run1.no_change_verified, 2);
  assert.ok(world.store.benefits.get(AIR_ID)!.last_verified_at);
  assert.ok(world.artifactStore.objects.size >= 1);

  const verifiedAt = world.store.benefits.get(AIR_ID)!.last_verified_at;
  world.advanceDays(8);
  const run2 = await world.run();
  assert.equal(run2.not_modified_count, 1);
  assert.equal(run2.extractions_attempted, 0);
  assert.equal(run2.proposals_created, 0);
  assert.notEqual(world.store.benefits.get(AIR_ID)!.last_verified_at, verifiedAt);
});

test("e2e 2: addition proposal with evidence and derived benefit_code", async () => {
  const world = createWorld();
  world.setRespond(() => htmlResponse(fixture("amex-platinum-new-benefit.html")));
  world.setScript(() => [
    airlineCandidate(),
    hotelCandidate(),
    candidate({
      benefit_name: "Digital Entertainment Credit",
      benefit_value: "Up to $20 monthly",
      cadence: "monthly",
      evidence_excerpt: "Get up to $20 in digital entertainment credits monthly",
    }),
  ]);

  const summary = await world.run();
  assert.equal(summary.proposals_created, 1);
  const proposal = openProposals(world.store)[0];
  assert.equal(proposal.operation, "add");
  assert.equal(proposal.benefit_id, null);
  assert.equal(
    (proposal.after_value as Record<string, unknown>).benefit_code,
    "amex_test_digital_entertainment_credit",
  );
  assert.ok(proposal.evidence_chunk_id);
  assert.equal(proposal.status, "needs_review");
});

test("e2e 3: modification proposal carries field diff, before snapshot, and version", async () => {
  const world = createWorld();
  world.setRespond(() => htmlResponse(fixture("amex-platinum-modified.html")));
  world.setScript(() => [
    airlineCandidate({
      benefit_value: "Up to $250 annually",
      evidence_excerpt: "Receive up to $250 in airline fee credits each calendar year",
    }),
    hotelCandidate(),
  ]);

  const summary = await world.run();
  assert.equal(summary.proposals_created, 1);
  assert.equal(summary.no_change_verified, 1); // hotel verified, airline changed
  const proposal = openProposals(world.store)[0];
  assert.equal(proposal.operation, "modify");
  assert.equal(proposal.benefit_id, AIR_ID);
  assert.equal(proposal.before_version, 1);
  assert.deepEqual(proposal.field_diff, [
    { field: "benefit_value", before: "Up to $200 annually", after: "Up to $250 annually" },
  ]);
  assert.equal((proposal.before_value as Record<string, unknown>).benefit_value, "Up to $200 annually");
  // The benefit itself is untouched until publish.
  assert.equal(world.store.benefits.get(AIR_ID)!.benefit_value, "Up to $200 annually");
});

test("e2e 4: gated removal proposes EXPIRE; missing discontinuation evidence downgrades to blocked", async () => {
  const world = createWorld();
  world.setRespond(() => htmlResponse(fixture("amex-platinum-removal.html")));
  world.setScript(() => [
    airlineCandidate(),
    hotelCandidate({
      removal_claim: true,
      effective_date: "2026-09-01",
      benefit_value: null,
      evidence_excerpt: "The hotel credit benefit is discontinued as of 2026-09-01",
    }),
  ]);

  const summary = await world.run();
  assert.equal(summary.proposals_created, 1);
  const expire = openProposals(world.store)[0];
  assert.equal(expire.operation, "expire");
  assert.equal(expire.effective_date, "2026-09-01");
  assert.equal(expire.removal_gate?.passed, true);
  assert.equal(expire.publish_block_reason, null);
  // Two-pass escalation: the removal-sensitive chunk was re-run on the escalation model.
  assert.ok(world.extractCalls.some((call) => call.model === "fake-escalation"));

  // Same claim WITHOUT discontinuation language ⇒ structurally non-publishable.
  const world2 = createWorld();
  world2.setRespond(() => htmlResponse(fixture("amex-platinum.html")));
  world2.setScript(() => [
    airlineCandidate(),
    hotelCandidate({
      removal_claim: true,
      benefit_value: null,
      evidence_excerpt: "Enjoy up to $300 in hotel credits semiannually",
    }),
  ]);
  await world2.run();
  const downgraded = openProposals(world2.store)[0];
  assert.equal(downgraded.operation, "modify");
  assert.equal(downgraded.publish_block_reason, "removal_gate_failed");
  assert.equal(world2.store.publishProposal(downgraded.id, "admin").status, "blocked");
});

test("e2e 5: retrieval failure is never removal — backoff, alert at threshold, zero proposals", async () => {
  const world = createWorld();
  world.setRespond(() => new Response("upstream error", { status: 500 }));
  world.setScript(() => {
    throw new Error("extraction must never run on failed fetches");
  });

  for (let i = 1; i <= 3; i += 1) {
    const summary = await world.run();
    assert.equal(summary.fetch_failures, 1);
    assert.equal(summary.proposals_created, 0);
    world.advanceDays(2);
  }

  const source = world.store.sources.get(SOURCE_ID)!;
  assert.equal(source.consecutive_failure_count, 3);
  assert.equal(world.alerts.filter((a) => a.type === "source_unavailable").length, 1);
  assert.equal(world.store.proposals.size, 0);
  assert.equal(world.store.benefits.get(HOTEL_ID)!.benefit_status, "active");
  assert.equal(world.store.benefits.get(HOTEL_ID)!.last_verified_at, null);
});

test("e2e 6: invalid model output fails the attempt closed", async () => {
  const world = createWorld();
  world.setRespond(() => htmlResponse(fixture("amex-platinum.html")));
  world.setScript(() => new Error("model returned garbage"));

  const summary = await world.run();
  assert.equal(summary.extractions_failed, 1);
  assert.equal(summary.proposals_created, 0);
  const snapshot = [...world.store.snapshots.values()][0];
  assert.equal(snapshot.extraction_outcome, "failed");
  const job = [...world.store.jobs.values()][0];
  assert.equal(job.status, "failed");
  assert.ok(job.next_retry_at);
  assert.equal(world.store.benefits.get(AIR_ID)!.last_verified_at, null);
});

test("e2e 7: duplicate detection across runs — no duplicate proposals, seen_count bumps", async () => {
  const world = createWorld();
  const modifiedScript = () => [
    airlineCandidate({
      benefit_value: "Up to $250 annually",
      evidence_excerpt: "Receive up to $250 in airline fee credits each calendar year",
    }),
    hotelCandidate(),
  ];
  world.setRespond(() => htmlResponse(fixture("amex-platinum-modified.html")));
  world.setScript(modifiedScript);
  await world.run();
  assert.equal(world.store.proposals.size, 1);

  // Non-substantive page churn: same candidates, new normalized content.
  world.advanceDays(8);
  world.setRespond(() =>
    htmlResponse(fixture("amex-platinum-modified.html").replace("</main>", "<p>New seasonal marketing banner!</p></main>")),
  );
  const run2 = await world.run();
  assert.equal(run2.proposals_deduped, 1);
  assert.equal(run2.proposals_created, 0);
  assert.equal(world.store.proposals.size, 1);
  assert.equal([...world.store.proposals.values()][0].seen_count, 2);
});

test("e2e 8: approve → publish → idempotent noop → rollback → legitimate re-proposal", async () => {
  const world = createWorld();
  world.setRespond(() => htmlResponse(fixture("amex-platinum-modified.html")));
  world.setScript(() => [
    airlineCandidate({
      benefit_value: "Up to $250 annually",
      evidence_excerpt: "Receive up to $250 in airline fee credits each calendar year",
    }),
    hotelCandidate(),
  ]);
  await world.run();

  const proposal = openProposals(world.store)[0];
  world.store.approveProposal(proposal.id, "admin@memento.app");

  const published = world.store.publishProposal(proposal.id, "admin@memento.app", world.clock());
  assert.equal(published.status, "published");
  const air = world.store.benefits.get(AIR_ID)!;
  assert.equal(air.benefit_value, "Up to $250 annually");
  assert.equal(air.content_version, 2);
  assert.equal(world.store.proposals.get(proposal.id)!.published_version, 2);
  assert.equal(world.store.history.filter((h) => h.benefit_id === AIR_ID).length, 1);

  assert.equal(world.store.publishProposal(proposal.id, "admin@memento.app").status, "noop");

  const rolledBack = world.store.rollbackProposal(proposal.id, "admin@memento.app");
  assert.equal(rolledBack.status, "rolled_back");
  assert.equal(world.store.benefits.get(AIR_ID)!.benefit_value, "Up to $200 annually");
  assert.equal(world.store.benefits.get(AIR_ID)!.content_version, 3);

  // The same real-world change may legitimately be re-proposed afterwards.
  world.advanceDays(8);
  world.setRespond(() =>
    htmlResponse(fixture("amex-platinum-modified.html").replace("</main>", "<p>refresh</p></main>")),
  );
  const run2 = await world.run();
  assert.equal(run2.proposals_created, 1);
  assert.equal(openProposals(world.store).length, 1);
});

test("e2e 9: mass-change guard halts the run with zero inserts and an alert", async () => {
  const world = createWorld();
  for (let i = 1; i <= 3; i += 1) {
    world.store.seedBenefit(
      makeBenefit({
        id: `benefit-extra-${i}`,
        benefit_code: `amex_test_extra_${i}`,
        benefit_name: `Extra Benefit ${i}`,
        benefit_value: `Up to $${i}0 monthly`,
        cadence: "monthly",
      }),
    );
    world.store.seedLink(`benefit-extra-${i}`, SOURCE_ID);
  }
  world.setRespond(() => htmlResponse(fixture("amex-platinum.html")));
  const evidence = "Receive up to $200 in airline fee credits each calendar year";
  world.setScript(() => [
    airlineCandidate({ benefit_value: "Up to $999 annually", evidence_excerpt: evidence }),
    hotelCandidate({ benefit_value: "Up to $999 semiannually", evidence_excerpt: evidence }),
    candidate({ matched_benefit_code: "amex_test_extra_1", benefit_name: "Extra Benefit 1", benefit_value: "Up to $999 monthly", evidence_excerpt: evidence }),
    candidate({ matched_benefit_code: "amex_test_extra_2", benefit_name: "Extra Benefit 2", benefit_value: "Up to $999 monthly", evidence_excerpt: evidence }),
  ]);

  const summary = await world.run();
  assert.equal(summary.status, "halted");
  assert.ok(summary.haltedReason?.includes("card_change_ratio_exceeded"));
  assert.equal(world.store.proposals.size, 0);
  assert.equal(summary.proposals_created, 0);
  assert.equal(world.alerts.filter((a) => a.type === "mass_change_halt").length, 1);
});

test("e2e 10: suspect content is preserved but never verified or extracted", async () => {
  const world = createWorld();
  world.setRespond(() => htmlResponse(fixture("amex-platinum-softblock.html")));
  world.setScript(() => {
    throw new Error("extraction must never run on suspect content");
  });

  const summary = await world.run();
  assert.equal(summary.suspect_count, 1);
  assert.equal(summary.extractions_attempted, 0);
  const snapshot = [...world.store.snapshots.values()][0];
  assert.equal(snapshot.validation_status, "suspect");
  assert.ok((snapshot.validation_reasons as string[]).includes("captcha_or_challenge"));
  assert.ok(snapshot.artifact_path); // evidence preserved for review
  assert.equal(world.store.jobs.size, 0);
  assert.equal(world.store.benefits.get(AIR_ID)!.last_verified_at, null);
});

test("e2e 11: expired leases recover; exhausted attempts dead-letter; manual retry re-queues", async () => {
  const world = createWorld();
  // A source stuck in `fetching` by a crashed run, one attempt away from the cap.
  const stuck = world.store.sources.get(SOURCE_ID)!;
  stuck.processing_state = "fetching";
  stuck.claimed_by_run_id = randomUUID();
  stuck.lease_expires_at = new Date(world.clock().getTime() - 60_000).toISOString();
  stuck.attempt_count = 2; // maxAttempts = 3

  // A crashed extraction job with attempts remaining.
  const snapshotId = await world.store.insertSnapshot({
    source_id: SOURCE_ID,
    run_id: randomUUID(),
    http_status: 200,
    content_type: "text/html",
    mime_type: "text/html",
    content_length: 100,
    etag: null,
    last_modified: null,
    final_url: SOURCE_URL,
    response_headers: null,
    raw_sha256: "raw",
    normalized_sha256: "norm",
    artifact_path: "raw/no/raw.html",
    extracted_text: "Receive up to $200 in airline fee credits each calendar year",
    validation_status: "ok",
    validation_reasons: null,
    chunk_count: 1,
    chunks_processed: 0,
    truncated: false,
    extraction_outcome: "pending",
  });
  await world.store.insertChunks(snapshotId, [
    {
      chunk_index: 0,
      chunk_id: "norm#0",
      page_number: null,
      section_heading: null,
      start_offset: 0,
      end_offset: 61,
      chunk_text: "Receive up to $200 in airline fee credits each calendar year",
    },
  ]);
  await world.store.createExtractionJob({ snapshotId, sourceId: SOURCE_ID, reason: "content_changed" });
  const job = [...world.store.jobs.values()][0];
  job.status = "claimed";
  job.claimed_by_run_id = randomUUID();
  job.lease_expires_at = new Date(world.clock().getTime() - 60_000).toISOString();

  world.setRespond(() => htmlResponse(fixture("amex-platinum.html")));
  world.setScript(() => [airlineCandidate()]);

  const summary = await world.run();
  // Source hit the attempt cap → dead-lettered (and alerted); job recovered to retryable.
  assert.equal(world.store.sources.get(SOURCE_ID)!.processing_state, "dead_letter");
  assert.ok(summary.dead_lettered >= 1);
  assert.ok(world.alerts.some((a) => a.type === "dead_letter"));
  const recoveredJob = world.store.jobs.get(job.id)!;
  assert.equal(recoveredJob.status, "failed");
  assert.ok(recoveredJob.next_retry_at);

  // Manual retry (what the admin route does): re-queue the specific job. The
  // source stays dead-lettered until an operator resets it, so phase A skips
  // it — phase B must still process the retried job.
  recoveredJob.status = "pending";
  recoveredJob.attempt_count = 0;
  recoveredJob.next_retry_at = null;

  const summary2 = await world.run();
  assert.equal(summary2.extractions_attempted, 1);
  assert.equal(summary2.sources_checked, 0, "dead-lettered source is not fetched");
  assert.equal(world.store.jobs.get(job.id)!.status, "completed");
});

test("e2e 12: 304 renews only with a linked, fully processed prior snapshot; monthly due re-extracts", async () => {
  const world = createWorld();
  world.setRespond(() => htmlResponse(fixture("amex-platinum.html")));
  world.setScript(() => [airlineCandidate(), hotelCandidate()]);
  await world.run(); // full processing establishes the prior snapshot + etag

  // 304 within the month: linked benefits renew.
  world.advanceDays(8);
  world.setRespond(() => new Response(null, { status: 304 }));
  const run304 = await world.run();
  assert.equal(run304.not_modified_count, 1);
  assert.equal(run304.no_change_verified, 2);
  assert.equal(run304.extractions_attempted, 0);

  // Monthly verification due + 304 ⇒ re-extraction of the preserved artifact,
  // not a timestamp renewal.
  world.advanceDays(31);
  const runMonthly = await world.run();
  assert.equal(runMonthly.not_modified_count, 1);
  assert.equal(runMonthly.extractions_attempted, 1);
  assert.ok(
    [...world.store.jobs.values()].some((j) => j.reason === "monthly_verification"),
  );

  // A fresh source with no processed snapshot: a 304 proves nothing.
  const world2 = createWorld();
  world2.setRespond(() => new Response(null, { status: 304 }));
  const runFresh = await world2.run();
  assert.equal(runFresh.no_change_verified, 0);
  assert.equal(world2.store.benefits.get(AIR_ID)!.last_verified_at, null);
});

test("e2e 13: partial chunked documents never verify; retries process only unfinished chunks", async () => {
  const world = createWorld();
  const filler = Array.from({ length: 700 }, (_, i) => `<p>Cardmember terms detail line ${i} for the Test Platinum Card program.</p>`);
  filler.push("<p>FAILMARKER extraction poison line.</p>");
  const bigPage = `<html><body><main><h1>Test Platinum Card Benefits</h1><p>Receive up to $200 in airline fee credits each calendar year on one selected qualifying airline.</p>${filler.join("")}</main></body></html>`;

  world.setRespond(() => htmlResponse(bigPage));
  world.setScript((req) => {
    if (req.chunkText.includes("FAILMARKER")) return new Error("simulated chunk failure");
    if (req.chunkText.includes("airline fee credits")) return [airlineCandidate()];
    return [];
  });

  const run1 = await world.run();
  assert.equal(run1.extractions_partial, 1);
  const snapshot = [...world.store.snapshots.values()][0];
  assert.equal(snapshot.extraction_outcome, "partial");
  assert.ok((snapshot.chunk_count ?? 0) >= 2);
  assert.equal(world.store.benefits.get(AIR_ID)!.last_verified_at, null, "partial never verifies");

  const chunkStates = [...world.store.chunks.values()].map((c) => c.status).sort();
  assert.ok(chunkStates.includes("extracted") && chunkStates.includes("failed"));

  // Retry: fix the failing chunk, advance past backoff; only unfinished chunks run.
  world.setScript((req) => {
    if (req.chunkText.includes("airline fee credits") && !req.chunkText.includes("FAILMARKER")) {
      return [airlineCandidate()];
    }
    return [];
  });
  const callsBefore = world.extractCalls.length;
  world.advanceHours(3);
  const run2 = await world.run();
  const retryCalls = world.extractCalls.slice(callsBefore);
  assert.equal(retryCalls.length, 1, "only the failed chunk is re-extracted");
  assert.ok(retryCalls[0].chunkText.includes("FAILMARKER"));
  assert.equal(run2.extractions_attempted, 1);
  assert.equal([...world.store.snapshots.values()][0].extraction_outcome, "extracted");
  assert.ok(world.store.benefits.get(AIR_ID)!.last_verified_at);
});

test("e2e 14: rejected proposals are immutable — weaker evidence reobserves, stronger creates a linked revision", async () => {
  const world = createWorld();
  const lowConfidence = () => [
    airlineCandidate({
      confidence: 0.7,
      benefit_value: "Up to $250 annually",
      evidence_excerpt: "Receive up to $250 in airline fee credits each calendar year",
    }),
    hotelCandidate(),
  ];
  world.setRespond(() => htmlResponse(fixture("amex-platinum-modified.html")));
  world.setScript(lowConfidence);
  await world.run();

  const original = openProposals(world.store)[0];
  world.store.rejectProposal(original.id, "admin@memento.app");
  const originalEvidence = original.evidence_excerpt;

  // Same evidence again ⇒ reobserved event only, no new row, original untouched.
  world.advanceDays(8);
  world.setRespond(() =>
    htmlResponse(fixture("amex-platinum-modified.html").replace("</main>", "<p>tweak-1</p></main>")),
  );
  const run2 = await world.run();
  assert.equal(run2.proposals_created, 0);
  assert.equal(world.store.proposals.size, 1);
  assert.ok(
    world.store.events.some(
      (e) => e.proposal_id === original.id && e.event_type === "reobserved",
    ),
  );

  // Materially stronger evidence (confidence +0.2) ⇒ new linked revision row.
  world.advanceDays(8);
  world.setRespond(() =>
    htmlResponse(fixture("amex-platinum-modified.html").replace("</main>", "<p>tweak-2</p></main>")),
  );
  world.setScript(() => [
    airlineCandidate({
      confidence: 0.9,
      benefit_value: "Up to $250 annually",
      evidence_excerpt: "Receive up to $250 in airline fee credits each calendar year",
    }),
    hotelCandidate(),
  ]);
  const run3 = await world.run();
  assert.equal(run3.proposals_created, 1);
  assert.equal(run3.proposals_reopened, 1);
  assert.equal(world.store.proposals.size, 2);

  const revision = [...world.store.proposals.values()].find((p) => p.revision === 2)!;
  assert.equal(revision.previous_proposal_id, original.id);
  assert.equal(revision.status, "needs_review");
  const rejectedRow = world.store.proposals.get(original.id)!;
  assert.equal(rejectedRow.status, "rejected");
  assert.equal(rejectedRow.evidence_excerpt, originalEvidence, "rejected row never overwritten");
  assert.ok(
    world.store.events.some(
      (e) => e.proposal_id === original.id && e.event_type === "revision_created",
    ),
  );
});

test("e2e 15: scheduled publication runs first, isolates failures, and survives a monitoring crash", async () => {
  const world = createWorld();
  world.setRespond(() => htmlResponse(fixture("amex-platinum-modified.html")));
  world.setScript(() => [
    airlineCandidate({
      benefit_value: "Up to $250 annually",
      evidence_excerpt: "Receive up to $250 in airline fee credits each calendar year",
    }),
    hotelCandidate({
      benefit_value: "Up to $350 semiannually",
      evidence_excerpt: "Enjoy up to $300 in hotel credits semiannually",
    }),
  ]);
  await world.run();

  const proposals = openProposals(world.store);
  assert.equal(proposals.length, 2);
  const [good, bad] = proposals;

  // Good: approved, due yesterday. Bad: approved but structurally blocked. Future: untouched.
  world.store.approveProposal(good.id, "admin@memento.app");
  good.effective_date = "2026-07-14";
  world.store.approveProposal(bad.id, "admin@memento.app");
  bad.effective_date = "2026-07-14";
  bad.investigation_only = true; // will block at publish time

  // Monitoring crashes this run — the sweep must still have run first.
  world.store.getDueSources = async () => {
    throw new Error("monitoring exploded");
  };

  const summary = await world.run();
  assert.equal(summary.status, "failed");
  assert.equal(summary.scheduled_published, 1);
  assert.equal(summary.scheduled_failed, 1);
  assert.equal(world.store.proposals.get(good.id)!.status, "published");
  assert.equal(world.store.proposals.get(bad.id)!.status, "approved"); // blocked, not corrupted
  assert.ok(
    world.store.events.some(
      (e) => e.proposal_id === bad.id && e.event_type === "publish_blocked",
    ),
  );
});
