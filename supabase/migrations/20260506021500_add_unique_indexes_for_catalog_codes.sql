do $$
begin
  if exists (
    select 1
    from (
      select card_code
      from public.cards
      where card_code is not null
      group by card_code
      having count(*) > 1
    ) duplicate_card_codes
  ) then
    raise exception
      'Cannot add unique index on public.cards(card_code): duplicate non-null card_code values already exist.';
  end if;
end $$;

create unique index if not exists cards_card_code_unique_idx
  on public.cards (card_code);

do $$
begin
  if exists (
    select 1
    from (
      select benefit_code
      from public.benefits
      where benefit_code is not null
      group by benefit_code
      having count(*) > 1
    ) duplicate_benefit_codes
  ) then
    raise exception
      'Cannot add unique index on public.benefits(benefit_code): duplicate non-null benefit_code values already exist.';
  end if;
end $$;

create unique index if not exists benefits_benefit_code_unique_idx
  on public.benefits (benefit_code);
