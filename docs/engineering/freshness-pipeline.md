# Benefit Freshness Pipeline — Developer Guide

Companion docs: `adr-benefit-freshness.md` (decisions), `freshness-operations.md`
(operator playbook). Everything lives under `lib/freshness/`, the admin surface
under `app/admin` + `app/api/admin`, and the schema in the two
`20260716*` migrations.

## Architecture

```
vercel cron (daily) ──► /api/cron/monitor-sources ──► runMonitorSources()
                                                        │
  0. publish_due_scheduled_proposals() RPC  (FIRST, isolated per proposal)
  1. crash recovery (expired leases → retry/dead-letter; stale runs)
  2. PHASE A  fetch: claim source → allowlisted conditional fetch
       failed      → backoff + alert threshold (NEVER proposals)
       304         → renew linked-benefit verification only against a prior
                     fully-processed snapshot; monthly-due ⇒ re-extraction job
       200 ok      → raw artifact (content-addressed, private bucket)
                     → cheerio/pdf parse → soft-block validation
                     → suspect ⇒ preserved snapshot, nothing else
                     → hash gate: unchanged ⇒ done; changed ⇒ snapshot +
                       snapshot_chunks + extraction_job (supersedes older jobs)
  3. PHASE B  extraction (bounded): claim job → per-chunk extraction
       pass 1 routine model over pending/failed chunks (completed chunks reuse
       their persisted result) → flag removal/expiry/ambiguous/low-confidence
       chunks → pass 2 escalation model on flagged chunks only
       → reconcile (evidence gate, matching, diff, removal gate)
       → mass-change guard (halt BEFORE any insert)
       → proposals (dedupe / reobserved / stronger-evidence revision)
       → NO_CHANGE benefits verified (coverage-linked only)
  4. finishRun (counters, token usage, estimated cost)
```

Publishing is entirely in SQL (`publish_benefit_change_proposal`,
`rollback_published_proposal` — SECURITY DEFINER, service_role-only) so a
human-approved change applies atomically with a full `benefit_history`
snapshot, `content_version` CAS, and append-only `proposal_events`.

## Dependency-injection seams (how the tests work)

`runMonitorSources(runId, trigger, deps)` receives everything:

| Dep | Production (`production-deps.ts`) | Tests |
| --- | --- | --- |
| `store: FreshnessStore` | `createSupabaseFreshnessStore` (thin adapter) | `InMemoryFreshnessStore` (+ RPC-semantics mirror) |
| `artifactStore` | Supabase Storage bucket `source-artifacts` | `InMemoryArtifactStore` |
| `fetchImpl` | global `fetch` | scripted `Response`s |
| `extractionProvider` | Anthropic strict tool use (`extraction-provider.ts`) | `createFakeExtractionProvider` |
| `publishDueScheduled` | `publish_due_scheduled_proposals` RPC | in-memory sweep |
| `clock` | `() => new Date()` | fixed, manually advanced |
| `validateModels` | Models API lookup (cached) | stub |
| `sendAlert` | Resend (`alerts.ts`) | captured array |

Pure modules (allowlist, html-content, content-validation, chunking,
extraction-schema, removal-gate, reconcile, dedupe-key, evidence-strength,
mass-change-guard, staleness, scheduling, leases, cost, validators) have
colocated unit tests. `run-monitor.e2e.test.ts` drives the orchestrator through
15 scenarios with zero network/DB/LLM.

## Test layers

| Layer | Command | Covers |
| --- | --- | --- |
| Unit + e2e | `npm test` | all pure logic + orchestrator behavior |
| Types | `npx tsc --noEmit` | |
| Lint | `npm run lint` | pre-existing failures exist; only new ones count |
| SQL (pgTAP) | `npm run test:db` (requires Docker + Supabase CLI: `supabase start` first) | migrations, RLS, version trigger, dedupe windows, the full publish evidence chain, blocked-result semantics, rollback CAS, scheduled-sweep isolation, transaction atomicity, bootstrap filter |
| Eval harness | `npx tsx scripts/freshness_eval_extraction.ts` (offline) / `--live` (gated) | production extraction path against the labeled corpus |
| Build | `npm run build` | |

## Field contracts

`lib/benefits/benefit-fields.ts` is the single source of truth:

- `BENEFIT_CANONICAL_FIELDS` — what extraction/diffing reason about.
- `BENEFIT_VERSIONED_FIELDS` — what bumps `benefits.content_version` and is
  captured in `before_value`/`after_value`, `benefit_history`, and rollback
  (canonical + `benefit_status`, `retired_at`, `source_url`,
  `track_in_memento`). `last_verified_at` is verification-only and excluded.

Alignment is enforced by `benefit-fields.test.ts` (including a drift test that
greps the publish-RPC SQL), `extraction-schema.test.ts`, and pgTAP column
assertions + whitelist rejection tests. If you add a field: update the
contract, the migrations (benefits + benefit_history + version trigger + RPC
whitelist/apply/restore), the extraction schema, and the tests will point at
anything missed.

## Safety invariants (do not weaken)

1. Fetch/parse/soft-block failures and absent benefits can never produce a
   REMOVE or mark anything verified.
2. REMOVE/EXPIRE requires the persisted, versioned removal gate
   (`removal-gate.ts`, negation-aware) — re-verified in SQL; failing candidates
   carry `publish_block_reason='removal_gate_failed'` and are structurally
   non-publishable.
3. Evidence must be verbatim in the exact persisted chunk (checked in TS at
   reconcile and again in SQL at publish).
4. Only two writers touch `benefits`: NO_CHANGE verification timestamps and
   the publish RPC. No auto-approval exists.
5. Partial/truncated documents verify nothing (`extraction_outcome='partial'`).
6. Secondary sources yield `investigation_only` proposals; the RPC refuses them.
7. `content_version` (not `benefit_hash`) is the concurrency mechanism.
8. Proposals and events are immutable; corrections create linked revisions.
9. Retrieved content is untrusted data — allowlisted HTTPS fetch, size caps,
   untrusted-content prompt framing, text-only rendering in admin, private
   artifacts behind short-lived signed URLs.

## Adding an issuer

1. Add the hosts to `ISSUER_ALLOWED_HOSTS` (`lib/freshness/allowlist.ts`).
2. Register sources (admin UI or backfill), tune `parser_config`
   (content/ignore selectors, expected markers, min length) with Test fetch.
3. Extend the eval corpus with labeled documents for the issuer and re-run the
   live gate before enabling sources.
