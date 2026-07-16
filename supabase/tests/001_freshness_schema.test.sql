-- pgTAP: freshness pipeline schema, RLS, versioning trigger, dedupe windows,
-- and bootstrap authorization. Run with `supabase test db` (local stack).
begin;
create extension if not exists pgtap with schema extensions;

select plan(65);

-- ---------------------------------------------------------------------------
-- A. Tables exist
-- ---------------------------------------------------------------------------
select has_table('public', 'benefit_sources', 'benefit_sources exists');
select has_table('public', 'source_snapshots', 'source_snapshots exists');
select has_table('public', 'snapshot_chunks', 'snapshot_chunks exists');
select has_table('public', 'extraction_jobs', 'extraction_jobs exists');
select has_table('public', 'benefit_change_proposals', 'benefit_change_proposals exists');
select has_table('public', 'proposal_events', 'proposal_events exists');
select has_table('public', 'benefit_source_links', 'benefit_source_links exists');
select has_table('public', 'pipeline_runs', 'pipeline_runs exists');

-- ---------------------------------------------------------------------------
-- B. benefits carries every versioned-contract field (+ content_version)
--    (mirror of BENEFIT_VERSIONED_FIELDS in lib/benefits/benefit-fields.ts)
-- ---------------------------------------------------------------------------
select has_column('public', 'benefits', 'benefit_name', 'benefits.benefit_name');
select has_column('public', 'benefits', 'benefit_value', 'benefits.benefit_value');
select has_column('public', 'benefits', 'cadence', 'benefits.cadence');
select has_column('public', 'benefits', 'reset_timing', 'benefits.reset_timing');
select has_column('public', 'benefits', 'enrollment_required', 'benefits.enrollment_required');
select has_column('public', 'benefits', 'requires_setup', 'benefits.requires_setup');
select has_column('public', 'benefits', 'display_description', 'benefits.display_description');
select has_column('public', 'benefits', 'benefit_status', 'benefits.benefit_status');
select has_column('public', 'benefits', 'retired_at', 'benefits.retired_at');
select has_column('public', 'benefits', 'source_url', 'benefits.source_url');
select has_column('public', 'benefits', 'track_in_memento', 'benefits.track_in_memento');
select has_column('public', 'benefits', 'content_version', 'benefits.content_version');

-- ---------------------------------------------------------------------------
-- C. benefit_history captures the full versioned contract
-- ---------------------------------------------------------------------------
select has_column('public', 'benefit_history', 'benefit_name', 'history.benefit_name');
select has_column('public', 'benefit_history', 'benefit_value', 'history.benefit_value');
select has_column('public', 'benefit_history', 'cadence', 'history.cadence');
select has_column('public', 'benefit_history', 'reset_timing', 'history.reset_timing');
select has_column('public', 'benefit_history', 'enrollment_required', 'history.enrollment_required');
select has_column('public', 'benefit_history', 'requires_setup', 'history.requires_setup');
select has_column('public', 'benefit_history', 'display_description', 'history.display_description');
select has_column('public', 'benefit_history', 'benefit_status', 'history.benefit_status');
select has_column('public', 'benefit_history', 'retired_at', 'history.retired_at');
select has_column('public', 'benefit_history', 'source_url', 'history.source_url');
select has_column('public', 'benefit_history', 'track_in_memento', 'history.track_in_memento');
select has_column('public', 'benefit_history', 'content_version', 'history.content_version');

-- ---------------------------------------------------------------------------
-- D. RLS enabled on every pipeline table
-- ---------------------------------------------------------------------------
select is((select relrowsecurity from pg_class where oid = 'public.benefit_sources'::regclass), true, 'RLS on benefit_sources');
select is((select relrowsecurity from pg_class where oid = 'public.source_snapshots'::regclass), true, 'RLS on source_snapshots');
select is((select relrowsecurity from pg_class where oid = 'public.snapshot_chunks'::regclass), true, 'RLS on snapshot_chunks');
select is((select relrowsecurity from pg_class where oid = 'public.extraction_jobs'::regclass), true, 'RLS on extraction_jobs');
select is((select relrowsecurity from pg_class where oid = 'public.benefit_change_proposals'::regclass), true, 'RLS on benefit_change_proposals');
select is((select relrowsecurity from pg_class where oid = 'public.proposal_events'::regclass), true, 'RLS on proposal_events');
select is((select relrowsecurity from pg_class where oid = 'public.benefit_source_links'::regclass), true, 'RLS on benefit_source_links');
select is((select relrowsecurity from pg_class where oid = 'public.pipeline_runs'::regclass), true, 'RLS on pipeline_runs');

