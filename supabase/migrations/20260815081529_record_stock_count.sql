create function public.record_stock_count(p_input jsonb, p_idempotency_key uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_claim public.idempotency_keys;
  v_day date;
  v_actual_bags bigint;
  v_expected_bags bigint;
  v_variance_bags bigint;
  v_variance_pct numeric(12,3);
  v_warning_pct numeric(5,2);
  v_requires_review boolean;
  v_note text;
  v_count_id uuid := extensions.gen_random_uuid();
  v_adjustment_id uuid;
  v_count public.stock_counts;
  v_response jsonb;
begin
  if p_input is null or jsonb_typeof(p_input) <> 'object' then
    raise exception 'INVALID_STOCK_COUNT_INPUT' using errcode = '22023';
  end if;
  if (select private.is_active_user()) is distinct from true then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  begin
    v_day := (p_input->>'operatingDay')::date;
    v_actual_bags := (p_input->>'actualBags')::bigint;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'INVALID_STOCK_COUNT_INPUT' using errcode = '22023';
  end;

  if v_actual_bags < 0 or v_actual_bags > 10000000 then
    raise exception 'INVALID_STOCK_COUNT_INPUT' using errcode = '22023';
  end if;
  v_note := nullif(trim(p_input->>'note'), '');
  if v_note is not null and length(v_note) > 1000 then
    raise exception 'INVALID_NOTE' using errcode = '22023';
  end if;

  perform private.require_open_day(v_day);
  v_claim := private.claim_idempotency_key(p_idempotency_key, 'record_stock_count', v_actor_id);
  if v_claim.status = 'completed' then return v_claim.response; end if;

  perform pg_catalog.pg_advisory_xact_lock(820260812);

  select coalesce(sum(quantity_delta_bags), 0)
  into v_expected_bags
  from public.inventory_ledger;

  select stock_variance_warning_pct
  into v_warning_pct
  from public.settings
  where id = true
  for key share;
  if not found then raise exception 'SETTINGS_NOT_FOUND' using errcode = 'P0001'; end if;

  v_variance_bags := v_actual_bags - v_expected_bags;
  v_variance_pct := case
    when v_expected_bags = 0 and v_variance_bags = 0 then 0
    when v_expected_bags = 0 then null
    else round(abs(v_variance_bags)::numeric * 100 / abs(v_expected_bags)::numeric, 3)
  end;
  v_requires_review := case
    when v_variance_pct is null then v_variance_bags <> 0
    else v_variance_pct > v_warning_pct
  end;

  if v_variance_bags <> 0 then
    insert into public.inventory_ledger (
      operating_day, kind, quantity_delta_bags, source_type, source_id, note, created_by
    ) values (
      v_day, 'adjustment', v_variance_bags, 'stock_count', v_count_id,
      coalesce(v_note, 'Điều chỉnh theo kiểm kê thực tế'), v_actor_id
    ) returning id into v_adjustment_id;
  end if;

  insert into public.stock_counts (
    id, operating_day, expected_bags, actual_bags, variance_pct,
    warning_pct, requires_review, adjustment_entry_id,
    note, idempotency_key, created_by
  ) values (
    v_count_id, v_day, v_expected_bags, v_actual_bags, v_variance_pct,
    v_warning_pct, v_requires_review, v_adjustment_id,
    v_note, p_idempotency_key, v_actor_id
  ) returning * into v_count;

  perform private.write_audit(
    'stock_count.created', 'stock_count', v_count.id, null, null, to_jsonb(v_count)
  );

  v_response := jsonb_build_object(
    'countId', v_count.id,
    'varianceBags', v_variance_bags::text,
    'variancePct', case when v_variance_pct is null then null else v_variance_pct::text end,
    'requiresReview', v_requires_review
  );
  update public.idempotency_keys
  set status = 'completed', entity_id = v_count.id, response = v_response,
      completed_at = now()
  where key = p_idempotency_key
    and actor_id = v_actor_id
    and operation = 'record_stock_count';
  if not found then raise exception 'IDEMPOTENCY_COMPLETION_FAILED' using errcode = 'P0001'; end if;

  return v_response;
end;
$$;

revoke all on function public.record_stock_count(jsonb, uuid)
from public, anon, authenticated, service_role;
grant execute on function public.record_stock_count(jsonb, uuid)
to authenticated, service_role;
