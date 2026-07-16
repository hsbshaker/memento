-- Freshness publish/rollback RPCs. SECURITY DEFINER, service_role-execute only.
-- One function call = one transaction (all-or-nothing).
--
-- Safety model:
--  * Expected safety failures NEVER raise — they persist a `publish_blocked`
--    proposal_event and return {"status":"blocked","reason":...} so the event
--    survives. Unexpected database errors still raise (and roll back).
--  * The full evidence chain is re-verified here in SQL: official live source,
--    source/card/benefit relationships, benefit_source_links coverage,
--    ok + fully-extracted snapshot with a preserved raw artifact, evidence text
--    present in the exact persisted chunk, versioned removal-gate pass, and a
--    strict jsonb key whitelist over the after-state.
--  * Concurrency uses benefits.content_version (before_version CAS on publish,
--    published_version CAS on rollback). benefit_hash is a fingerprint only.
--
-- The whitelist below must stay aligned with BENEFIT_VERSIONED_FIELDS +
-- snapshot metadata in lib/benefits/benefit-fields.ts:
--   benefit_name, benefit_value, cadence, reset_timing, enrollment_required,
--   requires_setup, display_description, benefit_status, retired_at,
--   source_url, track_in_memento (+ benefit_code, benefit_hash, content_version).

create extension if not exists "pgcrypto";

-- Accepted removal-gate versions. Bump alongside REMOVAL_GATE_VERSION in
-- lib/freshness/removal-gate.ts via a new migration.
create or replace function public.freshness_accepted_removal_gate_versions()
returns integer[]
language sql
immutable
as $$
  select array[1];
$$;

