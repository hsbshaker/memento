-- pgTAP: publish RPC — evidence chain, blocked results + persisted events,
-- version CAS, per-operation apply, and transaction atomicity.
begin;
create extension if not exists pgtap with schema extensions;

select plan(39);

-- ---------------------------------------------------------------------------
-- Seed: card, sources, benefits, snapshots, chunks, links
-- ---------------------------------------------------------------------------
insert into public.cards (id, issuer, brand, card_name, network, product_key, display_name, card_code, card_type)
values ('10000000-0000-0000-0000-000000000001', 'amex', 'Amex', 'Pub Test Card', 'Amex', 'pub_test_card', 'Pub Test Card', 'amex_pub_test_card', 'personal');

insert into public.benefit_sources (id, card_id, source_url, authority_level, enabled) values
  ('10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000001',
   'https://www.americanexpress.com/us/credit-cards/card/pub-test/', 'official', true),
  ('10000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001',
   'https://www.americanexpress.com/us/credit-cards/card/pub-test/secondary/', 'secondary', true);

insert into public.benefits (
  id, card_id, benefit_key, display_name, category, benefit_code, benefit_name,
  benefit_value, cadence, reset_timing, enrollment_required, requires_setup,
  track_in_memento, source_url, benefit_hash
) values
  ('10000000-0000-0000-0000-000000000020', '10000000-0000-0000-0000-000000000001',
   'pub_a', 'Benefit A', 'other', 'pub_a', 'Benefit A', 'Up to $200 annually',
   'annual', 'calendar year', true, false, 'yes',
   'https://www.americanexpress.com/us/credit-cards/card/pub-test/', 'hash-a'),
  ('10000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000001',
   'pub_b', 'Benefit B', 'other', 'pub_b', 'Benefit B', 'Up to $100 annually',
   'annual', 'calendar year', false, false, 'yes',
   'https://www.americanexpress.com/us/credit-cards/card/pub-test/', 'hash-b'),
  ('10000000-0000-0000-0000-000000000022', '10000000-0000-0000-0000-000000000001',
   'pub_c', 'Benefit C', 'other', 'pub_c', 'Benefit C', 'Up to $50 monthly',
   'monthly', 'calendar month', false, false, 'yes',
   'https://www.americanexpress.com/us/credit-cards/card/pub-test/', 'hash-c'),
  ('10000000-0000-0000-0000-000000000023', '10000000-0000-0000-0000-000000000001',
   'pub_d', 'Benefit D', 'other', 'pub_d', 'Benefit D', 'Up to $75 annually',
   'annual', 'calendar year', false, false, 'yes',
   'https://www.americanexpress.com/us/credit-cards/card/pub-test/', 'hash-d'),
  ('10000000-0000-0000-0000-000000000024', '10000000-0000-0000-0000-000000000001',
   'pub_e', 'Benefit E', 'other', 'pub_e', 'Benefit E', 'Up to $10 monthly',
   'monthly', 'calendar month', false, false, 'yes',
   'https://www.americanexpress.com/us/credit-cards/card/pub-test/', 'hash-e');

-- Coverage links (benefit D intentionally unlinked).
insert into public.benefit_source_links (benefit_id, source_id, is_primary) values
  ('10000000-0000-0000-0000-000000000020', '10000000-0000-0000-0000-000000000010', true),
  ('10000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000010', true),
  ('10000000-0000-0000-0000-000000000022', '10000000-0000-0000-0000-000000000010', true),
  ('10000000-0000-0000-0000-000000000024', '10000000-0000-0000-0000-000000000010', true),
  ('10000000-0000-0000-0000-000000000020', '10000000-0000-0000-0000-000000000011', false),
  ('10000000-0000-0000-0000-000000000022', '10000000-0000-0000-0000-000000000011', false);

