alter table if exists public.user_benefits
  add column if not exists tracking_status text;

update public.user_benefits
set tracking_status = coalesce(tracking_status, 'tracked')
where tracking_status is null;

alter table if exists public.user_benefits
  alter column tracking_status set default 'tracked',
  alter column tracking_status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_benefits_tracking_status_check'
      and conrelid = 'public.user_benefits'::regclass
  ) then
    alter table public.user_benefits
      add constraint user_benefits_tracking_status_check
      check (tracking_status in ('tracked', 'not_tracked'));
  end if;
end $$;
