-- pgTAP: rollback semantics (exact restore, later-change refusal, add-rollback
-- retirement) and scheduled publication with per-proposal failure isolation.
begin;
create extension if not exists pgtap with schema extensions;

select plan(20);

-- ---------------------------------------------------------------------------
-- Seed
-- ---------------------------------------------------------------------------
insert into public.cards (id, issuer, brand, card_name, network, product_key, display_name, card_code, card_type)
values ('20000000-0000-0000-0000-000000000001', 'amex', 'Amex', 'RB Test Card', 'Amex', 'rb_test_card', 'RB Test Card', 'amex_rb_test_card', 'personal');

insert into public.benefit_sources (id, card_id, source_url, authority_level, enabled)
values ('20000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000001',
        'https://www.americanexpress.com/us/credit-cards/card/rb-test/', 'official', true);

insert into public.benefits (
  id, card_id, benefit_key, display_name, category, benefit_code, benefit_name,
  benefit_value, cadence, reset_timing, enrollment_required, requires_setup,
  track_in_memento, source_url, benefit_hash
) values
  ('20000000-0000-0000-0000-000000000020', '20000000-0000-0000-0000-000000000001',
   'rb_a', 'RB Benefit A', 'other', 'rb_a', 'RB Benefit A', 'Up to $200 annually',
   'annual', 'calendar year', true, false, 'yes',
   'https://www.americanexpress.com/us/credit-cards/card/rb-test/', 'hash-rb-a'),
  ('20000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000001',
   'rb_b', 'RB Benefit B', 'other', 'rb_b', 'RB Benefit B', 'Up to $100 annually',
   'annual', 'calendar year', false, false, 'yes',
   'https://www.americanexpress.com/us/credit-cards/card/rb-test/', 'hash-rb-b'),
  ('20000000-0000-0000-0000-000000000022', '20000000-0000-0000-0000-000000000001',
   'rb_c', 'RB Benefit C', 'other', 'rb_c', 'RB Benefit C', 'Up to $25 monthly',
   'monthly', 'calendar month', false, false, 'yes',
   'https://www.americanexpress.com/us/credit-cards/card/rb-test/', 'hash-rb-c'),
  ('20000000-0000-0000-0000-000000000023', '20000000-0000-0000-0000-000000000001',
   'rb_d', 'RB Benefit D', 'other', 'rb_d', 'RB Benefit D', 'Up to $60 annually',
   'annual', 'calendar year', false, false, 'yes',
   'https://www.americanexpress.com/us/credit-cards/card/rb-test/', 'hash-rb-d');

insert into public.benefit_source_links (benefit_id, source_id, is_primary) values
  ('20000000-0000-0000-0000-000000000020', '20000000-0000-0000-0000-000000000010', true),
  ('20000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000010', true),
  ('20000000-0000-0000-0000-000000000022', '20000000-0000-0000-0000-000000000010', true),
  ('20000000-0000-0000-0000-000000000023', '20000000-0000-0000-0000-000000000010', true);

insert into public.source_snapshots (
  id, source_id, run_id, raw_sha256, normalized_sha256, artifact_path,
  extracted_text, validation_status, extraction_outcome, chunk_count, chunks_processed
) values ('20000000-0000-0000-0000-000000000030', '20000000-0000-0000-0000-000000000010',
          gen_random_uuid(), 'raw-rb', 'norm-rb', 'raw/no/norm-rb.html',
          'RB Benefit A is now up to $250 annually. RB Benefit C is discontinued.',
          'ok', 'extracted', 1, 1);

insert into public.snapshot_chunks (snapshot_id, chunk_index, chunk_id, start_offset, end_offset, chunk_text, status)
values ('20000000-0000-0000-0000-000000000030', 0, 'norm-rb#0', 0, 200,
        'RB Benefit A is now up to $250 annually. RB Benefit C is discontinued.', 'extracted');

-- ---------------------------------------------------------------------------
-- 1-9: publish → rollback → exact restore → idempotency → re-proposal
-- ---------------------------------------------------------------------------
insert into public.benefit_change_proposals (
  id, run_id, source_id, snapshot_id, card_id, benefit_id, source_url,
  operation, before_value, after_value, before_version, evidence_excerpt,
  evidence_chunk_id, confidence, explanation, extractor_version, status, dedupe_key
) values (
  '20000000-0000-0000-0000-000000000100', gen_random_uuid(),
  '20000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000030',
  '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000020',
  'https://www.americanexpress.com/us/credit-cards/card/rb-test/',
  'modify',
  jsonb_build_object(
    'benefit_name', 'RB Benefit A', 'benefit_value', 'Up to $200 annually',
    'cadence', 'annual', 'reset_timing', 'calendar year',
    'enrollment_required', true, 'requires_setup', false,
    'display_description', null, 'benefit_status', 'active', 'retired_at', null,
    'source_url', 'https://www.americanexpress.com/us/credit-cards/card/rb-test/',
    'track_in_memento', 'yes', 'benefit_code', 'rb_a', 'benefit_hash', 'hash-rb-a',
    'content_version', 1
  ),
  jsonb_build_object('benefit_value', 'Up to $250 annually'),
  1, 'RB Benefit A is now up to $250 annually', 'norm-rb#0', 0.9,
  'Value increased.', 'test/1', 'approved', 'rb-key-modify-a'
);