-- Snapshots: ok / suspect / partial / missing-artifact.
insert into public.source_snapshots (
  id, source_id, run_id, raw_sha256, normalized_sha256, artifact_path,
  extracted_text, validation_status, extraction_outcome, chunk_count, chunks_processed
) values
  ('10000000-0000-0000-0000-000000000030', '10000000-0000-0000-0000-000000000010',
   gen_random_uuid(), 'raw-ok', 'norm-ok', 'raw/no/norm-ok.html',
   'Benefit A is now up to $250 annually. Benefit C is discontinued for all cardmembers.',
   'ok', 'extracted', 1, 1),
  ('10000000-0000-0000-0000-000000000031', '10000000-0000-0000-0000-000000000010',
   gen_random_uuid(), 'raw-sus', 'norm-sus', 'raw/no/norm-sus.html',
   'Benefit A is now up to $250 annually.', 'suspect', 'extracted', 1, 1),
  ('10000000-0000-0000-0000-000000000032', '10000000-0000-0000-0000-000000000010',
   gen_random_uuid(), 'raw-part', 'norm-part', 'raw/no/norm-part.html',
   'Benefit A is now up to $250 annually.', 'ok', 'partial', 2, 1),
  ('10000000-0000-0000-0000-000000000033', '10000000-0000-0000-0000-000000000010',
   gen_random_uuid(), 'raw-noart', 'norm-noart', null,
   'Benefit A is now up to $250 annually.', 'ok', 'extracted', 1, 1);

insert into public.snapshot_chunks (snapshot_id, chunk_index, chunk_id, start_offset, end_offset, chunk_text, status) values
  ('10000000-0000-0000-0000-000000000030', 0, 'norm-ok#0', 0, 200,
   'Benefit A is now up to $250 annually. Benefit C is discontinued for all cardmembers.', 'extracted'),
  ('10000000-0000-0000-0000-000000000031', 0, 'norm-sus#0', 0, 100,
   'Benefit A is now up to $250 annually.', 'extracted'),
  ('10000000-0000-0000-0000-000000000032', 0, 'norm-part#0', 0, 100,
   'Benefit A is now up to $250 annually.', 'extracted'),
  ('10000000-0000-0000-0000-000000000033', 0, 'norm-noart#0', 0, 100,
   'Benefit A is now up to $250 annually.', 'extracted');

-- Proposal factory columns are repeated; per-scenario rows below.
-- Happy-path MODIFY on Benefit A (approved, before_version 1).
insert into public.benefit_change_proposals (
  id, run_id, source_id, snapshot_id, card_id, benefit_id, source_url,
  operation, before_value, after_value, field_diff, before_version,
  evidence_excerpt, evidence_chunk_id, confidence, explanation,
  extractor_version, status, dedupe_key, reviewer_email
) values (
  '10000000-0000-0000-0000-000000000100', gen_random_uuid(),
  '10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000030',
  '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000020',
  'https://www.americanexpress.com/us/credit-cards/card/pub-test/',
  'modify',
  jsonb_build_object(
    'benefit_name', 'Benefit A', 'benefit_value', 'Up to $200 annually',
    'cadence', 'annual', 'reset_timing', 'calendar year',
    'enrollment_required', true, 'requires_setup', false,
    'display_description', null, 'benefit_status', 'active', 'retired_at', null,
    'source_url', 'https://www.americanexpress.com/us/credit-cards/card/pub-test/',
    'track_in_memento', 'yes', 'benefit_code', 'pub_a', 'benefit_hash', 'hash-a',
    'content_version', 1
  ),
  jsonb_build_object(
    'benefit_name', 'Benefit A', 'benefit_value', 'Up to $250 annually',
    'cadence', 'annual', 'reset_timing', 'calendar year',
    'enrollment_required', true, 'requires_setup', false,
    'display_description', null, 'benefit_status', 'active', 'retired_at', null,
    'source_url', 'https://www.americanexpress.com/us/credit-cards/card/pub-test/',
    'track_in_memento', 'yes', 'benefit_code', 'pub_a', 'benefit_hash', 'hash-a',
    'content_version', null
  ),
  jsonb_build_array(jsonb_build_object('field', 'benefit_value', 'before', 'Up to $200 annually', 'after', 'Up to $250 annually')),
  1,
  'Benefit A is now up to $250 annually', 'norm-ok#0', 0.92, 'Value increased.',
  'test/1', 'approved', 'pub-key-modify-a', 'admin@example.com'
);

