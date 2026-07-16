import assert from "node:assert/strict";
import test from "node:test";

import type { BenefitRowForReconcile } from "@/lib/types/freshness-schema";
import type { ExtractedCandidate } from "./extraction-schema";
import {
  findExcerptOffset,
  flagEscalationChunks,
  matchCandidate,
  reconcileExtraction,
  type ChunkCandidate,
  type ReconcileInput,
} from "./reconcile";

const benefit = (overrides: Partial<BenefitRowForReconcile>): BenefitRowForReconcile => ({
  id: "b-1",
  card_id: "card-1",
  benefit_code: "amex_platinum_airline_fee_credit",
  benefit_name: "Airline Fee Credit",
  benefit_value: "Up to $200 annually",
  cadence: "annual",
  reset_timing: "calendar year",
  enrollment_required: true,
  requires_setup: false,
  display_description: "Airline incidental fees credit.",
  benefit_status: "active",
  retired_at: null,
  source_url: "https://www.americanexpress.com/us/credit-cards/card/platinum/",
  track_in_memento: "yes",
  benefit_hash: "hash-1",
  content_version: 3,
  ...overrides,
});

const candidate = (overrides: Partial<ExtractedCandidate>): ExtractedCandidate => ({
  matched_benefit_code: "amex_platinum_airline_fee_credit",
  benefit_name: "Airline Fee Credit",
  benefit_value: "Up to $200 annually",
  cadence: "annual",
  reset_timing: "calendar year",
  enrollment_required: true,
  requires_setup: false,
  display_description: null,
  removal_claim: false,
  effective_date: null,
  evidence_excerpt: "up to $200 in airline fee credits annually",
  explanation: "Airline fee credit section.",
  confidence: 0.9,
  ...overrides,
});

const CHUNK_TEXT =
  "Platinum benefits include up to $200 in airline fee credits annually on one selected airline. " +
  "Hotel credit: up to $300 semiannually. The lounge benefit is discontinued effective 2026-09-01.";

const chunk = { chunkId: "sha#0", text: CHUNK_TEXT, startOffset: 100 };

const input = (
  candidates: ChunkCandidate[],
  overrides: Partial<ReconcileInput> = {},
): ReconcileInput => ({
  card: { id: "card-1", displayName: "Platinum Card", cardCode: "amex_platinum" },
  benefits: [benefit({})],
  candidates,
  chunks: [chunk],
  sourceUrl: "https://www.americanexpress.com/us/credit-cards/card/platinum/",
  sourceAuthorityLevel: "official",
  extractorVersion: "test/1",
  extractionModel: "fake-model",
  ...overrides,
});

test("findExcerptOffset is whitespace tolerant and exact otherwise", () => {
  assert.equal(findExcerptOffset("a  b\n c", "a b c"), 0);
  assert.equal(findExcerptOffset(CHUNK_TEXT, "up to $200 in airline fee credits"), 26);
  assert.equal(findExcerptOffset(CHUNK_TEXT, "text not present anywhere"), null);
  assert.equal(findExcerptOffset(CHUNK_TEXT, "   "), null);
});

test("NO_CHANGE: matching candidate with no diff verifies the benefit, no proposal", () => {
  const result = reconcileExtraction(input([{ candidate: candidate({}), chunkId: "sha#0" }]));
  assert.equal(result.ok, true);
  assert.equal(result.proposals.length, 0);
  assert.deepEqual(result.verifiedBenefitIds, ["b-1"]);
});

test("MODIFY: value change produces a field diff, before snapshot, and version", () => {
  const result = reconcileExtraction(
    input([
      {
        candidate: candidate({ benefit_value: "Up to $250 annually", evidence_excerpt: "up to $200 in airline fee credits annually" }),
        chunkId: "sha#0",
      },
    ]),
  );
  assert.equal(result.proposals.length, 1);
  const p = result.proposals[0];
  assert.equal(p.operation, "modify");
  assert.equal(p.benefitId, "b-1");
  assert.equal(p.beforeVersion, 3);
  assert.equal(p.beforeValue?.benefit_hash, "hash-1");
  assert.deepEqual(p.fieldDiff, [
    { field: "benefit_value", before: "Up to $200 annually", after: "Up to $250 annually" },
  ]);
  assert.equal(p.afterValue?.benefit_value, "Up to $250 annually");
  assert.equal(p.publishBlockReason, null);
  assert.equal(p.evidenceOffset, 100 + 26);
  assert.equal(p.evidenceChunkId, "sha#0");
});

