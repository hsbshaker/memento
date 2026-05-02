alter table if exists public.user_cards
  add column if not exists nickname text,
  add column if not exists last_four text,
  add column if not exists opened_date date,
  add column if not exists user_card_type text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_cards_last_four_length_check'
      and conrelid = 'public.user_cards'::regclass
  ) then
    alter table public.user_cards
      add constraint user_cards_last_four_length_check
      check (last_four is null or char_length(last_four) <= 4);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_cards_last_four_digits_check'
      and conrelid = 'public.user_cards'::regclass
  ) then
    alter table public.user_cards
      add constraint user_cards_last_four_digits_check
      check (last_four is null or last_four ~ '^[0-9]+$');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_cards_user_card_type_check'
      and conrelid = 'public.user_cards'::regclass
  ) then
    alter table public.user_cards
      add constraint user_cards_user_card_type_check
      check (user_card_type in ('personal', 'business') or user_card_type is null);
  end if;
end $$;
