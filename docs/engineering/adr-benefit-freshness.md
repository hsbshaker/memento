# ADR: Benefit Freshness Pipeline

- **Status:** Accepted (Rev 2, 2026-07-15)
- **Deciders:** Product owner + principal engineer
- **Context docs:** `docs/engineering/freshness-pipeline.md` (developer),
  `docs/engineering/freshness-operations.md` (operator)

## Context

Memento's card/benefit catalog is authored as CSV and imported offline. Issuer benefit terms
change without warning (values, cadences, enrollment rules, discontinuations), so catalog data
silently goes stale. We need recurring detection of benefit changes from authoritative issuer
sources, with provenance for every proposed change, and a publishing process that cannot be
corrupted by scraping failures or model errors. It must scale to hundreds of card products,
keep recurring model/browsing cost low, and be operable by a small team.

## Options considered

| Option | Assessment |
| --- | --- |
| A. Manual recurring review | Accurate per-review but unscalable past dozens of cards; no evidence trail; effectively the status quo. |
| B. Scheduled recrawl + automatic overwrite | Cheapest to build; catastrophic failure mode — a selector change or parse bug rewrites production data. Violates the accuracy rules. |
| C. Deterministic scraping + change detection only | Cheap, auditable, low maintenance; cannot map reworded terms to existing benefits or extract structured fields, so every change is manual work. |
| D. LLM-assisted research/extraction (ungated) | Handles semantics; expensive if run unconditionally and hallucination-prone without deterministic gating and evidence checks. |
| E. Third-party card-data providers | No provider covers benefit-level "use it or lose it" details for our catalog; recurring per-seat cost; provenance opaque; still needs review tooling. |
| F. **Hybrid monitoring + gated extraction + reviewed publishing** | **Chosen.** Deterministic fetch + normalized-content hashing gates everything; the LLM only interprets *changed* content; every change lands as an evidence-backed proposal behind human approval and a transactional publish. |

## Decision

Option F, adapted to the existing stack (Next.js App Router + Supabase + Vercel cron + Resend),
reusing `benefit_hash`, `benefit_history`, `source_url`, the importer's dry-run→commit pattern,
and the established cron idioms (CRON_SECRET, runId, claims via unique constraints, CAS updates).

Key sub-decisions and their rationale:

1. **Immutable raw artifacts in private content-addressed Storage** (`source-artifacts` bucket,
   path `raw/<sha256[0:2]>/<sha256><ext>`). Normalized text alone is insufficient evidence;
   issuer pages are not assumed refetchable. Artifact upload happens before extraction and its
   failure is a retrieval failure. Every materially-changed and proposal-referenced artifact is
   retained. Admin access only via short-lived signed URLs.
2. **`content_version` is the concurrency mechanism**, not `benefit_hash`. A `benefits` trigger
   increments `content_version` whenever any versioned field changes (catches the publish RPC,
   the importer, and manual SQL). Proposals capture `before_version`; publish CAS-checks it;
   rollback restores the proposal's exact immutable `before_value` and refuses if the row moved
   past `published_version`. `benefit_hash` remains the importer-compatible change fingerprint.
3. **Two-tier field contract** (`lib/benefits/benefit-fields.ts`): `BENEFIT_CANONICAL_FIELDS`
   (extraction/diff) and `BENEFIT_VERSIONED_FIELDS` (versioning/history/rollback, adds
   `benefit_status`, `retired_at`, `source_url`, `track_in_memento`). Alignment tests (TS + pgTAP)
   keep extraction, validation, diffing, history, publishing, and rollback on the same field sets.
4. **All safety gates re-enforced inside the publish RPC** (SECURITY DEFINER, service_role-only):
   official source, live source/card/benefit relationships, `benefit_source_links` coverage,
   ok/complete snapshot with artifact, evidence text present in the exact persisted chunk,
   versioned removal-gate pass with negation handling, jsonb key whitelists,
   `publish_block_reason`/`investigation_only` refusals. Expected safety failures return
   `{status:"blocked", reason}` and persist a `publish_blocked` event (no exception). There is
   **no auto-approval capability in v1**.
5. **Retirement, not deletion.** EXPIRE/REMOVE sets `benefit_status='retired'` + `retired_at`;
   `track_in_memento` is never touched by retirement. Only new-tracking surfaces filter retired;
   existing user_benefits and history retain access.
6. **Crash-safe work queue in Postgres** (no new infra): fetch leases on `benefit_sources`,
   extraction lifecycle on `extraction_jobs` (+ per-chunk state in `snapshot_chunks`), expiring
   leases, attempt counts, capped backoff, dead-letter state, stale-claim/stale-run recovery,
   manual retry. Runs are overlap- and rerun-safe.
7. **Proposals and review history are immutable.** Every transition/edit/publish/failure/rollback
   is a `proposal_events` row. Rejected proposals are never overwritten; stronger later evidence
   creates a new linked revision row (`previous_proposal_id`), weaker recurrence logs a
   `reobserved` event.
8. **Provider-agnostic extraction.** `ExtractionProvider` interface; Anthropic implementation via
   the official SDK with strict tool use (schema-guaranteed output) and prompt caching. Model IDs
   are env-configured only (`FRESHNESS_MODEL`, `FRESHNESS_MODEL_ESCALATION`) and validated via the
   Models API before extraction runs. Initial policy: Sonnet 5 routine / Opus 4.8 escalation
   (removals, expirations, ambiguity, low confidence) via a two-pass chunk flow. Haiku promotion
   only after the live eval gate (zero false removals + documented field-accuracy threshold on the
   labeled corpus, report persisted under `data/evals/`).
9. **Cost control:** conditional GETs, raw+normalized hash gating, chunk-level extraction only for
   changed content, bounded extractions per run, cheap-model default with targeted escalation,
   cached static system prompt, per-run token/cost accounting (`pipeline_runs`).
10. **pgTAP over a local Supabase stack** (`supabase test db`) tests migrations, RLS,
    authorization, and every RPC behavior — the TS in-memory mirror alone is not trusted for SQL
    semantics.

## Consequences

- Three new dependencies (`@anthropic-ai/sdk`, `unpdf`, `cheerio`) — all pure-JS,
  serverless-compatible, explicitly approved.
- Local development/testing of the DB layer requires Docker + Supabase CLI.
- The admin surface introduces the app's first privileged role, gated by an `ADMIN_EMAILS`
  allowlist (empty ⇒ surface disabled/404) with reviewer identity always derived from the session.
- Remote actions (db push, deploy, source enablement, live model calls, committed backfill) are
  gated on explicit owner approval and excluded from the v1 local build.

## Known trade-offs

- Issuer pages may require JS rendering or aggressive bot-detection; such sources are surfaced as
  `suspect` by soft-block detection and must be covered via PDFs/`manual_upload` instead. We never
  bypass bot-detection.
- `benefit_hash` keeps its legacy 7-field recipe for importer compatibility; full-fidelity change
  detection rides on the field-level diff + `content_version` instead.
- Vercel Hobby cron granularity is daily; backlogs drain across daily runs by design.
