do $$
declare
  mapping record;
  old_count integer;
  new_count integer;
begin
  for mapping in
    select *
    from (
      values
        ('amex_amex_business_platinum', 'amex_business_platinum'),
        ('amex_amex_gold', 'amex_gold'),
        ('amex_amex_business_gold', 'amex_business_gold'),
        ('amex_amex_green', 'amex_green'),
        ('amex_amex_everyday', 'amex_everyday'),
        ('amex_amex_everyday_preferred', 'amex_everyday_preferred'),
        ('amex_amex_platinum', 'amex_platinum')
    ) as mappings(old_code, new_code)
  loop
    select count(*) into old_count
    from public.cards
    where card_code = mapping.old_code;

    if old_count = 0 then
      continue;
    end if;

    if old_count > 1 then
      raise exception
        'Cannot normalize cards.card_code from % to % because the legacy code exists on % rows.',
        mapping.old_code,
        mapping.new_code,
        old_count;
    end if;

    select count(*) into new_count
    from public.cards
    where card_code = mapping.new_code;

    if new_count > 1 then
      raise exception
        'Cannot normalize cards.card_code to % because the canonical code already exists on % rows.',
        mapping.new_code,
        new_count;
    end if;

    if exists (
      select 1
      from public.cards old_card
      join public.cards new_card
        on new_card.card_code = mapping.new_code
      where old_card.card_code = mapping.old_code
        and old_card.id <> new_card.id
    ) then
      raise exception
        'Cannot normalize cards.card_code from % to % because the canonical code already exists on a different row.',
        mapping.old_code,
        mapping.new_code;
    end if;

    update public.cards
    set card_code = mapping.new_code
    where card_code = mapping.old_code;
  end loop;
end $$;