create or replace function public.publish_benefit_change_proposal(
  p_proposal_id uuid,
  p_reviewer_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_proposal public.benefit_change_proposals%rowtype;
  v_source public.benefit_sources%rowtype;
  v_snapshot public.source_snapshots%rowtype;
  v_benefit public.benefits%rowtype;
  v_after jsonb;
  v_reason text := null;
  v_chunk_text text;
  v_haystack text;
  v_needle text;
  v_history_id uuid;
  v_new_version integer;
  v_benefit_id uuid;
  v_change_type public.benefit_change_type_enum;
  v_actor text := coalesce(nullif(trim(p_reviewer_email), ''), 'system');
  v_hash text;
  v_allowed_keys text[] := array[
    'benefit_name', 'benefit_value', 'cadence', 'reset_timing',
    'enrollment_required', 'requires_setup', 'display_description',
    'benefit_status', 'retired_at', 'source_url', 'track_in_memento',
    'benefit_code', 'benefit_hash', 'content_version'
  ];
begin
  select * into v_proposal
  from public.benefit_change_proposals
  where id = p_proposal_id
  for update;

  if not found then
    return jsonb_build_object('status', 'blocked', 'reason', 'proposal_not_found');
  end if;

  -- Idempotency: re-publishing is a no-op.
  if v_proposal.status = 'published' then
    return jsonb_build_object(
      'status', 'noop',
      'published_at', v_proposal.published_at,
      'published_version', v_proposal.published_version
    );
  end if;

  -- ---- Expected safety checks (blocked result + persisted event) ----------
  if v_proposal.status <> 'approved' then
    v_reason := 'not_approved';
  end if;

  if v_reason is null and v_proposal.investigation_only then
    v_reason := 'investigation_only';
  end if;

  if v_reason is null and v_proposal.publish_block_reason is not null then
    v_reason := 'publish_block_reason:' || v_proposal.publish_block_reason;
  end if;

  -- Future-dated approved proposals are scheduled, not applied.
  if v_reason is null
     and v_proposal.effective_date is not null
     and v_proposal.effective_date > current_date then
    return jsonb_build_object('status', 'scheduled', 'effective_date', v_proposal.effective_date);
  end if;

  if v_reason is null then
    select * into v_source
    from public.benefit_sources
    where id = v_proposal.source_id;

    if not found then
      v_reason := 'source_missing';
    elsif v_source.authority_level <> 'official' then
      v_reason := 'source_not_official';
    elsif v_source.card_id <> v_proposal.card_id then
      v_reason := 'source_card_mismatch';
    end if;
  end if;

  if v_reason is null then
    select * into v_snapshot
    from public.source_snapshots
    where id = v_proposal.snapshot_id;

    if not found then
      v_reason := 'snapshot_missing';
    elsif v_snapshot.validation_status <> 'ok' then
      v_reason := 'snapshot_suspect';
    elsif v_snapshot.truncated then
      v_reason := 'snapshot_truncated';
    elsif v_snapshot.extraction_outcome <> 'extracted' then
      v_reason := 'snapshot_not_fully_extracted';
    elsif v_snapshot.artifact_path is null then
      v_reason := 'artifact_missing';
    end if;
  end if;

  -- Evidence must be present in the exact persisted chunk it was cited from
  -- (whitespace-normalized comparison).
  if v_reason is null then
    v_needle := regexp_replace(trim(v_proposal.evidence_excerpt), '\s+', ' ', 'g');

    if v_proposal.evidence_chunk_id is not null then
      select chunk_text into v_chunk_text
      from public.snapshot_chunks
      where snapshot_id = v_proposal.snapshot_id
        and chunk_id = v_proposal.evidence_chunk_id
      limit 1;

      if v_chunk_text is null then
        v_reason := 'evidence_chunk_missing';
      else
        v_haystack := regexp_replace(v_chunk_text, '\s+', ' ', 'g');
        if position(v_needle in v_haystack) = 0 then
          v_reason := 'evidence_not_in_chunk';
        end if;
      end if;
    else
      v_haystack := regexp_replace(coalesce(v_snapshot.extracted_text, ''), '\s+', ' ', 'g');
      if position(v_needle in v_haystack) = 0 then
        v_reason := 'evidence_not_in_snapshot';
      end if;
    end if;
  end if;

  -- Operation-specific relationship checks.
  if v_reason is null and v_proposal.operation in ('modify', 'expire', 'remove') then
    if v_proposal.benefit_id is null then
      v_reason := 'benefit_id_missing';
    else
      select * into v_benefit
      from public.benefits
      where id = v_proposal.benefit_id
      for update;

      if not found then
        v_reason := 'benefit_missing';
      elsif v_benefit.card_id <> v_proposal.card_id then
        v_reason := 'benefit_card_mismatch';
      elsif not exists (
        select 1 from public.benefit_source_links
        where benefit_id = v_proposal.benefit_id
          and source_id = v_proposal.source_id
      ) then
        v_reason := 'source_benefit_link_missing';
      end if;
    end if;
  end if;

  -- Removal gate: persisted, versioned, deterministic — re-verified here.
  if v_reason is null and v_proposal.operation in ('expire', 'remove') then
    if v_proposal.removal_gate is null then
      v_reason := 'removal_gate_missing';
    elsif coalesce(v_proposal.removal_gate->>'passed', 'false') <> 'true' then
      v_reason := 'removal_gate_not_passed';
    elsif not (coalesce((v_proposal.removal_gate->>'version')::integer, -1) =
               any (public.freshness_accepted_removal_gate_versions())) then
      v_reason := 'removal_gate_version_not_accepted';
    elsif v_proposal.confidence < 0.7 then
      v_reason := 'confidence_below_removal_threshold';
    end if;
  end if;

  -- After-state validation for add/modify.
  if v_reason is null and v_proposal.operation in ('add', 'modify') then
    v_after := coalesce(v_proposal.edited_after_value, v_proposal.after_value);

    if v_after is null then
      v_reason := 'after_value_missing';
    elsif exists (
      select 1 from jsonb_object_keys(v_after) as k
      where k <> all (v_allowed_keys)
    ) then
      v_reason := 'after_value_unknown_key';
    elsif v_after->>'cadence' is not null and v_after->>'cadence' not in
      ('monthly', 'quarterly', 'semiannual', 'annual', 'multi_year', 'one_time', 'per_booking') then
      v_reason := 'after_value_invalid_cadence';
    elsif v_after->>'track_in_memento' is not null and v_after->>'track_in_memento' not in
      ('yes', 'later', 'no') then
      v_reason := 'after_value_invalid_track_in_memento';
    elsif v_after->>'benefit_status' is not null and v_after->>'benefit_status' not in
      ('active', 'retired') then
      v_reason := 'after_value_invalid_benefit_status';
    end if;

    if v_reason is null and v_proposal.operation = 'add' then
      if nullif(trim(coalesce(v_after->>'benefit_code', '')), '') is null then
        v_reason := 'benefit_code_missing';
      elsif nullif(trim(coalesce(v_after->>'benefit_name', '')), '') is null then
        v_reason := 'benefit_name_missing';
      elsif nullif(trim(coalesce(v_after->>'benefit_value', '')), '') is null then
        v_reason := 'benefit_value_missing';
      elsif v_after->>'cadence' is null then
        v_reason := 'cadence_missing';
      elsif exists (
        select 1 from public.benefits where benefit_code = v_after->>'benefit_code'
      ) then
        v_reason := 'benefit_code_conflict';
      end if;
    end if;
  end if;

  if v_reason is not null then
    insert into public.proposal_events (proposal_id, event_type, actor, from_status, to_status, detail)
    values (
      p_proposal_id, 'publish_blocked', v_actor, v_proposal.status, v_proposal.status,
      jsonb_build_object('reason', v_reason)
    );
    return jsonb_build_object('status', 'blocked', 'reason', v_reason);
  end if;

  -- ---- Concurrency CAS: never publish state the reviewer didn't see -------
  if v_proposal.operation in ('modify', 'expire', 'remove')
     and v_benefit.content_version is distinct from v_proposal.before_version then
    update public.benefit_change_proposals
    set status = 'superseded'
    where id = p_proposal_id;

    insert into public.proposal_events (proposal_id, event_type, actor, from_status, to_status, detail)
    values (
      p_proposal_id, 'superseded', v_actor, v_proposal.status, 'superseded',
      jsonb_build_object(
        'reason', 'content_version_drift',
        'expected_version', v_proposal.before_version,
        'actual_version', v_benefit.content_version
      )
    );
    return jsonb_build_object('status', 'superseded', 'reason', 'content_version_drift');
  end if;

  -- ---- Apply ---------------------------------------------------------------
  if v_proposal.operation = 'add' then
    v_hash := encode(digest(convert_to(
      (v_after->>'benefit_code') || '|' ||
      (v_after->>'benefit_value') || '|' ||
      (v_after->>'cadence') || '|' ||
      coalesce(v_after->>'reset_timing', '') || '|' ||
      case when coalesce((v_after->>'enrollment_required')::boolean, false) then 'true' else 'false' end || '|' ||
      case when coalesce((v_after->>'requires_setup')::boolean, false) then 'true' else 'false' end || '|' ||
      coalesce(v_after->>'track_in_memento', 'later'),
      'UTF8'), 'sha256'), 'hex');

    insert into public.benefits (
      id, card_id, benefit_key, display_name, category, requires_enrollment,
      benefit_code, benefit_name, benefit_value, cadence, reset_timing,
      enrollment_required, requires_setup, track_in_memento, source_url,
      display_description, benefit_status, benefit_hash, last_verified_at
    ) values (
      gen_random_uuid(),
      v_proposal.card_id,
      v_after->>'benefit_code',
      v_after->>'benefit_name',
      'other',
      coalesce((v_after->>'enrollment_required')::boolean, false),
      v_after->>'benefit_code',
      v_after->>'benefit_name',
      v_after->>'benefit_value',
      (v_after->>'cadence')::public.benefit_cadence_enum,
      nullif(trim(coalesce(v_after->>'reset_timing', '')), ''),
      coalesce((v_after->>'enrollment_required')::boolean, false),
      coalesce((v_after->>'requires_setup')::boolean, false),
      coalesce(v_after->>'track_in_memento', 'later')::public.track_in_memento_enum,
      nullif(trim(coalesce(v_after->>'source_url', '')), ''),
      v_after->>'display_description',
      'active',
      v_hash,
      now()
    )
    returning id, content_version into v_benefit_id, v_new_version;

    -- Coverage link for the newly created benefit.
    insert into public.benefit_source_links (benefit_id, source_id, is_primary, coverage_type)
    values (v_benefit_id, v_proposal.source_id, true, 'full')
    on conflict (benefit_id, source_id) do nothing;

    v_change_type := 'created';

  elsif v_proposal.operation = 'modify' then
    v_benefit_id := v_proposal.benefit_id;

    v_hash := encode(digest(convert_to(
      coalesce(v_after->>'benefit_code', v_benefit.benefit_code, '') || '|' ||
      coalesce(v_after->>'benefit_value', '') || '|' ||
      coalesce(v_after->>'cadence', '') || '|' ||
      coalesce(v_after->>'reset_timing', '') || '|' ||
      case when coalesce((v_after->>'enrollment_required')::boolean, false) then 'true' else 'false' end || '|' ||
      case when coalesce((v_after->>'requires_setup')::boolean, false) then 'true' else 'false' end || '|' ||
      coalesce(v_after->>'track_in_memento', coalesce(v_benefit.track_in_memento::text, 'later')),
      'UTF8'), 'sha256'), 'hex');

    update public.benefits
    set benefit_name = coalesce(v_after->>'benefit_name', benefit_name),
        display_name = coalesce(v_after->>'benefit_name', display_name),
        benefit_value = coalesce(v_after->>'benefit_value', benefit_value),
        cadence = coalesce((v_after->>'cadence')::public.benefit_cadence_enum, cadence),
        reset_timing = coalesce(v_after->>'reset_timing', reset_timing),
        enrollment_required = coalesce((v_after->>'enrollment_required')::boolean, enrollment_required),
        requires_setup = coalesce((v_after->>'requires_setup')::boolean, requires_setup),
        display_description = coalesce(v_after->>'display_description', display_description),
        source_url = coalesce(nullif(trim(coalesce(v_after->>'source_url', '')), ''), source_url),
        track_in_memento = coalesce((v_after->>'track_in_memento')::public.track_in_memento_enum, track_in_memento),
        benefit_hash = v_hash,
        last_verified_at = now()
    where id = v_benefit_id;

    select content_version into v_new_version from public.benefits where id = v_benefit_id;
    v_change_type := 'updated';

  else
    -- expire / remove: retirement NEVER touches track_in_memento.
    v_benefit_id := v_proposal.benefit_id;

    update public.benefits
    set benefit_status = 'retired',
        retired_at = now(),
        last_verified_at = now()
    where id = v_benefit_id;

    select content_version into v_new_version from public.benefits where id = v_benefit_id;
    v_change_type := 'retired';
  end if;

  -- Complete history snapshot (full versioned field contract).
  insert into public.benefit_history (
    benefit_id, card_id, benefit_code, benefit_name, benefit_value, cadence,
    reset_timing, enrollment_required, requires_setup, track_in_memento,
    source_url, notes, benefit_hash, display_description, benefit_status,
    retired_at, content_version, change_type, change_summary,
    effective_start_date, effective_end_date, verified_at
  )
  select
    b.id, b.card_id, b.benefit_code, b.benefit_name, b.benefit_value, b.cadence,
    b.reset_timing, b.enrollment_required, b.requires_setup, b.track_in_memento,
    b.source_url, b.notes, b.benefit_hash, b.display_description, b.benefit_status,
    b.retired_at, b.content_version, v_change_type,
    left('freshness publish ' || p_proposal_id::text || ': ' || v_proposal.explanation
         || ' (source: ' || v_proposal.source_url || ')', 2000),
    current_date,
    case when v_change_type = 'retired'
      then greatest(coalesce(v_proposal.effective_date, current_date), current_date)
      else null end,
    now()
  from public.benefits b
  where b.id = v_benefit_id
  returning id into v_history_id;

  update public.benefit_change_proposals
  set status = 'published',
      published_at = now(),
      published_history_id = v_history_id,
      published_version = v_new_version,
      reviewer_email = v_actor,
      reviewed_at = coalesce(reviewed_at, now())
  where id = p_proposal_id;

  insert into public.proposal_events (proposal_id, event_type, actor, from_status, to_status, detail)
  values (
    p_proposal_id, 'published', v_actor, v_proposal.status, 'published',
    jsonb_build_object(
      'history_id', v_history_id,
      'benefit_id', v_benefit_id,
      'published_version', v_new_version,
      'operation', v_proposal.operation
    )
  );

  return jsonb_build_object(
    'status', 'published',
    'history_id', v_history_id,
    'benefit_id', v_benefit_id,
    'published_version', v_new_version
  );
end;
$$;

create or replace function public.rollback_published_proposal(
  p_proposal_id uuid,
  p_reviewer_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_proposal public.benefit_change_proposals%rowtype;
  v_benefit public.benefits%rowtype;
  v_before jsonb;
  v_reason text := null;
  v_history_id uuid;
  v_actor text := coalesce(nullif(trim(p_reviewer_email), ''), 'system');
  v_change_type public.benefit_change_type_enum;
begin
  select * into v_proposal
  from public.benefit_change_proposals
  where id = p_proposal_id
  for update;

  if not found then
    return jsonb_build_object('status', 'blocked', 'reason', 'proposal_not_found');
  end if;

  if v_proposal.status = 'rolled_back' then
    return jsonb_build_object('status', 'noop', 'rolled_back_at', v_proposal.rolled_back_at);
  end if;

  if v_proposal.status <> 'published' then
    v_reason := 'not_published';
  end if;

  if v_reason is null then
    select * into v_benefit
    from public.benefits
    where id = coalesce(
      v_proposal.benefit_id,
      (select benefit_id from public.benefit_history where id = v_proposal.published_history_id)
    )
    for update;

    if not found then
      v_reason := 'benefit_missing';
    -- Rollback must never overwrite changes made after this publication.
    elsif v_benefit.content_version is distinct from v_proposal.published_version then
      v_reason := 'benefit_changed_since_publish';
    end if;
  end if;

  if v_reason is not null then
    insert into public.proposal_events (proposal_id, event_type, actor, from_status, to_status, detail)
    values (
      p_proposal_id, 'publish_blocked', v_actor, v_proposal.status, v_proposal.status,
      jsonb_build_object('action', 'rollback', 'reason', v_reason)
    );
    return jsonb_build_object('status', 'blocked', 'reason', v_reason);
  end if;

  if v_proposal.operation = 'add' or v_proposal.before_value is null then
    -- Rolling back an ADD: retire the created benefit (user_benefits may
    -- already reference it — never delete).
    update public.benefits
    set benefit_status = 'retired',
        retired_at = now()
    where id = v_benefit.id;
    v_change_type := 'retired';
  else
    v_before := v_proposal.before_value;

    -- Exact restore of the immutable pre-publish state (versioned fields +
    -- fingerprint). Verification-only fields are not touched.
    update public.benefits
    set benefit_name = v_before->>'benefit_name',
        display_name = coalesce(v_before->>'benefit_name', display_name),
        benefit_value = v_before->>'benefit_value',
        cadence = (v_before->>'cadence')::public.benefit_cadence_enum,
        reset_timing = v_before->>'reset_timing',
        enrollment_required = (v_before->>'enrollment_required')::boolean,
        requires_setup = (v_before->>'requires_setup')::boolean,
        display_description = v_before->>'display_description',
        benefit_status = coalesce(v_before->>'benefit_status', 'active'),
        retired_at = (v_before->>'retired_at')::timestamptz,
        source_url = v_before->>'source_url',
        track_in_memento = (v_before->>'track_in_memento')::public.track_in_memento_enum,
        benefit_hash = v_before->>'benefit_hash'
    where id = v_benefit.id;
    v_change_type := 'updated';
  end if;

  insert into public.benefit_history (
    benefit_id, card_id, benefit_code, benefit_name, benefit_value, cadence,
    reset_timing, enrollment_required, requires_setup, track_in_memento,
    source_url, notes, benefit_hash, display_description, benefit_status,
    retired_at, content_version, change_type, change_summary,
    effective_start_date, effective_end_date, verified_at
  )
  select
    b.id, b.card_id, b.benefit_code, b.benefit_name, b.benefit_value, b.cadence,
    b.reset_timing, b.enrollment_required, b.requires_setup, b.track_in_memento,
    b.source_url, b.notes, b.benefit_hash, b.display_description, b.benefit_status,
    b.retired_at, b.content_version, v_change_type,
    'rollback of proposal ' || p_proposal_id::text,
    current_date, null, now()
  from public.benefits b
  where b.id = v_benefit.id
  returning id into v_history_id;

  update public.benefit_change_proposals
  set status = 'rolled_back',
      rolled_back_at = now()
  where id = p_proposal_id;

  insert into public.proposal_events (proposal_id, event_type, actor, from_status, to_status, detail)
  values (
    p_proposal_id, 'rolled_back', v_actor, 'published', 'rolled_back',
    jsonb_build_object('history_id', v_history_id, 'benefit_id', v_benefit.id)
  );

  return jsonb_build_object('status', 'rolled_back', 'history_id', v_history_id);
end;
$$;

-- Scheduled publication sweep. Runs FIRST in the daily cron and is callable
-- manually. Each proposal publishes inside its own exception scope so one bad
-- scheduled change can never block the rest.
create or replace function public.publish_due_scheduled_proposals()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_row record;
  v_result jsonb;
  v_published integer := 0;
  v_failed integer := 0;
  v_skipped integer := 0;
begin
  for v_row in
    select id from public.benefit_change_proposals
    where status = 'approved'
      and effective_date is not null
      and effective_date <= current_date
    order by created_at
  loop
    begin
      v_result := public.publish_benefit_change_proposal(v_row.id, 'system:scheduled');
      if v_result->>'status' = 'published' then
        v_published := v_published + 1;
      elsif v_result->>'status' = 'noop' then
        v_skipped := v_skipped + 1;
      else
        v_failed := v_failed + 1;
      end if;
    exception when others then
      v_failed := v_failed + 1;
      insert into public.proposal_events (proposal_id, event_type, actor, detail)
      values (
        v_row.id, 'publish_failed', 'system:scheduled',
        jsonb_build_object('error', sqlerrm)
      );
    end;
  end loop;

  return jsonb_build_object('published', v_published, 'failed', v_failed, 'skipped', v_skipped);
end;
$$;

-- Execute grants: service_role only.
revoke execute on function public.publish_benefit_change_proposal(uuid, text) from public, anon, authenticated;
revoke execute on function public.rollback_published_proposal(uuid, text) from public, anon, authenticated;
revoke execute on function public.publish_due_scheduled_proposals() from public, anon, authenticated;
revoke execute on function public.freshness_accepted_removal_gate_versions() from public, anon, authenticated;

grant execute on function public.publish_benefit_change_proposal(uuid, text) to service_role;
grant execute on function public.rollback_published_proposal(uuid, text) to service_role;
grant execute on function public.publish_due_scheduled_proposals() to service_role;
grant execute on function public.freshness_accepted_removal_gate_versions() to service_role;
