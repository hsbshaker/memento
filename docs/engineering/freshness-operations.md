# Benefit Freshness Pipeline — Operations Playbook

Audience: whoever operates monitoring + review. Developer details:
`freshness-pipeline.md`. Decisions: `adr-benefit-freshness.md`.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `ADMIN_EMAILS` | for /admin | Comma-separated allowlist. Empty ⇒ the entire admin surface 404s (fails closed). Reviewer identity always comes from the session. |
| `CRON_SECRET` | yes | Bearer auth for `/api/cron/monitor-sources` (Vercel injects it for cron). |
| `SUPABASE_SERVICE_ROLE_KEY` (+ URL) | yes | Pipeline tables are service-role-only (RLS with zero policies). |
| `ANTHROPIC_API_KEY` | for extraction | Without it runs are fetch-only (hash gating still works). |
| `FRESHNESS_MODEL` | for extraction | Routine extraction model. Initial policy: `claude-sonnet-5`. |
| `FRESHNESS_MODEL_ESCALATION` | recommended | Second-pass model for removals/expirations/ambiguity/low confidence. Initial policy: `claude-opus-4-8`. |
| `RESEND_API_KEY`, `EMAIL_FROM` | for alerts | Alert emails (repeated failures, suspect streaks, dead-letters, mass-change halts, run failures, model-config errors). |
| `FRESHNESS_ALERT_EMAIL` | optional | Alert recipient; defaults to the first `ADMIN_EMAILS` entry. |
| `FRESHNESS_INPUT_COST_PER_MTOK` / `FRESHNESS_OUTPUT_COST_PER_MTOK` | optional | Enables `estimated_cost_usd` on runs (no pricing is hardcoded). |
| Tuning knobs | optional | `FRESHNESS_BATCH_LIMIT` (25), `FRESHNESS_TIME_BUDGET_MS` (250000), `FRESHNESS_MAX_EXTRACTIONS_PER_RUN` (4), `FRESHNESS_MAX_PROPOSALS_PER_RUN` (25), `FRESHNESS_CARD_CHANGE_RATIO` (0.4), `FRESHNESS_MASS_CHANGE_MIN_TRIP` (3), `FRESHNESS_FAILURE_ALERT_THRESHOLD` (3), `FRESHNESS_LEASE_MINUTES` (10), `FRESHNESS_MAX_ATTEMPTS` (5). |

## Model policy (extraction accuracy > cost)

- Routine: `FRESHNESS_MODEL=claude-sonnet-5`. Escalation:
  `FRESHNESS_MODEL_ESCALATION=claude-opus-4-8` — automatically re-runs chunks
  containing removal claims, expirations, ambiguous matches, or confidence
  below 0.6.
- **Haiku promotion criterion:** routine extraction may move to
  `claude-haiku-4-5` only after a LIVE eval run on the current corpus shows
  **zero false removals** and **field accuracy ≥ 0.98**
  (`scripts/freshness_eval_extraction.ts --live`), with the report persisted
  under `data/evals/`. Until then, do not downgrade.
- Model ids are validated against the Models API before extraction; a bad id
  is a clear configuration error (alert + run summary), never a mid-run
  surprise. Smoke test after deploys: **Runs → Validate model config**.

## The hard rollout gate

Before enabling ANY source:

1. `npx tsx scripts/freshness_eval_extraction.ts --live` (spends tokens —
   owner approval required).
2. The report must show `hard_gate.passed: true` (zero false removals +
   field accuracy ≥ threshold). It records model, prompt hash, extractor,
   removal-gate, and corpus versions.
3. Keep the report in `data/evals/` (committed) as the enablement record.

## Runbooks

### Deploy / first-time setup (each step needs owner approval)

1. `supabase db push` the two `20260716*` migrations to the hosted project.
2. Set env vars in Vercel; deploy (vercel.json registers the third cron,
   daily 11:00 UTC — current Vercel Hobby allows up to 100 daily crons).
3. Backfill the registry: `npx tsx scripts/memento_backfill_benefit_sources.ts`
   (dry-run → review `data/previews/memento/benefit_sources_*.json`) then
   `--commit`. All sources are created **disabled** with coverage links seeded.
