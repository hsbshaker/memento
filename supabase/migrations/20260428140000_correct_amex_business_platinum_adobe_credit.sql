-- Correct stale Adobe Credit canonical row for Amex Business Platinum.
-- The original import recorded the old benefit structure (Up to $150/year).
-- Verified via official Amex benefit tile: $250 statement credit after
-- spending $600 or more on U.S. purchases directly with Adobe per calendar year.
-- The original Amex effective-change date is unknown; effective_start_date is
-- set to current_date to reflect when Memento verified and corrected this row.

begin;

-- Step 1: Update the canonical benefits row.
-- Guarded on the stale benefit_hash so re-running is a no-op.
update public.benefits
set
  benefit_value       = '$250 after $600 spend',
  notes               = '$250 credit after spending $600 or more on U.S. purchases directly with Adobe in a calendar year; enrollment required',
  display_description = 'Statement credit after spending $600 or more on eligible U.S. purchases directly with Adobe.',
  benefit_hash        = 'ea58b774ababff8e7a4baa51f7032f8de5a579ef589aa55b772c8bdc3d25a3d5',
  last_verified_at    = now()
where benefit_code = 'amex_amex_business_platinum_adobe_credit'
  and benefit_hash = 'c3b1f1f9ac8dfe79dd7fbfd26fdc43a3ed468df17f6275ebfa34fd680a2febe1';

-- Step 2: Close the original 'created' history row if it is still open.
-- Scoped to the stale hash and change_type='created' so re-running is a no-op
-- and no future 'updated' rows are accidentally closed.
update public.benefit_history
set effective_end_date = current_date - interval '1 day'
where benefit_code     = 'amex_amex_business_platinum_adobe_credit'
  and change_type      = 'created'
  and benefit_hash     = 'c3b1f1f9ac8dfe79dd7fbfd26fdc43a3ed468df17f6275ebfa34fd680a2febe1'
  and effective_end_date is null;

-- Step 3: Insert a new history row reflecting the correction.
-- The not-exists guard prevents a duplicate open 'updated' row if the
-- migration is run more than once.
insert into public.benefit_history (
  id,
  benefit_id,
  card_id,
  benefit_code,
  benefit_name,
  benefit_value,
  cadence,
  reset_timing,
  enrollment_required,
  requires_setup,
  track_in_memento,
  source_url,
  notes,
  benefit_hash,
  change_type,
  change_summary,
  effective_start_date,
  effective_end_date,
  verified_at,
  created_at
)
select
  gen_random_uuid(),
  b.id,
  b.card_id,
  b.benefit_code,
  b.benefit_name,
  b.benefit_value,
  b.cadence,
  b.reset_timing,
  b.enrollment_required,
  b.requires_setup,
  b.track_in_memento,
  b.source_url,
  b.notes,
  b.benefit_hash,
  'updated',
  'Corrected Adobe Credit based on verified Amex benefit tile; actual effective change date not confirmed.',
  current_date,
  null,
  now(),
  now()
from public.benefits b
where b.benefit_code = 'amex_amex_business_platinum_adobe_credit'
  and not exists (
    select 1
    from public.benefit_history h
    where h.benefit_code       = 'amex_amex_business_platinum_adobe_credit'
      and h.change_type        = 'updated'
      and h.benefit_hash       = 'ea58b774ababff8e7a4baa51f7032f8de5a579ef589aa55b772c8bdc3d25a3d5'
      and h.effective_end_date is null
  );

commit;