-- ---------------------------------------------------------------------------
-- E. Zero policies: service-role only
-- ---------------------------------------------------------------------------
select is((select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'benefit_sources'), 0, 'no policies on benefit_sources');
select is((select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'source_snapshots'), 0, 'no policies on source_snapshots');
select is((select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'snapshot_chunks'), 0, 'no policies on snapshot_chunks');
select is((select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'extraction_jobs'), 0, 'no policies on extraction_jobs');
select is((select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'benefit_change_proposals'), 0, 'no policies on benefit_change_proposals');
select is((select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'proposal_events'), 0, 'no policies on proposal_events');
select is((select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'benefit_source_links'), 0, 'no policies on benefit_source_links');
select is((select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'pipeline_runs'), 0, 'no policies on pipeline_runs');

-- ---------------------------------------------------------------------------
-- F. Artifact bucket exists and is private
-- ---------------------------------------------------------------------------
select is((select count(*)::int from storage.buckets where id = 'source-artifacts'), 1, 'source-artifacts bucket exists');
select is((select public from storage.buckets where id = 'source-artifacts'), false, 'source-artifacts bucket is private');

-- ---------------------------------------------------------------------------
-- Seed data (as superuser; RLS bypassed here on purpose)
-- ---------------------------------------------------------------------------
insert into public.cards (id, issuer, brand, card_name, network, product_key, display_name, card_code, card_type)
values ('00000000-0000-0000-0000-000000000001', 'amex', 'Amex', 'Test Platinum', 'Amex', 'test_amex_platinum', 'Test Platinum', 'amex_test_platinum', 'personal');

insert into public.benefit_sources (id, card_id, source_url, authority_level, enabled)
values ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001',
        'https://www.americanexpress.com/us/credit-cards/card/test-platinum/', 'official', true);

insert into public.benefits (
  id, card_id, benefit_key, display_name, category, benefit_code, benefit_name,
  benefit_value, cadence, reset_timing, enrollment_required, requires_setup,
  track_in_memento, source_url, benefit_hash
) values
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001',
   'amex_test_platinum_airline', 'Airline Fee Credit', 'other',
   'amex_test_platinum_airline', 'Airline Fee Credit', 'Up to $200 annually',
   'annual', 'calendar year', true, false, 'yes',
   'https://www.americanexpress.com/us/credit-cards/card/test-platinum/', 'hash-airline'),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001',
   'amex_test_platinum_retired', 'Retired Credit', 'other',
   'amex_test_platinum_retired', 'Retired Credit', 'Up to $50 annually',
   'annual', 'calendar year', false, false, 'yes',
   'https://www.americanexpress.com/us/credit-cards/card/test-platinum/', 'hash-retired');

update public.benefits set benefit_status = 'retired', retired_at = now()
where id = '00000000-0000-0000-0000-000000000021';

insert into public.source_snapshots (
  id, source_id, run_id, raw_sha256, normalized_sha256, artifact_path,
  extracted_text, validation_status, extraction_outcome, chunk_count, chunks_processed
) values ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000010',
          gen_random_uuid(), 'rawsha', 'normsha', 'raw/no/normsha.html',
          'Airline fee credit up to $200 annually.', 'ok', 'extracted', 1, 1);

-- ---------------------------------------------------------------------------
-- G. anon/authenticated are denied (RLS with zero policies)
-- ---------------------------------------------------------------------------
set local role anon;
select is_empty('select id::text from public.benefit_sources', 'anon sees no benefit_sources');
reset role;

set local role authenticated;
select is_empty('select id::text from public.benefit_change_proposals', 'authenticated sees no proposals');
select throws_ok(
  $$insert into public.benefit_sources (card_id, source_url)
    values ('00000000-0000-0000-0000-000000000001', 'https://www.americanexpress.com/x')$$,
  '42501',
  null,
  'authenticated cannot insert benefit_sources'
);
reset role;

-- ---------------------------------------------------------------------------
-- H. content_version trigger: bumps on versioned fields only
-- ---------------------------------------------------------------------------
select is(
  (select content_version from public.benefits where id = '00000000-0000-0000-0000-000000000020'),
  1, 'content_version starts at 1');

update public.benefits set benefit_value = 'Up to $250 annually'
where id = '00000000-0000-0000-0000-000000000020';
select is(
  (select content_version from public.benefits where id = '00000000-0000-0000-0000-000000000020'),
  2, 'versioned field change bumps content_version');

update public.benefits set last_verified_at = now()
where id = '00000000-0000-0000-0000-000000000020';
select is(
  (select content_version from public.benefits where id = '00000000-0000-0000-0000-000000000020'),
  2, 'verification-only update does NOT bump content_version');

update public.benefits set display_description = 'New description'
where id = '00000000-0000-0000-0000-000000000020';
select is(
  (select content_version from public.benefits where id = '00000000-0000-0000-0000-000000000020'),
  3, 'another versioned field change bumps again');