-- 1-7: happy modify, effects, idempotency ------------------------------------
select is(
  (public.publish_benefit_change_proposal('10000000-0000-0000-0000-000000000100', 'admin@example.com'))->>'status',
  'published', 'modify publishes');

select is(
  (select benefit_value from public.benefits where id = '10000000-0000-0000-0000-000000000020'),
  'Up to $250 annually', 'benefit value updated');

select is(
  (select content_version from public.benefits where id = '10000000-0000-0000-0000-000000000020'),
  2, 'content_version bumped by publish');

select is(
  (select published_version from public.benefit_change_proposals where id = '10000000-0000-0000-0000-000000000100'),
  2, 'published_version recorded');

select is(
  (select count(*)::int from public.benefit_history
   where benefit_id = '10000000-0000-0000-0000-000000000020'
     and change_type = 'updated' and content_version = 2),
  1, 'history snapshot written with change_type updated');

select is(
  (select count(*)::int from public.proposal_events
   where proposal_id = '10000000-0000-0000-0000-000000000100' and event_type = 'published'),
  1, 'published event persisted');

select is(
  (public.publish_benefit_change_proposal('10000000-0000-0000-0000-000000000100', 'admin@example.com'))->>'status',
  'noop', 're-publish is a no-op');

-- 8-9: not approved → blocked + event ---------------------------------------
insert into public.benefit_change_proposals (
  id, run_id, source_id, snapshot_id, card_id, benefit_id, source_url,
  operation, before_version, evidence_excerpt, evidence_chunk_id, confidence,
  explanation, extractor_version, status, dedupe_key
) values (
  '10000000-0000-0000-0000-000000000101', gen_random_uuid(),
  '10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000030',
  '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000020',
  'https://www.americanexpress.com/us/credit-cards/card/pub-test/',
  'modify', 2, 'Benefit A is now up to $250 annually', 'norm-ok#0', 0.9,
  'explanation', 'test/1', 'needs_review', 'pub-key-not-approved'
);

select is(
  (public.publish_benefit_change_proposal('10000000-0000-0000-0000-000000000101', 'admin@example.com'))->>'reason',
  'not_approved', 'unapproved proposal is blocked');

select is(
  (select count(*)::int from public.proposal_events
   where proposal_id = '10000000-0000-0000-0000-000000000101' and event_type = 'publish_blocked'
     and detail->>'reason' = 'not_approved'),
  1, 'publish_blocked event persisted despite blocked return');

-- 10: investigation_only -------------------------------------------------------
insert into public.benefit_change_proposals (
  id, run_id, source_id, snapshot_id, card_id, benefit_id, source_url,
  operation, before_version, evidence_excerpt, evidence_chunk_id, confidence,
  explanation, extractor_version, status, dedupe_key, investigation_only
) values (
  '10000000-0000-0000-0000-000000000102', gen_random_uuid(),
  '10000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000030',
  '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000020',
  'https://www.americanexpress.com/us/credit-cards/card/pub-test/secondary/',
  'modify', 2, 'Benefit A is now up to $250 annually', 'norm-ok#0', 0.9,
  'explanation', 'test/1', 'approved', 'pub-key-investigation', true
);

select is(
  (public.publish_benefit_change_proposal('10000000-0000-0000-0000-000000000102', 'admin@example.com'))->>'reason',
  'investigation_only', 'investigation-only proposal is blocked');

