/**
 * Extraction evaluation runner.
 *
 * Offline (default): scripted candidates exercise the full production path
 * (chunking, two-pass escalation, reconciliation, scoring) with no API calls.
 *
 * Live (--live): runs the EXACT production models/prompt/schema/reconciliation
 * against the labeled corpus. THIS IS THE ROLLOUT HARD GATE — before any
 * source is enabled the live report must show zero false removals and field
 * accuracy ≥ the documented threshold. Requires ANTHROPIC_API_KEY +
 * FRESHNESS_MODEL (+ FRESHNESS_MODEL_ESCALATION) and explicit owner approval
 * (it spends real tokens).
 *
 * Reports are persisted to data/evals/<date>-<mode>-<model>-c<corpus>.json.
 *
 * Usage:
 *   npx tsx scripts/freshness_eval_extraction.ts          # offline plumbing run
 *   npx tsx scripts/freshness_eval_extraction.ts --live   # live gate (approved only)
 */
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";

import { createCorpusFakeProvider, loadEvalCorpus } from "../lib/freshness/eval-corpus";
import { runEvalCorpus } from "../lib/freshness/eval-harness";
import { createAnthropicExtractionProvider } from "../lib/freshness/extraction-provider";

const loadEnvLocal = () => {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fsSync.existsSync(envPath)) return;
  for (const line of fsSync.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
};

async function main() {
  loadEnvLocal();
  const live = process.argv.includes("--live");
  const { version, cases } = loadEvalCorpus();

  let provider;
  let model: string;
  let escalationModel: string | null;

  if (live) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    model = process.env.FRESHNESS_MODEL ?? "";
    escalationModel = process.env.FRESHNESS_MODEL_ESCALATION ?? null;
    if (!apiKey || !model) {
      console.error(
        "--live requires ANTHROPIC_API_KEY and FRESHNESS_MODEL (and spends real tokens — owner approval required).",
      );
      process.exit(1);
    }
    provider = createAnthropicExtractionProvider({ apiKey });
  } else {
    provider = createCorpusFakeProvider(cases);
    model = "fake-routine";
    escalationModel = "fake-escalation";
  }

  const report = await runEvalCorpus(cases, {
    provider,
    model,
    escalationModel,
    mode: live ? "live" : "fake",
    corpusVersion: version,
  });

  const outDir = path.join(process.cwd(), "data", "evals");
  await fs.mkdir(outDir, { recursive: true });
  const filename = `${new Date().toISOString().slice(0, 10)}-${report.mode}-${model.replace(/[^a-z0-9.-]/gi, "_")}-c${version}.json`;
  const outPath = path.join(outDir, filename);
  await fs.writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.info(`[eval] mode=${report.mode} model=${model} corpus=v${version}`);
  for (const result of report.cases) {
    console.info(
      `[eval]  ${result.name}: matched ${result.proposalsMatched}/${result.proposalsExpected} proposals, ` +
        `fields ${result.fieldMatches}/${result.fieldChecks}, false removals ${result.falseRemovals.length}, ` +
        `verified ${result.verifiedMatched}/${result.verifiedExpected}` +
        (result.errors.length > 0 ? ` — errors: ${result.errors.join("; ")}` : ""),
    );
  }
  console.info(
    `[eval] totals: field accuracy ${report.totals.field_accuracy}, false removals ${report.totals.false_removals}, missed removals ${report.totals.missed_removals}`,
  );
  console.info(`[eval] hard gate ${report.hard_gate.passed ? "PASSED" : "FAILED"} → ${outPath}`);

  if (!report.hard_gate.passed) process.exit(2);
}

main().catch((error) => {
  console.error("[eval] fatal:", error instanceof Error ? error.message : error);
  process.exit(1);
});