4. Run the live eval gate (above).
5. In `/admin/sources`: pick 2–3 Amex sources → **Test fetch** to tune
   `parser_config` (selectors, expected markers, min length) → **Enable** →
   **Run now** → review the run and any proposals.
6. Expand in weekly batches per issuer, watching `/admin` health and alerts.

### Manual triggers

- Whole run: `curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/monitor-sources`
- One source, immediately: source detail → **Run now**.
- Schedule for next cron: **Recheck next cron**.
- Release approved effective-dated changes without waiting: Runs →
  **Publish due scheduled changes** (failures isolated per proposal).

### Reviewing a proposal

Proposal detail shows the field diff, the immutable evidence excerpt (with its
exact chunk + a signed link to the raw artifact), the removal-gate verdict,
the audit trail, revision chain, and prior benefit_history versions.

- **Approve** (optionally **Edit before approve** — only contract fields,
  server-validated) → **Publish**.
- Publish returns `blocked: <reason>` when any safety check fails (secondary
  source, missing coverage link, suspect/partial snapshot, missing artifact,
  evidence not in the chunk, failed/outdated removal gate, unknown after
  fields…). Every block is audited. Fix the cause or reject.
- `superseded` means the benefit changed after the proposal was created —
  the pipeline will re-propose against current state.
- **Roll back** restores the exact pre-publish state; it refuses (audited) if
  the benefit changed after publication — resolve manually in that case.
- **Reject** is sticky: the identical claim only logs `reobserved`. Materially
  stronger evidence (higher confidence / new discontinuation language /
  corroborating source) opens a NEW linked revision for review.
- `investigation_only` rows (secondary sources) are signals — investigate and
  register/enable an official source; they can never publish.

### Alert responses

| Alert | Meaning | Action |
| --- | --- | --- |
| `source_unavailable` | N consecutive fetch failures or suspect responses | Open source detail → Test fetch. Selector drift ⇒ tune `parser_config`; bot-blocked ⇒ do NOT bypass — disable and cover via PDF/manual_upload source. |
| `mass_change_halt` | A run proposed changes to an unusually high share of a card | Treat as parser/source failure. Inspect the snapshot artifact + Test fetch. Nothing was inserted. Fix, then Retry/Run now. |
| `dead_letter` | Work exhausted `FRESHNESS_MAX_ATTEMPTS` | Source detail → **Retry** re-queues (jobs become `manual_retry`). Investigate `last_error` first. |
| `model_config_error` | Model id/key failed validation | Fix env vars; **Validate model config**; extraction was skipped, fetching continued. |
| `run_failed` | Unexpected orchestrator error | Check Vercel logs by `runId`. Runs are rerun-safe; stale runs/leases are reconciled automatically on the next run. |

### Staleness dashboard (`/admin`)

`current` / `verification_due` (>1.5× cadence) / `stale` (>3×) /
`source_unavailable` / `review_required`, plus cards without enabled sources,
benefits with zero coverage links, and secondary-only cards. A 304/unchanged
fetch renews benefit verification only against a previously fully-processed
snapshot for coverage-linked benefits; monthly semantic verification re-runs
extraction on the preserved artifact (never a bare timestamp renewal).

### Artifacts & retention

Raw bytes live content-addressed in the private `source-artifacts` bucket;
admin access only via 60-second signed URLs (`/api/admin/artifacts/<snapshotId>`).
Every materially-changed and proposal-referenced artifact is permanent; only
unchanged, unreferenced snapshots beyond the newest 5 per source are pruned.

## Local development

- Full JS suite: `npm test` → `npx tsc --noEmit` → `npm run lint` (new
  failures only) → `npm run build`.
- SQL suite: requires Docker + Supabase CLI → `supabase start` then
  `npm run test:db` (pgTAP over both migrations and all RPC behaviors).
- Offline eval: `npx tsx scripts/freshness_eval_extraction.ts`.

## Explicitly gated actions (owner approval required)

Remote `supabase db push` · Vercel deploy · enabling any source · any live
Anthropic call (extraction runs, `--live` eval, model validation against the
real API) · `memento_backfill_benefit_sources.ts --commit`.
