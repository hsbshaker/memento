-- Previous fix still used (user_id, benefit_id) — user_benefits v2 schema requires
-- user_card_id (user_cards.id FK) instead. Resolve it from user_cards first.
create or replace function public.bootstrap_user_benefits_for_card(p_user_id uuid, p_card_id uuid)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_card_id uuid;
  inserted_count integer;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'cannot bootstrap benefits for another user';
  end if;

  select id into v_user_card_id
  from public.user_cards
  where user_id = p_user_id
    and card_id = p_card_id
  limit 1;

  if v_user_card_id is null then
    return 0;
  end if;

  with inserted as (
    insert into public.user_benefits (user_card_id, benefit_id)
    select v_user_card_id, b.id
    from public.benefits b
    where b.card_id = p_card_id
      and b.track_in_memento = 'yes'
    on conflict (user_card_id, benefit_id) do nothing
    returning 1
  )
  select count(*) into inserted_count from inserted;

  return inserted_count;
end;
$$;
