-- Backfill cadence from legacy frequency if needed, then remove legacy frequency.
begin;

-- Fresh databases never had the legacy frequency column, so the backfill must
-- be guarded on its existence (matches the guarded drop below).
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'benefits'
      and column_name = 'frequency'
  ) then
    update public.benefits
    set cadence = frequency
    where cadence is null
      and frequency is not null;
  end if;
end $$;

alter table public.benefits
  drop column if exists frequency;

commit;

-- Verification A: total benefits linked to this card.
select count(*) as benefit_count
from public.benefits
where card_id = '70170d8e-97c7-42d0-8603-3ad1a71c2473'::uuid;

-- Verification B: cadence breakdown for this card.
select
  cadence,
  count(*) as benefit_count
from public.benefits
where card_id = '70170d8e-97c7-42d0-8603-3ad1a71c2473'::uuid
group by cadence
order by cadence;