-- 11: publish_block_reason ------------------------------------------------------
insert into public.benefit_change_proposals (
  id, run_id, source_id, snapshot_id, card_id, benefit_id, source_url,
  operation, before_version, evidence_excerpt, evidence_chunk_id, confidence,
  explanation, extractor_version, status, dedupe_key, publish_block_reason
) values (
  '10000000-0000-0000-0000-000000000103', gen_random_uuid(),
  '10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000030',
  '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000020',
  'https://www.americanexpress.com/us/credit-cards/card/pub-test/',
  'modify', 2, 'Benefit A is now up to $250 annually', 'norm-ok#0', 0.9,
  'explanation', 'test/1', 'approved', 'pub-key-blockreason', 'removal_gate_failed'
);

select is(
  (public.publish_benefit_change_proposal('10000000-0000-0000-0000-000000000103', 'admin@example.com'))->>'reason',
  'publish_block_reason:removal_gate_failed', 'persisted publish_block_reason is enforced');

-- 12: secondary source ---------------------------------------------------------
insert into public.benefit_change_proposals (
  id, run_id, source_id, snapshot_id, card_id, benefit_id, source_url,
  operation, before_version, evidence_excerpt, evidence_chunk_id, confidence,
  explanation, extractor_version, status, dedupe_key
) values (
  '10000000-0000-0000-0000-000000000104', gen_random_uuid(),
  '10000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000030',
  '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000020',
  'https://www.americanexpress.com/us/credit-cards/card/pub-test/secondary/',
  'modify', 2, 'Benefit A is now up to $250 annually', 'norm-ok#0', 0.9,
  'explanation', 'test/1', 'approved', 'pub-key-secondary'
);

select is(
  (public.publish_benefit_change_proposal('10000000-0000-0000-0000-000000000104', 'admin@example.com'))->>'reason',
  'source_not_official', 'secondary sources may never authorize publication');

-- 13: missing source↔benefit link ----------------------------------------------
insert into public.benefit_change_proposals (
  id, run_id, source_id, snapshot_id, card_id, benefit_id, source_url,
  operation, before_version, evidence_excerpt, evidence_chunk_id, confidence,
  explanation, extractor_version, status, dedupe_key
) values (
  '10000000-0000-0000-0000-000000000105', gen_random_uuid(),
  '10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000030',
  '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000023',
  'https://www.americanexpress.com/us/credit-cards/card/pub-test/',
  'modify', 1, 'Benefit A is now up to $250 annually', 'norm-ok#0', 0.9,
  'explanation', 'test/1', 'approved', 'pub-key-nolink'
);

select is(
  (public.publish_benefit_change_proposal('10000000-0000-0000-0000-000000000105', 'admin@example.com'))->>'reason',
  'source_benefit_link_missing', 'unlinked benefit cannot be published from this source');

-- 14-16: snapshot integrity (suspect / partial / missing artifact) --------------
insert into public.benefit_change_proposals (
  id, run_id, source_id, snapshot_id, card_id, benefit_id, source_url,
  operation, before_version, evidence_excerpt, evidence_chunk_id, confidence,
  explanation, extractor_version, status, dedupe_key
) values
  ('10000000-0000-0000-0000-000000000106', gen_random_uuid(),
   '10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000031',
   '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000020',
   'https://www.americanexpress.com/us/credit-cards/card/pub-test/',
   'modify', 2, 'Benefit A is now up to $250 annually', 'norm-sus#0', 0.9,
   'explanation', 'test/1', 'approved', 'pub-key-suspect'),
  ('10000000-0000-0000-0000-000000000107', gen_random_uuid(),
   '10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000032',
   '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000020',
   'https://www.americanexpress.com/us/credit-cards/card/pub-test/',
   'modify', 2, 'Benefit A is now up to $250 annually', 'norm-part#0', 0.9,
   'explanation', 'test/1', 'approved', 'pub-key-partial'),
  ('10000000-0000-0000-0000-000000000108', gen_random_uuid(),
   '10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000033',
   '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000020',
   'https://www.americanexpress.com/us/credit-cards/card/pub-test/',
   'modify', 2, 'Benefit A is now up to $250 annually', 'norm-noart#0', 0.9,
   'explanation', 'test/1', 'approved', 'pub-key-noartifact');

