# Work Order: Benefit Freshness Pipeline (v1)

- **Date:** 2026-07-15
- **Owner:** Haseeb
- **Status:** Local build complete (2026-07-15) — pending owner-approved rollout steps (db push, deploy, backfill --commit, live eval gate, source enablement)
- **Spec:** Approved consolidated specification (Rev 2). ADR: `docs/engineering/adr-benefit-freshness.md`.

## Goal

Detect credit-card benefit changes from authoritative issuer sources, stage them as evidence-backed
change proposals, review them in a new admin surface, and publish approved changes transactionally
with full audit history and rollback. Scraping failures or model errors must never corrupt
production benefit data.

## Scope (v1, local-only)

1. Schema: `benefit_sources`, `source_snapshots`, `snapshot_chunks`, `extraction_jobs`,
   `benefit_change_proposals`, `proposal_events`, `benefit_source_links`, `pipeline_runs`;
   additive `benefits` columns (`benefit_status`, `retired_at`, `content_version` + trigger);
   `benefit_history` completeness columns; private `source-artifacts` storage bucket.
2. Retrieval: allowlisted conditional fetch, immutable raw artifacts, cheerio-based content
   extraction with per-source selectors, soft-block detection, bounded chunking.
3. Extraction: provider-agnostic LLM interface (Anthropic impl, strict tool use, env-configured
   models), two-pass escalation, schema validation failing closed.
4. Reconciliation: evidence-gated candidates, versioned removal gate with negation handling,
   dedupe + immutable revision chains, mass-change guard.
5. Publishing: SECURITY DEFINER RPCs enforcing the full evidence chain, content_version CAS,
   per-proposal-isolated scheduled publishing, exact-state rollback.
6. Admin: allowlist-gated pages + API routes for sources, links, proposals, runs, artifacts
   (signed URLs), config validation.
7. Tests: unit (pure modules), e2e orchestrator suite (in-memory stores/fakes), pgTAP suites
   (local Supabase stack), eval harness (fake-provider mode).
8. Docs: ADR, developer doc, operator doc/playbook, env vars, codebase map update.

## Explicitly out of scope for this work order

Remote `supabase db push`, Vercel deploy, enabling any source, live Anthropic calls
(extraction, live eval, model-ID validation against the real API), committed backfill.
Each requires explicit owner approval (see rollout section of the ADR).

## Validation

`npm test` → `npx tsc --noEmit` → `npm run lint` (new failures only) → `npm run test:db`
(requires Docker + Supabase CLI) → `npm run build`.

## Verification results (2026-07-16)

All layers executed and green:

- `npm test`: **165/165** pass (unit + 15-scenario e2e + eval plumbing).
- `npx tsc --noEmit`: clean.
- `npm run lint`: **0 problems**.
- `npm run build`: succeeds; all new `/admin` and `/api/admin` + cron routes compile.
- Offline eval (`scripts/freshness_eval_extraction.ts`): hard gate PASSED (zero false/missed
  removals, field accuracy 1.0); report in `data/evals/`.
- `npm run test:db` (local Docker Supabase stack): **124/124** pgTAP assertions PASS, run twice
  across back-to-back `supabase db reset` cycles to prove reproducibility.

### Migration reproducibility fixes

The pipeline migrations are additive and applied cleanly. Standing up a fresh local database from
the complete history surfaced three pre-existing migrations that had only ever run against the
hosted DB's historical state. Each fix is idempotent and a no-op where the statements already
succeeded (including hosted); none skips a migration or changes runtime behavior:

1. `20260212120000_benefits_mvp_schema.sql` — seeded-benefits `VALUES` block: every row's
   `value_cents` is `NULL`, so the derived column resolved to `text` and failed assignment to the
   `integer` column. Added an explicit `::integer` cast in the SELECT.
2. `20260213143000_drop_benefits_frequency_and_verify_amex.sql` — the `cadence = frequency`
   backfill referenced the legacy `frequency` column unconditionally, but a fresh DB never has it
   (only the drop was guarded). Wrapped the backfill in an `information_schema.columns` existence
   guard.
3. `20260411143000_memento_benefits_schema.sql` — the `semi_annual → semiannual` normalization ran
   before the guarded drop of the legacy `benefits_cadence_check` constraint, which the MVP seed's
   `saks_credit` row trips on a fresh DB. Moved the (already-guarded) constraint drop ahead of the
   normalization; same statements, corrected order.
