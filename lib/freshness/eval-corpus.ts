import { readFileSync } from "node:fs";
import path from "node:path";

import type { EvalCase } from "@/lib/freshness/eval-harness";
import { createFakeExtractionProvider } from "@/lib/freshness/extraction-provider";
import type { ExtractionProvider } from "@/lib/freshness/extraction-provider";
import type { ExtractedCandidate } from "@/lib/freshness/extraction-schema";
import { findExcerptOffset } from "@/lib/freshness/reconcile";

/** Loads the labeled eval corpus from lib/freshness/__fixtures__/eval. */

export const EVAL_CORPUS_DIR = path.join(process.cwd(), "lib", "freshness", "__fixtures__", "eval");

interface RawEvalCase {
  name: string;
  document: string;
  source_url: string;
  card: { id: string; displayName: string | null; cardCode: string | null };
  benefits: EvalCase["benefits"];
  fake_candidates: ExtractedCandidate[];
  expected: EvalCase["expected"];
}

export function loadEvalCorpus(dir: string = EVAL_CORPUS_DIR): {
  version: number;
  cases: EvalCase[];
} {
  const corpus = JSON.parse(readFileSync(path.join(dir, "corpus.json"), "utf8")) as {
    version: number;
    cases: string[];
  };

  const cases = corpus.cases.map((slug) => {
    const raw = JSON.parse(readFileSync(path.join(dir, `${slug}.json`), "utf8")) as RawEvalCase;
    return {
      name: raw.name,
      documentHtml: readFileSync(path.join(dir, raw.document), "utf8"),
      sourceUrl: raw.source_url,
      card: raw.card,
      benefits: raw.benefits,
      fakeCandidates: raw.fake_candidates,
      expected: raw.expected,
    } satisfies EvalCase;
  });

  return { version: corpus.version, cases };
}

/**
 * Offline provider: for each chunk, returns the case's labeled candidates
 * whose evidence is present in that chunk — exercising the full harness
 * plumbing (chunking, escalation, reconciliation, scoring) with no API calls.
 */
export function createCorpusFakeProvider(cases: EvalCase[]): ExtractionProvider {
  return createFakeExtractionProvider((request) => {
    const evalCase = cases.find((c) => c.sourceUrl === request.sourceUrl);
    if (!evalCase) return [];
    return evalCase.fakeCandidates.filter(
      (candidate) => findExcerptOffset(request.chunkText, candidate.evidence_excerpt) !== null,
    );
  });
}