-- ---------------------------------------------------------------------------
-- I. Proposal dedupe window: open statuses block, rejected does not
-- ---------------------------------------------------------------------------
insert into public.benefit_change_proposals (
  id, run_id, source_id, snapshot_id, card_id, benefit_id, source_url,
  operation, evidence_excerpt, confidence, explanation, extractor_version,
  status, dedupe_key
) values ('00000000-0000-0000-0000-000000000040', gen_random_uuid(),
          '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000030',
          '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020',
          'https://www.americanexpress.com/us/credit-cards/card/test-platinum/',
          'modify', 'evidence text', 0.9, 'explanation', 'test/1', 'needs_review', 'dedupe-key-1');

select throws_ok(
  $$insert into public.benefit_change_proposals (
      run_id, source_id, snapshot_id, card_id, benefit_id, source_url,
      operation, evidence_excerpt, confidence, explanation, extractor_version,
      status, dedupe_key
    ) values (gen_random_uuid(),
      '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000030',
      '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020',
      'https://www.americanexpress.com/us/credit-cards/card/test-platinum/',
      'modify', 'evidence text', 0.9, 'explanation', 'test/1', 'needs_review', 'dedupe-key-1')$$,
  '23505',
  null,
  'duplicate active dedupe_key is rejected'
);

update public.benefit_change_proposals set status = 'rejected'
where id = '00000000-0000-0000-0000-000000000040';

select lives_ok(
  $$insert into public.benefit_change_proposals (
      run_id, source_id, snapshot_id, card_id, benefit_id, source_url,
      operation, evidence_excerpt, confidence, explanation, extractor_version,
      status, dedupe_key, revision, previous_proposal_id
    ) values (gen_random_uuid(),
      '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000030',
      '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020',
      'https://www.americanexpress.com/us/credit-cards/card/test-platinum/',
      'modify', 'stronger evidence text', 0.95, 'explanation', 'test/1', 'needs_review',
      'dedupe-key-1', 2, '00000000-0000-0000-0000-000000000040')$$,
  'a rejected proposal does not block a new linked revision with the same dedupe_key'
);

-- ---------------------------------------------------------------------------
-- J. extraction_jobs: one active job per snapshot; history persists
-- ---------------------------------------------------------------------------
insert into public.extraction_jobs (snapshot_id, source_id, status)
values ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000010', 'completed');

insert into public.extraction_jobs (snapshot_id, source_id, status, reason)
values ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000010', 'pending', 'monthly_verification');

select throws_ok(
  $$insert into public.extraction_jobs (snapshot_id, source_id, status)
    values ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000010', 'pending')$$,
  '23505',
  null,
  'only one active extraction job per snapshot'
);

select is(
  (select count(*)::int from public.extraction_jobs
   where snapshot_id = '00000000-0000-0000-0000-000000000030'),
  2, 'completed job history coexists with the active job'
);

-- ---------------------------------------------------------------------------
-- K. CHECK constraints
-- ---------------------------------------------------------------------------
select throws_ok(
  $$insert into public.benefit_sources (card_id, source_url, source_type)
    values ('00000000-0000-0000-0000-000000000001', 'https://www.americanexpress.com/y', 'rss')$$,
  '23514',
  null,
  'invalid source_type rejected'
);

select throws_ok(
  $$insert into public.benefit_change_proposals (
      run_id, source_id, snapshot_id, card_id, source_url,
      operation, evidence_excerpt, confidence, explanation, extractor_version, dedupe_key
    ) values (gen_random_uuid(),
      '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000030',
      '00000000-0000-0000-0000-000000000001',
      'https://www.americanexpress.com/us/credit-cards/card/test-platinum/',
      'add', 'evidence', 1.5, 'explanation', 'test/1', 'dedupe-key-2')$$,
  '23514',
  null,
  'confidence outside 0..1 rejected'
);

-- ---------------------------------------------------------------------------
-- L. bootstrap_user_benefits_for_card excludes retired benefits
-- ---------------------------------------------------------------------------
insert into auth.users (id, email)
values ('00000000-0000-0000-0000-000000009999', 'pgtap-tester@example.com');

insert into public.user_cards (id, user_id, card_id)
values ('00000000-0000-0000-0000-000000000050',
        '00000000-0000-0000-0000-000000009999',
        '00000000-0000-0000-0000-000000000001');

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000009999","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  public.bootstrap_user_benefits_for_card(
    '00000000-0000-0000-0000-000000009999',
    '00000000-0000-0000-0000-000000000001'
  ),
  1,
  'bootstrap inserts only the active benefit (retired excluded)'
);

reset role;

select is(
  (select count(*)::int
   from public.user_benefits ub
   join public.user_cards uc on uc.id = ub.user_card_id
   where uc.user_id = '00000000-0000-0000-0000-000000009999'
     and ub.benefit_id = '00000000-0000-0000-0000-000000000021'),
  0,
  'no user_benefits row exists for the retired benefit'
);

select * from finish();
rollback;
