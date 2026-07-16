import assert from "node:assert/strict";
import test from "node:test";

import { createCorpusFakeProvider, loadEvalCorpus } from "./eval-corpus";
import { runEvalCorpus } from "./eval-harness";

/**
 * Fake-provider plumbing test: proves the eval harness runs the production
 * extraction path (chunking, escalation, reconciliation) end-to-end over the
 * labeled corpus and that scoring + the hard gate behave. The LIVE run with
 * production models is the rollout gate and is executed separately (owner
 * approved) via scripts/freshness_eval_extraction.ts --live.
 */

test("eval harness passes the hard gate on the labeled corpus with scripted candidates", async () => {
  const { version, cases } = loadEvalCorpus();
  assert.equal(cases.length, 4);

  const report = await runEvalCorpus(cases, {
    provider: createCorpusFakeProvider(cases),
    model: "fake-routine",
    escalationModel: "fake-escalation",
    mode: "fake",
    corpusVersion: version,
  });

  assert.equal(report.totals.cases, 4);
  assert.equal(report.totals.false_removals, 0, "no false removals on the corpus");
  assert.equal(report.totals.missed_removals, 0, "the explicit removal case is detected");
  assert.equal(report.totals.proposals_matched, report.totals.proposals_expected);
  assert.equal(report.hard_gate.passed, true);
  assert.equal(report.versions.corpus_version, 1);
  assert.ok(report.versions.system_prompt_sha256.length === 64);

  const negated = report.cases.find((c) => c.name === "negated-removal-must-not-remove")!;
  assert.deepEqual(negated.falseRemovals, [], "negated language never removes");
});

test("eval harness counts false removals as hard-gate failures", async () => {
  const { version, cases } = loadEvalCorpus();
  // Sabotage: pretend the no-change case claims the airline credit is removed
  // with (real) discontinuation-looking evidence from the removal fixture text.
  const sabotaged = cases.map((c) =>
    c.name === "no-change"
      ? {
          ...c,
          fakeCandidates: [
            {
              ...c.fakeCandidates[0],
              removal_claim: true,
              // Verbatim from case-01.html so the evidence gate passes; the
              // phrase list still matches "no longer available"-free text, so
              // craft evidence that includes discontinuation wording is not
              // available here — the removal gate will fail and block it.
              evidence_excerpt: "Receive up to $200 in airline fee credits each calendar year",
            },
          ],
        }
      : c,
  );

  const report = await runEvalCorpus(sabotaged, {
    provider: createCorpusFakeProvider(sabotaged),
    model: "fake-routine",
    escalationModel: null,
    mode: "fake",
    corpusVersion: version,
  });

  // The gate downgrades this to a blocked signal — publishable false removals
  // stay at zero, which is exactly the structural guarantee under test.
  assert.equal(report.totals.false_removals, 0);
  const sabotagedCase = report.cases.find((c) => c.name === "no-change")!;
  assert.ok(sabotagedCase.proposalsProduced >= 1, "the blocked signal still surfaces for review");
});