select is(
  (public.publish_benefit_change_proposal('10000000-0000-0000-0000-000000000106', 'admin@example.com'))->>'reason',
  'snapshot_suspect', 'suspect snapshots are unpublishable');

select is(
  (public.publish_benefit_change_proposal('10000000-0000-0000-0000-000000000107', 'admin@example.com'))->>'reason',
  'snapshot_not_fully_extracted', 'partially processed snapshots are unpublishable');

select is(
  (public.publish_benefit_change_proposal('10000000-0000-0000-0000-000000000108', 'admin@example.com'))->>'reason',
  'artifact_missing', 'snapshots without a preserved raw artifact are unpublishable');

-- 17: evidence not present in the exact chunk -----------------------------------
insert into public.benefit_change_proposals (
  id, run_id, source_id, snapshot_id, card_id, benefit_id, source_url,
  operation, before_version, evidence_excerpt, evidence_chunk_id, confidence,
  explanation, extractor_version, status, dedupe_key
) values (
  '10000000-0000-0000-0000-000000000109', gen_random_uuid(),
  '10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000030',
  '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000020',
  'https://www.americanexpress.com/us/credit-cards/card/pub-test/',
  'modify', 2, 'fabricated evidence never present in the document', 'norm-ok#0', 0.9,
  'explanation', 'test/1', 'approved', 'pub-key-fabricated'
);

select is(
  (public.publish_benefit_change_proposal('10000000-0000-0000-0000-000000000109', 'admin@example.com'))->>'reason',
  'evidence_not_in_chunk', 'evidence must exist in the exact persisted chunk');

-- 18-21: removal gate enforcement ------------------------------------------------
insert into public.benefit_change_proposals (
  id, run_id, source_id, snapshot_id, card_id, benefit_id, source_url,
  operation, before_value, before_version, evidence_excerpt, evidence_chunk_id,
  confidence, explanation, extractor_version, status, dedupe_key, removal_gate
) values
  ('10000000-0000-0000-0000-000000000110', gen_random_uuid(),
   '10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000030',
   '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000022',
   'https://www.americanexpress.com/us/credit-cards/card/pub-test/',
   'remove', null, 1, 'Benefit C is discontinued', 'norm-ok#0',
   0.9, 'explanation', 'test/1', 'approved', 'pub-key-remove-nogate', null),
  ('10000000-0000-0000-0000-000000000111', gen_random_uuid(),
   '10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000030',
   '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000022',
   'https://www.americanexpress.com/us/credit-cards/card/pub-test/',
   'remove', null, 1, 'Benefit C is discontinued', 'norm-ok#0',
   0.9, 'explanation', 'test/1', 'approved', 'pub-key-remove-failgate',
   '{"version":1,"passed":false,"matched_phrases":[],"negated_phrases":[],"reasons":["no_discontinuation_language"]}'::jsonb),
  ('10000000-0000-0000-0000-000000000112', gen_random_uuid(),
   '10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000030',
   '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000022',
   'https://www.americanexpress.com/us/credit-cards/card/pub-test/',
   'remove', null, 1, 'Benefit C is discontinued', 'norm-ok#0',
   0.9, 'explanation', 'test/1', 'approved', 'pub-key-remove-badversion',
   '{"version":999,"passed":true,"matched_phrases":["discontinued"],"negated_phrases":[],"reasons":[]}'::jsonb),
  ('10000000-0000-0000-0000-000000000113', gen_random_uuid(),
   '10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000030',
   '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000022',
   'https://www.americanexpress.com/us/credit-cards/card/pub-test/',
   'remove', null, 1, 'Benefit C is discontinued', 'norm-ok#0',
   0.65, 'explanation', 'test/1', 'approved', 'pub-key-remove-lowconf',
   '{"version":1,"passed":true,"matched_phrases":["discontinued"],"negated_phrases":[],"reasons":[]}'::jsonb);

