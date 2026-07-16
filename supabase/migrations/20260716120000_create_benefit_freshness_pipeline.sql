-- Benefit freshness pipeline: source registry, immutable snapshots + chunks,
-- extraction jobs, evidence-backed change proposals, append-only proposal
-- events, source↔benefit coverage links, run summaries, benefit versioning,
-- and the private raw-artifact storage bucket.
--
-- Additive only. Idempotent style (safe to re-run). RLS is enabled on every
-- new table with ZERO policies: the pipeline is service-role only.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Private content-addressed storage bucket for raw source artifacts.
-- No storage.objects policies are created: only the service role may access.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('source-artifacts', 'source-artifacts', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- benefits: additive lifecycle + concurrency columns.
-- ---------------------------------------------------------------------------
alter table if exists public.benefits
  add column if not exists benefit_status text,
  add column if not exists retired_at timestamptz,
  add column if not exists content_version integer;

update public.benefits
set benefit_status = coalesce(benefit_status, 'active'),
    content_version = coalesce(content_version, 1)
where benefit_status is null
   or content_version is null;

alter table if exists public.benefits
  alter column benefit_status set default 'active',
  alter column benefit_status set not null,
  alter column content_version set default 1,
  alter column content_version set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'benefits_benefit_status_check'
      and conrelid = 'public.benefits'::regclass
  ) then
    alter table public.benefits
      add constraint benefits_benefit_status_check
      check (benefit_status in ('active', 'retired'));
  end if;
end;
$$;

create index if not exists benefits_benefit_status_idx
  on public.benefits (benefit_status);

-- Version trigger: bumps content_version whenever any versioned field changes.
-- Catches the publish RPC, the CSV importer, and manual SQL alike. The
-- versioned field list mirrors BENEFIT_VERSIONED_FIELDS in
-- lib/benefits/benefit-fields.ts (canonical fields + benefit_status,
-- retired_at, source_url, track_in_memento). Verification-only fields such as
-- last_verified_at intentionally do NOT bump the version.
create or replace function public.increment_benefit_content_version()
returns trigger
language plpgsql
as $$
begin
  if (new.benefit_name is distinct from old.benefit_name)
    or (new.benefit_value is distinct from old.benefit_value)
    or (new.cadence is distinct from old.cadence)
    or (new.reset_timing is distinct from old.reset_timing)
    or (new.enrollment_required is distinct from old.enrollment_required)
    or (new.requires_setup is distinct from old.requires_setup)
    or (new.display_description is distinct from old.display_description)
    or (new.benefit_status is distinct from old.benefit_status)
    or (new.retired_at is distinct from old.retired_at)
    or (new.source_url is distinct from old.source_url)
    or (new.track_in_memento is distinct from old.track_in_memento)
  then
    new.content_version = coalesce(old.content_version, 1) + 1;
  end if;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'benefits_increment_content_version'
      and tgrelid = 'public.benefits'::regclass
  ) then
    create trigger benefits_increment_content_version
      before update on public.benefits
      for each row
      execute function public.increment_benefit_content_version();
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- benefit_history: completeness columns so snapshots capture the full
-- versioned field contract.
-- ---------------------------------------------------------------------------
alter table if exists public.benefit_history
  add column if not exists display_description text,
  add column if not exists benefit_status text,
  add column if not exists retired_at timestamptz,
  add column if not exists content_version integer;