test("null candidate fields are 'not asserted' and never diff", () => {
  const result = reconcileExtraction(
    input([
      {
        candidate: candidate({ benefit_value: null, cadence: null, reset_timing: null }),
        chunkId: "sha#0",
      },
    ]),
  );
  assert.equal(result.proposals.length, 0);
  assert.deepEqual(result.verifiedBenefitIds, ["b-1"]);
});

test("ADD: unmatched candidate becomes an add with derived code and source url", () => {
  const result = reconcileExtraction(
    input([
      {
        candidate: candidate({
          matched_benefit_code: null,
          benefit_name: "Digital Entertainment Credit",
          benefit_value: "Up to $20 monthly",
          cadence: "monthly",
          evidence_excerpt: "Hotel credit: up to $300 semiannually",
        }),
        chunkId: "sha#0",
      },
    ]),
  );
  assert.equal(result.proposals.length, 1);
  const p = result.proposals[0];
  assert.equal(p.operation, "add");
  assert.equal(p.benefitId, null);
  assert.equal(p.beforeValue, null);
  assert.equal(p.afterValue?.benefit_code, "amex_platinum_digital_entertainment_credit");
  assert.equal(p.afterValue?.benefit_status, "active");
  assert.equal(p.afterValue?.source_url, "https://www.americanexpress.com/us/credit-cards/card/platinum/");
});

test("REMOVE with gate pass; EXPIRE when an effective date exists", () => {
  const removeResult = reconcileExtraction(
    input([
      {
        candidate: candidate({
          removal_claim: true,
          evidence_excerpt: "The lounge benefit is discontinued",
        }),
        chunkId: "sha#0",
      },
    ]),
  );
  assert.equal(removeResult.proposals.length, 1);
  assert.equal(removeResult.proposals[0].operation, "remove");
  assert.equal(removeResult.proposals[0].removalGate?.passed, true);
  assert.equal(removeResult.proposals[0].afterValue?.benefit_status, "retired");
  assert.equal(removeResult.proposals[0].publishBlockReason, null);

  const expireResult = reconcileExtraction(
    input([
      {
        candidate: candidate({
          removal_claim: true,
          effective_date: "2026-09-01",
          evidence_excerpt: "discontinued effective 2026-09-01",
        }),
        chunkId: "sha#0",
      },
    ]),
  );
  assert.equal(expireResult.proposals[0].operation, "expire");
  assert.equal(expireResult.proposals[0].effectiveDate, "2026-09-01");
});

test("removal claim without discontinuation language downgrades to a blocked proposal", () => {
  const result = reconcileExtraction(
    input([
      {
        candidate: candidate({
          removal_claim: true,
          evidence_excerpt: "Hotel credit: up to $300 semiannually",
        }),
        chunkId: "sha#0",
      },
    ]),
  );
  assert.equal(result.proposals.length, 1);
  const p = result.proposals[0];
  assert.equal(p.operation, "modify");
  assert.equal(p.publishBlockReason, "removal_gate_failed");
  assert.equal(p.removalGate?.passed, false);
  assert.ok(p.explanation.startsWith("Possible removal"));
});

test("absence of benefits from the document produces nothing", () => {
  const result = reconcileExtraction(input([]));
  assert.equal(result.ok, true);
  assert.equal(result.proposals.length, 0);
  assert.deepEqual(result.verifiedBenefitIds, []);
});

test("removal claim that matches no benefit produces nothing", () => {
  const result = reconcileExtraction(
    input([
      {
        candidate: candidate({
          matched_benefit_code: null,
          benefit_name: "Nonexistent Benefit",
          removal_claim: true,
          evidence_excerpt: "The lounge benefit is discontinued",
        }),
        chunkId: "sha#0",
      },
    ]),
  );
  assert.equal(result.proposals.length, 0);
});