select is(
  (public.publish_benefit_change_proposal('20000000-0000-0000-0000-000000000100', 'admin@example.com'))->>'status',
  'published', 'modify publishes (setup)');

select is(
  (public.rollback_published_proposal('20000000-0000-0000-0000-000000000100', 'admin@example.com'))->>'status',
  'rolled_back', 'rollback succeeds');

select is(
  (select benefit_value from public.benefits where id = '20000000-0000-0000-0000-000000000020'),
  'Up to $200 annually', 'benefit restored to the exact before_value');

select is(
  (select content_version from public.benefits where id = '20000000-0000-0000-0000-000000000020'),
  3, 'restore is itself a versioned write (1→2 publish, 2→3 rollback)');

select is(
  (select count(*)::int from public.benefit_history
   where benefit_id = '20000000-0000-0000-0000-000000000020'
     and change_summary like 'rollback of proposal%'),
  1, 'rollback history snapshot written');

select ok(
  (select status = 'rolled_back' and rolled_back_at is not null
   from public.benefit_change_proposals
   where id = '20000000-0000-0000-0000-000000000100'),
  'proposal marked rolled_back with timestamp');

select is(
  (select count(*)::int from public.proposal_events
   where proposal_id = '20000000-0000-0000-0000-000000000100' and event_type = 'rolled_back'),
  1, 'rolled_back event persisted');

select is(
  (public.rollback_published_proposal('20000000-0000-0000-0000-000000000100', 'admin@example.com'))->>'status',
  'noop', 're-rollback is a no-op');

select lives_ok(
  $$insert into public.benefit_change_proposals (
      run_id, source_id, snapshot_id, card_id, benefit_id, source_url,
      operation, before_version, evidence_excerpt, evidence_chunk_id,
      confidence, explanation, extractor_version, status, dedupe_key
    ) values (gen_random_uuid(),
      '20000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000030',
      '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000020',
      'https://www.americanexpress.com/us/credit-cards/card/rb-test/',
      'modify', 3, 'RB Benefit A is now up to $250 annually', 'norm-rb#0',
      0.9, 'seen again', 'test/1', 'needs_review', 'rb-key-modify-a')$$,
  'the same change may be legitimately re-proposed after rollback');

-- ---------------------------------------------------------------------------
-- 10-12: rollback refuses to overwrite later changes
-- ---------------------------------------------------------------------------
insert into public.benefit_change_proposals (
  id, run_id, source_id, snapshot_id, card_id, benefit_id, source_url,
  operation, before_value, after_value, before_version, evidence_excerpt,
  evidence_chunk_id, confidence, explanation, extractor_version, status, dedupe_key
) values (
  '20000000-0000-0000-0000-000000000101', gen_random_uuid(),
  '20000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000030',
  '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000021',
  'https://www.americanexpress.com/us/credit-cards/card/rb-test/',
  'modify',
  jsonb_build_object(
    'benefit_name', 'RB Benefit B', 'benefit_value', 'Up to $100 annually',
    'cadence', 'annual', 'reset_timing', 'calendar year',
    'enrollment_required', false, 'requires_setup', false,
    'display_description', null, 'benefit_status', 'active', 'retired_at', null,
    'source_url', 'https://www.americanexpress.com/us/credit-cards/card/rb-test/',
    'track_in_memento', 'yes', 'benefit_code', 'rb_b', 'benefit_hash', 'hash-rb-b',
    'content_version', 1
  ),
  jsonb_build_object('benefit_value', 'Up to $150 annually'),
  1, 'RB Benefit A is now up to $250 annually', 'norm-rb#0', 0.9,
  'Value increased.', 'test/1', 'approved', 'rb-key-modify-b'
);

select is(
  (public.publish_benefit_change_proposal('20000000-0000-0000-0000-000000000101', 'admin@example.com'))->>'status',
  'published', 'second publish (setup)');

-- A later, unrelated change lands on the benefit.
update public.benefits set benefit_value = 'Up to $175 annually'
where id = '20000000-0000-0000-0000-000000000021';

select is(
  (public.rollback_published_proposal('20000000-0000-0000-0000-000000000101', 'admin@example.com'))->>'reason',
  'benefit_changed_since_publish', 'rollback refuses to overwrite later changes');

select is(
  (select count(*)::int from public.proposal_events
   where proposal_id = '20000000-0000-0000-0000-000000000101'
     and event_type = 'publish_blocked'
     and detail->>'action' = 'rollback'),
  1, 'rollback refusal persisted as an audited event');