select is(
  (public.publish_benefit_change_proposal('10000000-0000-0000-0000-000000000110', 'admin@example.com'))->>'reason',
  'removal_gate_missing', 'removal without a persisted gate is blocked');

select is(
  (public.publish_benefit_change_proposal('10000000-0000-0000-0000-000000000111', 'admin@example.com'))->>'reason',
  'removal_gate_not_passed', 'failed removal gate is blocked');

select is(
  (public.publish_benefit_change_proposal('10000000-0000-0000-0000-000000000112', 'admin@example.com'))->>'reason',
  'removal_gate_version_not_accepted', 'unknown gate version is blocked');

select is(
  (public.publish_benefit_change_proposal('10000000-0000-0000-0000-000000000113', 'admin@example.com'))->>'reason',
  'confidence_below_removal_threshold', 'low-confidence removal is blocked');

-- 22: after_value key whitelist ---------------------------------------------------
insert into public.benefit_change_proposals (
  id, run_id, source_id, snapshot_id, card_id, benefit_id, source_url,
  operation, before_version, after_value, evidence_excerpt, evidence_chunk_id,
  confidence, explanation, extractor_version, status, dedupe_key
) values (
  '10000000-0000-0000-0000-000000000114', gen_random_uuid(),
  '10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000030',
  '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000020',
  'https://www.americanexpress.com/us/credit-cards/card/pub-test/',
  'modify', 2,
  '{"benefit_value":"Up to $300 annually","evil_key":"x"}'::jsonb,
  'Benefit A is now up to $250 annually', 'norm-ok#0', 0.9,
  'explanation', 'test/1', 'approved', 'pub-key-unknownkey'
);

select is(
  (public.publish_benefit_change_proposal('10000000-0000-0000-0000-000000000114', 'admin@example.com'))->>'reason',
  'after_value_unknown_key', 'after_value keys outside the field contract are rejected');

-- 23-25: content_version drift ⇒ superseded ---------------------------------------
insert into public.benefit_change_proposals (
  id, run_id, source_id, snapshot_id, card_id, benefit_id, source_url,
  operation, before_value, after_value, before_version,
  evidence_excerpt, evidence_chunk_id, confidence, explanation,
  extractor_version, status, dedupe_key
) values (
  '10000000-0000-0000-0000-000000000115', gen_random_uuid(),
  '10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000030',
  '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000021',
  'https://www.americanexpress.com/us/credit-cards/card/pub-test/',
  'modify',
  jsonb_build_object('benefit_value', 'Up to $100 annually', 'content_version', 1, 'benefit_hash', 'hash-b'),
  jsonb_build_object('benefit_value', 'Up to $150 annually'),
  1,
  'Benefit A is now up to $250 annually', 'norm-ok#0', 0.9, 'explanation',
  'test/1', 'approved', 'pub-key-drift'
);

-- Intervening change bumps Benefit B's version.
update public.benefits set benefit_value = 'Up to $110 annually'
where id = '10000000-0000-0000-0000-000000000021';

select is(
  (public.publish_benefit_change_proposal('10000000-0000-0000-0000-000000000115', 'admin@example.com'))->>'status',
  'superseded', 'version drift supersedes instead of publishing');

select is(
  (select status from public.benefit_change_proposals where id = '10000000-0000-0000-0000-000000000115'),
  'superseded', 'proposal marked superseded');

select is(
  (select count(*)::int from public.proposal_events
   where proposal_id = '10000000-0000-0000-0000-000000000115' and event_type = 'superseded'),
  1, 'superseded event persisted');