test("evidence not present in the chunk drops the candidate; >30% dropped fails closed", () => {
  const good = { candidate: candidate({}), chunkId: "sha#0" };
  const bad = {
    candidate: candidate({ evidence_excerpt: "fabricated text that is not in the document" }),
    chunkId: "sha#0",
  };

  const oneBad = reconcileExtraction(input([good, good, bad]));
  assert.equal(oneBad.ok, false);
  assert.equal(oneBad.failReason, "evidence_grounding_failed");
  assert.equal(oneBad.proposals.length, 0);

  const mostlyGood = reconcileExtraction(input([good, good, good, bad]));
  assert.equal(mostlyGood.ok, true);
  assert.equal(mostlyGood.droppedCandidates, 1);
});

test("ambiguous matches become a single blocked signal, never a guess", () => {
  const twoBenefits = [
    benefit({}),
    benefit({ id: "b-2", benefit_code: "amex_platinum_airline_fee_credit_2", benefit_name: "Airline Fee Credit Plus" }),
  ];
  const result = reconcileExtraction(
    input(
      [
        {
          candidate: candidate({
            matched_benefit_code: null,
            benefit_name: "Airline Fee",
            benefit_value: "Up to $999 annually",
          }),
          chunkId: "sha#0",
        },
      ],
      { benefits: twoBenefits },
    ),
  );
  assert.equal(result.proposals.length, 1);
  assert.equal(result.proposals[0].publishBlockReason, "ambiguous_match");
  assert.ok(result.proposals[0].explanation.includes("matches multiple existing benefits"));
});

test("two candidates mapping to one benefit produce a single ambiguity signal", () => {
  const result = reconcileExtraction(
    input([
      { candidate: candidate({ benefit_value: "Up to $250 annually" }), chunkId: "sha#0" },
      { candidate: candidate({ benefit_value: "Up to $300 annually", benefit_name: "Airline Fee Credit" }), chunkId: "sha#0" },
    ]),
  );
  assert.equal(result.proposals.length, 1);
  assert.equal(result.proposals[0].publishBlockReason, "ambiguous_match");
  assert.equal(result.proposals[0].benefitId, "b-1");
});

test("secondary sources mark every draft investigation_only", () => {
  const result = reconcileExtraction(
    input(
      [{ candidate: candidate({ benefit_value: "Up to $250 annually" }), chunkId: "sha#0" }],
      { sourceAuthorityLevel: "secondary" },
    ),
  );
  assert.equal(result.proposals[0].investigationOnly, true);
});

test("fuzzy matching applies a confidence penalty; invalid asserted code falls through", () => {
  const outcome = matchCandidate(
    candidate({ matched_benefit_code: "bogus_code", benefit_name: "Airline Fee Credit annual benefit" }),
    [benefit({})],
  );
  assert.equal(outcome.kind, "fuzzy");

  const result = reconcileExtraction(
    input([
      {
        candidate: candidate({
          matched_benefit_code: "bogus_code",
          benefit_name: "Airline Fee Credit annual benefit",
          benefit_value: "Up to $250 annually",
        }),
        chunkId: "sha#0",
      },
    ]),
  );
  assert.equal(result.proposals[0].confidence, 0.8);
});

test("flagEscalationChunks flags removals, expirations, low confidence, and ambiguity", () => {
  const benefits = [benefit({})];
  const flagged = flagEscalationChunks(
    [
      { candidate: candidate({}), chunkId: "c-clean" },
      { candidate: candidate({ removal_claim: true }), chunkId: "c-removal" },
      { candidate: candidate({ effective_date: "2026-09-01" }), chunkId: "c-expire" },
      { candidate: candidate({ confidence: 0.4 }), chunkId: "c-low" },
    ],
    benefits,
    0.6,
  );
  assert.deepEqual(flagged.sort(), ["c-expire", "c-low", "c-removal"]);
});