-- ---------------------------------------------------------------------------
-- benefit_sources: canonical source registry + fetch-phase lease.
-- ---------------------------------------------------------------------------
create table if not exists public.benefit_sources (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  source_type text not null default 'html'
    check (source_type in ('html', 'pdf', 'manual_upload')),
  source_url text not null check (length(trim(source_url)) > 0),
  authority_level text not null default 'official'
    check (authority_level in ('official', 'secondary')),
  parser_strategy text not null default 'generic_html'
    check (parser_strategy in ('generic_html', 'pdf_text')),
  parser_config jsonb,
  check_cadence_days integer not null default 7 check (check_cadence_days > 0),
  monthly_full_verification boolean not null default true,
  enabled boolean not null default false,
  notes text,
  next_check_at timestamptz not null default now(),
  processing_state text not null default 'idle'
    check (processing_state in ('idle', 'fetching', 'dead_letter')),
  claimed_by_run_id uuid,
  claimed_at timestamptz,
  lease_expires_at timestamptz,
  attempt_count integer not null default 0,
  next_retry_at timestamptz,
  last_attempted_at timestamptz,
  last_successful_at timestamptz,
  last_changed_at timestamptz,
  last_content_verified_at timestamptz,
  last_http_status integer,
  etag text,
  last_modified text,
  last_raw_sha256 text,
  last_normalized_sha256 text,
  consecutive_failure_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (card_id, source_url)
);

create index if not exists benefit_sources_due_idx
  on public.benefit_sources (enabled, next_check_at);
create index if not exists benefit_sources_card_id_idx
  on public.benefit_sources (card_id);

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_benefit_sources_updated_at'
      and tgrelid = 'public.benefit_sources'::regclass
  ) then
    create trigger set_benefit_sources_updated_at
      before update on public.benefit_sources
      for each row
      execute function public.set_updated_at();
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- source_snapshots: immutable fetch records. Raw bytes live in the
-- source-artifacts bucket at artifact_path; extracted_text is the normalized
-- document text (capped by the application).
-- ---------------------------------------------------------------------------
create table if not exists public.source_snapshots (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.benefit_sources(id) on delete cascade,
  run_id uuid not null,
  fetched_at timestamptz not null default now(),
  http_status integer,
  content_type text,
  mime_type text,
  content_length integer,
  etag text,
  last_modified text,
  final_url text,
  response_headers jsonb,
  raw_sha256 text not null,
  normalized_sha256 text not null,
  artifact_path text,
  extracted_text text,
  validation_status text not null default 'ok'
    check (validation_status in ('ok', 'suspect')),
  validation_reasons jsonb,
  chunk_count integer,
  chunks_processed integer,
  truncated boolean not null default false,
  extraction_outcome text not null default 'not_required'
    check (extraction_outcome in ('not_required', 'pending', 'extracted', 'partial', 'failed')),
  extraction_model text,
  input_tokens integer,
  output_tokens integer,
  cache_read_tokens integer,
  extraction_error text,
  created_at timestamptz not null default now()
);

create index if not exists source_snapshots_source_fetched_idx
  on public.source_snapshots (source_id, fetched_at desc);

-- ---------------------------------------------------------------------------
-- snapshot_chunks: persistent per-chunk extraction state. chunk_text is the
-- immutable exact text a chunk was extracted from; publish evidence is checked
-- against it.
-- ---------------------------------------------------------------------------
create table if not exists public.snapshot_chunks (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.source_snapshots(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  chunk_id text not null,
  page_number integer,
  section_heading text,
  start_offset integer not null check (start_offset >= 0),
  end_offset integer not null check (end_offset >= start_offset),
  chunk_text text not null,
  status text not null default 'pending'
    check (status in ('pending', 'extracted', 'failed')),
  attempts integer not null default 0,
  model text,
  input_tokens integer,
  output_tokens integer,
  cache_read_tokens integer,
  last_error text,
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (snapshot_id, chunk_index)
);

create index if not exists snapshot_chunks_chunk_id_idx
  on public.snapshot_chunks (chunk_id);

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_snapshot_chunks_updated_at'
      and tgrelid = 'public.snapshot_chunks'::regclass
  ) then
    create trigger set_snapshot_chunks_updated_at
      before update on public.snapshot_chunks
      for each row
      execute function public.set_updated_at();
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- extraction_jobs: extraction lifecycle (leases, attempts, dead-letter).
-- At most one active job per snapshot; completed/superseded history persists.
-- ---------------------------------------------------------------------------
create table if not exists public.extraction_jobs (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.source_snapshots(id) on delete cascade,
  source_id uuid not null references public.benefit_sources(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'claimed', 'completed', 'failed', 'dead_letter', 'superseded')),
  reason text not null default 'content_changed'
    check (reason in ('content_changed', 'monthly_verification', 'manual_retry')),
  claimed_by_run_id uuid,
  claimed_at timestamptz,
  lease_expires_at timestamptz,
  attempt_count integer not null default 0,
  next_retry_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists extraction_jobs_active_snapshot_uidx
  on public.extraction_jobs (snapshot_id)
  where status in ('pending', 'claimed');