-- 26-29: ADD publish ---------------------------------------------------------------
insert into public.benefit_change_proposals (
  id, run_id, source_id, snapshot_id, card_id, source_url,
  operation, after_value, evidence_excerpt, evidence_chunk_id, confidence,
  explanation, extractor_version, status, dedupe_key
) values (
  '10000000-0000-0000-0000-000000000116', gen_random_uuid(),
  '10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000030',
  '10000000-0000-0000-0000-000000000001',
  'https://www.americanexpress.com/us/credit-cards/card/pub-test/',
  'add',
  jsonb_build_object(
    'benefit_code', 'pub_new_credit', 'benefit_name', 'New Credit',
    'benefit_value', 'Up to $30 monthly', 'cadence', 'monthly',
    'reset_timing', 'calendar month', 'enrollment_required', false,
    'requires_setup', false, 'display_description', 'A new credit.',
    'source_url', 'https://www.americanexpress.com/us/credit-cards/card/pub-test/',
    'track_in_memento', 'later'
  ),
  'Benefit A is now up to $250 annually', 'norm-ok#0', 0.9,
  'New benefit detected.', 'test/1', 'approved', 'pub-key-add'
);

select is(
  (public.publish_benefit_change_proposal('10000000-0000-0000-0000-000000000116', 'admin@example.com'))->>'status',
  'published', 'add publishes');

select is(
  (select count(*)::int from public.benefits
   where benefit_code = 'pub_new_credit' and benefit_status = 'active' and content_version = 1),
  1, 'new benefit created active at version 1');

select is(
  (select count(*)::int from public.benefit_source_links l
   join public.benefits b on b.id = l.benefit_id
   where b.benefit_code = 'pub_new_credit'
     and l.source_id = '10000000-0000-0000-0000-000000000010'),
  1, 'coverage link created for the new benefit');

select is(
  (select count(*)::int from public.benefit_history h
   join public.benefits b on b.id = h.benefit_id
   where b.benefit_code = 'pub_new_credit' and h.change_type = 'created'),
  1, 'created history snapshot written');

-- 30: ADD with conflicting code is blocked ------------------------------------------
insert into public.benefit_change_proposals (
  id, run_id, source_id, snapshot_id, card_id, source_url,
  operation, after_value, evidence_excerpt, evidence_chunk_id, confidence,
  explanation, extractor_version, status, dedupe_key
) values (
  '10000000-0000-0000-0000-000000000117', gen_random_uuid(),
  '10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000030',
  '10000000-0000-0000-0000-000000000001',
  'https://www.americanexpress.com/us/credit-cards/card/pub-test/',
  'add',
  jsonb_build_object(
    'benefit_code', 'pub_a', 'benefit_name', 'Duplicate',
    'benefit_value', 'Up to $1 monthly', 'cadence', 'monthly'
  ),
  'Benefit A is now up to $250 annually', 'norm-ok#0', 0.9,
  'dup', 'test/1', 'approved', 'pub-key-add-dup'
);

select is(
  (public.publish_benefit_change_proposal('10000000-0000-0000-0000-000000000117', 'admin@example.com'))->>'reason',
  'benefit_code_conflict', 'duplicate benefit_code fails closed');

-- 31-34: REMOVE publish (valid gate) --------------------------------------------------
insert into public.benefit_change_proposals (
  id, run_id, source_id, snapshot_id, card_id, benefit_id, source_url,
  operation, before_value, before_version, evidence_excerpt, evidence_chunk_id,
  confidence, explanation, extractor_version, status, dedupe_key, removal_gate
) values (
  '10000000-0000-0000-0000-000000000118', gen_random_uuid(),
  '10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000030',
  '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000022',
  'https://www.americanexpress.com/us/credit-cards/card/pub-test/',
  'remove',
  jsonb_build_object('benefit_value', 'Up to $50 monthly', 'content_version', 1, 'benefit_hash', 'hash-c'),
  1, 'Benefit C is discontinued', 'norm-ok#0',
  0.9, 'Benefit discontinued per issuer page.', 'test/1', 'approved', 'pub-key-remove-valid',
  '{"version":1,"passed":true,"matched_phrases":["discontinued"],"negated_phrases":[],"reasons":[]}'::jsonb
);

