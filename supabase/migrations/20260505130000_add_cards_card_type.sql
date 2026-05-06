alter table if exists public.cards
  add column if not exists card_type text;

update public.cards
set card_type =
  case
    when is_business is true then 'business'
    when is_business is false then 'personal'
    else null
  end
where card_type is null
  and is_business is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cards_card_type_check'
      and conrelid = 'public.cards'::regclass
  ) then
    alter table public.cards
      add constraint cards_card_type_check
      check (card_type is null or card_type in ('personal', 'business'));
  end if;
end $$;