-- ---------------------------------------------------------------------------
-- 13-15: rolling back an ADD retires the created benefit (never deletes)
-- ---------------------------------------------------------------------------
insert into public.benefit_change_proposals (
  id, run_id, source_id, snapshot_id, card_id, source_url,
  operation, after_value, evidence_excerpt, evidence_chunk_id, confidence,
  explanation, extractor_version, status, dedupe_key
) values (
  '20000000-0000-0000-0000-000000000102', gen_random_uuid(),
  '20000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000030',
  '20000000-0000-0000-0000-000000000001',
  'https://www.americanexpress.com/us/credit-cards/card/rb-test/',
  'add',
  jsonb_build_object(
    'benefit_code', 'rb_new_credit', 'benefit_name', 'RB New Credit',
    'benefit_value', 'Up to $15 monthly', 'cadence', 'monthly'
  ),
  'RB Benefit A is now up to $250 annually', 'norm-rb#0', 0.9,
  'New benefit.', 'test/1', 'approved', 'rb-key-add'
);

select is(
  (public.publish_benefit_change_proposal('20000000-0000-0000-0000-000000000102', 'admin@example.com'))->>'status',
  'published', 'add publishes (setup)');

select is(
  (public.rollback_published_proposal('20000000-0000-0000-0000-000000000102', 'admin@example.com'))->>'status',
  'rolled_back', 'add rollback succeeds');

select ok(
  (select benefit_status = 'retired' and retired_at is not null
   from public.benefits where benefit_code = 'rb_new_credit'),
  'add rollback retires the created benefit instead of deleting it');

-- ---------------------------------------------------------------------------
-- 16-20: scheduled publication isolates per-proposal failures
-- ---------------------------------------------------------------------------
create or replace function public.test_boom_trigger()
returns trigger language plpgsql as $$
begin
  if new.benefit_value = 'BOOM' then
    raise exception 'boom';
  end if;
  return new;
end;
$$;

create trigger test_boom before update on public.benefits
for each row execute function public.test_boom_trigger();

insert into public.benefit_change_proposals (
  id, run_id, source_id, snapshot_id, card_id, benefit_id, source_url,
  operation, before_value, after_value, before_version, effective_date,
  evidence_excerpt, evidence_chunk_id, confidence, explanation,
  extractor_version, status, dedupe_key, removal_gate
) values
  -- Good: due expiration of RB Benefit C with a valid gate.
  ('20000000-0000-0000-0000-000000000103', gen_random_uuid(),
   '20000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000030',
   '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000022',
   'https://www.americanexpress.com/us/credit-cards/card/rb-test/',
   'expire',
   jsonb_build_object('benefit_value', 'Up to $25 monthly', 'content_version', 1, 'benefit_hash', 'hash-rb-c'),
   null, 1, current_date - 1,
   'RB Benefit C is discontinued', 'norm-rb#0', 0.9, 'Due expiration.',
   'test/1', 'approved', 'rb-key-sched-good',
   '{"version":1,"passed":true,"matched_phrases":["discontinued"],"negated_phrases":[],"reasons":[]}'::jsonb),
  -- Bad: due modify that hits an unexpected database failure.
  ('20000000-0000-0000-0000-000000000104', gen_random_uuid(),
   '20000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000030',
   '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000023',
   'https://www.americanexpress.com/us/credit-cards/card/rb-test/',
   'modify',
   jsonb_build_object('benefit_value', 'Up to $60 annually', 'content_version', 1, 'benefit_hash', 'hash-rb-d'),
   jsonb_build_object('benefit_value', 'BOOM'),
   1, current_date - 1,
   'RB Benefit A is now up to $250 annually', 'norm-rb#0', 0.9, 'Forced failure.',
   'test/1', 'approved', 'rb-key-sched-boom', null),
  -- Future: not due yet; the sweep must not touch it.
  ('20000000-0000-0000-0000-000000000105', gen_random_uuid(),
   '20000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000030',
   '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000021',
   'https://www.americanexpress.com/us/credit-cards/card/rb-test/',
   'modify',
   jsonb_build_object('benefit_value', 'Up to $175 annually', 'content_version', 3, 'benefit_hash', 'hash-rb-b'),
   jsonb_build_object('benefit_value', 'Up to $180 annually'),
   3, current_date + 30,
   'RB Benefit A is now up to $250 annually', 'norm-rb#0', 0.9, 'Future change.',
   'test/1', 'approved', 'rb-key-sched-future', null);

select is(
  (public.publish_due_scheduled_proposals())->>'published',
  '1', 'sweep publishes the due valid proposal');

-- Re-running the sweep: the good one is already published (no longer approved),
-- the boom one fails again — proving one bad proposal never blocks others.
select is(
  (public.publish_due_scheduled_proposals())->>'failed',
  '1', 'the failing proposal keeps failing in isolation');

select is(
  (select status from public.benefit_change_proposals where id = '20000000-0000-0000-0000-000000000105'),
  'approved', 'future-dated proposal untouched by the sweep');

select is(
  (select status from public.benefit_change_proposals where id = '20000000-0000-0000-0000-000000000103'),
  'published', 'due valid proposal is published');

select ok(
  (select count(*) >= 1 from public.proposal_events
   where proposal_id = '20000000-0000-0000-0000-000000000104'
     and event_type = 'publish_failed'),
  'the failing scheduled proposal has an audited publish_failed event');

drop trigger test_boom on public.benefits;

select * from finish();
rollback;