select is(
  (public.publish_benefit_change_proposal('10000000-0000-0000-0000-000000000118', 'admin@example.com'))->>'status',
  'published', 'gated removal publishes');

select is(
  (select benefit_status from public.benefits where id = '10000000-0000-0000-0000-000000000022'),
  'retired', 'benefit retired');

select is(
  (select track_in_memento::text from public.benefits where id = '10000000-0000-0000-0000-000000000022'),
  'yes', 'retirement does NOT touch track_in_memento');

select is(
  (select count(*)::int from public.benefit_history
   where benefit_id = '10000000-0000-0000-0000-000000000022'
     and change_type = 'retired' and effective_end_date is not null),
  1, 'retired history snapshot carries an effective end date');

-- 35: future effective date ⇒ scheduled ------------------------------------------------
insert into public.benefit_change_proposals (
  id, run_id, source_id, snapshot_id, card_id, benefit_id, source_url,
  operation, before_value, before_version, effective_date, evidence_excerpt,
  evidence_chunk_id, confidence, explanation, extractor_version, status,
  dedupe_key, removal_gate
) values (
  '10000000-0000-0000-0000-000000000119', gen_random_uuid(),
  '10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000030',
  '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000024',
  'https://www.americanexpress.com/us/credit-cards/card/pub-test/',
  'expire',
  jsonb_build_object('benefit_value', 'Up to $10 monthly', 'content_version', 1, 'benefit_hash', 'hash-e'),
  1, current_date + 30, 'Benefit C is discontinued', 'norm-ok#0',
  0.9, 'Future expiration.', 'test/1', 'approved', 'pub-key-expire-future',
  '{"version":1,"passed":true,"matched_phrases":["discontinued"],"negated_phrases":[],"reasons":[]}'::jsonb
);

select is(
  (public.publish_benefit_change_proposal('10000000-0000-0000-0000-000000000119', 'admin@example.com'))->>'status',
  'scheduled', 'future-dated approved proposal is scheduled, not applied');

-- 36-39: transaction atomicity under a forced unexpected failure ------------------------
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
  operation, before_value, after_value, before_version, evidence_excerpt,
  evidence_chunk_id, confidence, explanation, extractor_version, status, dedupe_key
) values (
  '10000000-0000-0000-0000-000000000120', gen_random_uuid(),
  '10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000030',
  '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000024',
  'https://www.americanexpress.com/us/credit-cards/card/pub-test/',
  'modify',
  jsonb_build_object('benefit_value', 'Up to $10 monthly', 'content_version', 1, 'benefit_hash', 'hash-e'),
  jsonb_build_object('benefit_value', 'BOOM'),
  1, 'Benefit A is now up to $250 annually', 'norm-ok#0', 0.9,
  'forced failure', 'test/1', 'approved', 'pub-key-boom'
);

select throws_ok(
  $$select public.publish_benefit_change_proposal('10000000-0000-0000-0000-000000000120', 'admin@example.com')$$,
  'P0001',
  'boom',
  'unexpected database errors still raise'
);

select is(
  (select benefit_value from public.benefits where id = '10000000-0000-0000-0000-000000000024'),
  'Up to $10 monthly', 'benefit untouched after aborted publish');

select is(
  (select status from public.benefit_change_proposals where id = '10000000-0000-0000-0000-000000000120'),
  'approved', 'proposal status unchanged after aborted publish');

select is(
  (select count(*)::int from public.proposal_events
   where proposal_id = '10000000-0000-0000-0000-000000000120'),
  0, 'no partial events persisted from the aborted transaction');

drop trigger test_boom on public.benefits;

select * from finish();
rollback;