create index if not exists extraction_jobs_workable_idx
  on public.extraction_jobs (status)
  where status in ('pending', 'failed');

create index if not exists extraction_jobs_source_idx
  on public.extraction_jobs (source_id);

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_extraction_jobs_updated_at'
      and tgrelid = 'public.extraction_jobs'::regclass
  ) then
    create trigger set_extraction_jobs_updated_at
      before update on public.extraction_jobs
      for each row
      execute function public.set_updated_at();
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- benefit_change_proposals: immutable evidence-backed staged changes.
-- ---------------------------------------------------------------------------
create table if not exists public.benefit_change_proposals (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null,
  source_id uuid not null references public.benefit_sources(id) on delete restrict,
  snapshot_id uuid not null references public.source_snapshots(id) on delete restrict,
  card_id uuid not null references public.cards(id) on delete restrict,
  benefit_id uuid references public.benefits(id) on delete restrict,
  source_url text not null,
  source_authority_level text not null default 'official'
    check (source_authority_level in ('official', 'secondary')),
  investigation_only boolean not null default false,
  publish_block_reason text,
  operation text not null
    check (operation in ('add', 'modify', 'expire', 'remove')),
  before_value jsonb,
  after_value jsonb,
  field_diff jsonb,
  before_version integer,
  effective_date date,
  evidence_excerpt text not null check (length(trim(evidence_excerpt)) > 0),
  evidence_chunk_id text,
  evidence_offset integer,
  confidence numeric(3, 2) not null check (confidence >= 0 and confidence <= 1),
  explanation text not null check (length(trim(explanation)) > 0),
  extractor_version text not null,
  extraction_model text,
  removal_gate jsonb,
  status text not null default 'needs_review'
    check (status in ('needs_review', 'approved', 'rejected', 'published', 'superseded', 'failed', 'rolled_back')),
  dedupe_key text not null,
  seen_count integer not null default 1,
  last_seen_at timestamptz not null default now(),
  revision integer not null default 1,
  previous_proposal_id uuid references public.benefit_change_proposals(id) on delete restrict,
  reviewer_email text,
  reviewed_at timestamptz,
  review_note text,
  edited_after_value jsonb,
  published_at timestamptz,
  published_history_id uuid references public.benefit_history(id) on delete restrict,
  published_version integer,
  rolled_back_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Dedupe window: only actively-open proposals block re-creation. Rejected rows
-- are immutable and do NOT block — stronger later evidence creates a new
-- linked revision row instead.
create unique index if not exists bcp_dedupe_key_active_uidx
  on public.benefit_change_proposals (dedupe_key)
  where status in ('needs_review', 'approved');

create index if not exists bcp_status_idx
  on public.benefit_change_proposals (status);
create index if not exists bcp_card_status_idx
  on public.benefit_change_proposals (card_id, status);
create index if not exists bcp_run_idx
  on public.benefit_change_proposals (run_id);
create index if not exists bcp_dedupe_key_idx
  on public.benefit_change_proposals (dedupe_key);

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_bcp_updated_at'
      and tgrelid = 'public.benefit_change_proposals'::regclass
  ) then
    create trigger set_bcp_updated_at
      before update on public.benefit_change_proposals
      for each row
      execute function public.set_updated_at();
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- proposal_events: append-only audit of every transition, edit, publication,
-- block, failure, and rollback.
-- ---------------------------------------------------------------------------
create table if not exists public.proposal_events (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.benefit_change_proposals(id) on delete cascade,
  event_type text not null
    check (event_type in (
      'created', 'status_changed', 'edited', 'reobserved', 'revision_created',
      'published', 'publish_failed', 'publish_blocked', 'rolled_back', 'superseded'
    )),
  actor text not null,
  from_status text,
  to_status text,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index if not exists proposal_events_proposal_idx
  on public.proposal_events (proposal_id, created_at);

-- ---------------------------------------------------------------------------
-- benefit_source_links: explicit source↔benefit coverage map.
-- ---------------------------------------------------------------------------
create table if not exists public.benefit_source_links (
  benefit_id uuid not null references public.benefits(id) on delete cascade,
  source_id uuid not null references public.benefit_sources(id) on delete cascade,
  is_primary boolean not null default false,
  coverage_type text not null default 'full'
    check (coverage_type in ('full', 'partial', 'mention')),
  created_at timestamptz not null default now(),
  primary key (benefit_id, source_id)
);

create index if not exists benefit_source_links_source_idx
  on public.benefit_source_links (source_id);

-- ---------------------------------------------------------------------------
-- pipeline_runs: one row per monitor run (id = runId).
-- ---------------------------------------------------------------------------
create table if not exists public.pipeline_runs (
  id uuid primary key,
  trigger text not null default 'cron'
    check (trigger in ('cron', 'manual', 'single_source')),
  status text not null default 'running'
    check (status in ('running', 'completed', 'halted', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  sources_due integer not null default 0,
  sources_checked integer not null default 0,
  fetch_failures integer not null default 0,
  suspect_count integer not null default 0,
  not_modified_count integer not null default 0,
  changed_count integer not null default 0,
  extractions_attempted integer not null default 0,
  extractions_failed integer not null default 0,
  extractions_partial integer not null default 0,
  proposals_created integer not null default 0,
  proposals_deduped integer not null default 0,
  proposals_reopened integer not null default 0,
  no_change_verified integer not null default 0,
  scheduled_published integer not null default 0,
  scheduled_failed integer not null default 0,
  leases_recovered integer not null default 0,
  dead_lettered integer not null default 0,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_read_tokens integer not null default 0,
  estimated_cost_usd numeric,
  halted_reason text,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists pipeline_runs_started_idx
  on public.pipeline_runs (started_at desc);

-- ---------------------------------------------------------------------------
-- RLS: service-role only for every pipeline table (no policies on purpose).
-- ---------------------------------------------------------------------------
alter table public.benefit_sources enable row level security;
alter table public.source_snapshots enable row level security;
alter table public.snapshot_chunks enable row level security;
alter table public.extraction_jobs enable row level security;
alter table public.benefit_change_proposals enable row level security;
alter table public.proposal_events enable row level security;
alter table public.benefit_source_links enable row level security;
alter table public.pipeline_runs enable row level security;

-- ---------------------------------------------------------------------------
-- bootstrap_user_benefits_for_card: retired benefits are excluded from NEW
-- tracking. Existing user_benefits rows keep referencing retired benefits.
-- ---------------------------------------------------------------------------
create or replace function public.bootstrap_user_benefits_for_card(p_user_id uuid, p_card_id uuid)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_card_id uuid;
  inserted_count integer;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'cannot bootstrap benefits for another user';
  end if;

  select id into v_user_card_id
  from public.user_cards
  where user_id = p_user_id
    and card_id = p_card_id
  limit 1;

  if v_user_card_id is null then
    return 0;
  end if;

  with inserted as (
    insert into public.user_benefits (user_card_id, benefit_id)
    select v_user_card_id, b.id
    from public.benefits b
    where b.card_id = p_card_id
      and b.track_in_memento = 'yes'
      and b.benefit_status = 'active'
    on conflict (user_card_id, benefit_id) do nothing
    returning 1
  )
  select count(*) into inserted_count from inserted;

  return inserted_count;
end;
$$;
