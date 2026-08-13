create function private.reconcile_production_inventory(
  p_day date,
  p_shift_code text,
  p_machine_id uuid,
  p_actor_id uuid,
  p_selected_source public.production_source_kind default null,
  p_confirm boolean default false
)
returns public.production_source_selections
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_selection public.production_source_selections;
  v_batch_good bigint := 0;
  v_batch_count integer := 0;
  v_shift_good bigint;
  v_source public.production_source_kind;
  v_official_quantity bigint;
  v_inventory_entry_id uuid;
  v_source_event_id uuid;
  v_is_confirmed boolean := false;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_day::text || '/' || p_shift_code || '/' || p_machine_id::text, 0)
  );

  select coalesce(sum(batch.good_bags), 0), count(*)
  into v_batch_good, v_batch_count
  from public.production_batches as batch
  where batch.operating_day = p_day
    and batch.shift_code = p_shift_code
    and batch.machine_id = p_machine_id
    and batch.status = 'active';

  select total.good_bags
  into v_shift_good
  from public.production_shift_totals as total
  where total.operating_day = p_day
    and total.shift_code = p_shift_code
    and total.machine_id = p_machine_id;

  select selection.*
  into v_selection
  from public.production_source_selections as selection
  where selection.operating_day = p_day
    and selection.shift_code = p_shift_code
    and selection.machine_id = p_machine_id
  for update;

  if p_confirm then
    if p_selected_source is null then
      raise exception 'PRODUCTION_SOURCE_REQUIRED' using errcode = '22023';
    end if;
    if p_selected_source = 'batches' and v_batch_count = 0 then
      raise exception 'PRODUCTION_BATCHES_NOT_FOUND' using errcode = 'P0002';
    end if;
    if p_selected_source = 'shift_total' and v_shift_good is null then
      raise exception 'PRODUCTION_SHIFT_TOTAL_NOT_FOUND' using errcode = 'P0002';
    end if;
    v_source := p_selected_source;
    v_is_confirmed := true;
  elsif v_selection.id is not null then
    v_source := v_selection.selected_source;
    v_is_confirmed := false;
  elsif v_batch_count > 0 then
    v_source := 'batches';
  elsif v_shift_good is not null then
    v_source := 'shift_total';
  else
    raise exception 'PRODUCTION_SOURCE_DATA_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_official_quantity := case
    when v_source = 'shift_total' then coalesce(v_shift_good, 0)
    else v_batch_good
  end;

  if v_selection.id is null
    or v_selection.official_quantity_bags <> v_official_quantity
    or v_selection.selected_source <> v_source then
    if v_selection.inventory_entry_id is not null then
      insert into public.inventory_ledger (
        operating_day, kind, quantity_delta_bags, source_type, source_id, note, created_by
      ) values (
        p_day, 'reversal', -v_selection.official_quantity_bags,
        'production_reversal', v_selection.inventory_entry_id,
        'Đảo bút toán sản lượng chính thức trước khi đối soát lại', p_actor_id
      );
    end if;

    v_inventory_entry_id := null;
    if v_official_quantity > 0 then
      v_source_event_id := extensions.gen_random_uuid();
      insert into public.inventory_ledger (
        operating_day, kind, quantity_delta_bags, source_type, source_id, note, created_by
      ) values (
        p_day, 'production', v_official_quantity,
        'production_reconciliation', v_source_event_id,
        'Sản lượng chính thức: ' || v_source::text || ' / ' || p_shift_code, p_actor_id
      ) returning id into v_inventory_entry_id;
    end if;
  else
    v_inventory_entry_id := v_selection.inventory_entry_id;
  end if;

  insert into public.production_source_selections (
    operating_day, shift_code, machine_id, selected_source,
    is_confirmed, confirmed_by, confirmed_at,
    official_quantity_bags, inventory_entry_id
  ) values (
    p_day, p_shift_code, p_machine_id, v_source,
    v_is_confirmed,
    case when v_is_confirmed then p_actor_id else null end,
    case when v_is_confirmed then now() else null end,
    v_official_quantity, v_inventory_entry_id
  )
  on conflict (operating_day, shift_code, machine_id)
  do update set
    selected_source = excluded.selected_source,
    is_confirmed = excluded.is_confirmed,
    confirmed_by = excluded.confirmed_by,
    confirmed_at = excluded.confirmed_at,
    official_quantity_bags = excluded.official_quantity_bags,
    inventory_entry_id = excluded.inventory_entry_id
  returning * into v_selection;

  return v_selection;
end;
$$;

create function public.record_production_batch(p_input jsonb, p_idempotency_key uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_claim public.idempotency_keys;
  v_day date;
  v_shift_code text;
  v_machine_id uuid;
  v_start_time timestamptz;
  v_end_time timestamptz;
  v_good_bags bigint;
  v_rejected_bags bigint;
  v_note text;
  v_batch public.production_batches;
  v_response jsonb;
begin
  if p_input is null or jsonb_typeof(p_input) <> 'object' then
    raise exception 'INVALID_PRODUCTION_INPUT' using errcode = '22023';
  end if;
  if (select private.is_active_user()) is distinct from true then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  begin
    v_day := (p_input->>'operatingDay')::date;
    v_shift_code := p_input->>'shiftCode';
    v_machine_id := (p_input->>'machineId')::uuid;
    v_start_time := (p_input->>'startTime')::timestamptz;
    v_end_time := (p_input->>'endTime')::timestamptz;
    v_good_bags := (p_input->>'goodBags')::bigint;
    v_rejected_bags := coalesce((p_input->>'rejectedBags')::bigint, 0);
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'INVALID_PRODUCTION_INPUT' using errcode = '22023';
  end;

  if v_shift_code not in ('ca_sang', 'ca_chieu', 'ca_dem')
    or v_end_time <= v_start_time
    or v_good_bags < 0 or v_good_bags > 10000000
    or v_rejected_bags < 0 or v_rejected_bags > 10000000 then
    raise exception 'INVALID_PRODUCTION_INPUT' using errcode = '22023';
  end if;
  v_note := nullif(trim(p_input->>'note'), '');
  if v_note is not null and length(v_note) > 1000 then
    raise exception 'INVALID_NOTE' using errcode = '22023';
  end if;

  perform private.require_open_day(v_day);
  perform machine.id from public.machines as machine
  where machine.id = v_machine_id and machine.is_active for key share;
  if not found then
    raise exception 'ACTIVE_MACHINE_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_claim := private.claim_idempotency_key(p_idempotency_key, 'record_production_batch', v_actor_id);
  if v_claim.status = 'completed' then return v_claim.response; end if;

  insert into public.production_batches (
    operating_day, shift_code, machine_id, start_time, end_time,
    good_bags, rejected_bags, note, idempotency_key, created_by
  ) values (
    v_day, v_shift_code, v_machine_id, v_start_time, v_end_time,
    v_good_bags, v_rejected_bags, v_note, p_idempotency_key, v_actor_id
  ) returning * into v_batch;

  perform private.reconcile_production_inventory(v_day, v_shift_code, v_machine_id, v_actor_id);
  perform private.write_audit('production_batch.created', 'production_batch', v_batch.id, null, null, to_jsonb(v_batch));

  v_response := jsonb_build_object('batchId', v_batch.id);
  update public.idempotency_keys set status = 'completed', entity_id = v_batch.id,
    response = v_response, completed_at = now()
  where key = p_idempotency_key and actor_id = v_actor_id and operation = 'record_production_batch';
  if not found then raise exception 'IDEMPOTENCY_COMPLETION_FAILED' using errcode = 'P0001'; end if;
  return v_response;
end;
$$;

create function public.record_production_shift_total(p_input jsonb, p_idempotency_key uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_claim public.idempotency_keys;
  v_day date;
  v_shift_code text;
  v_machine_id uuid;
  v_good_bags bigint;
  v_rejected_bags bigint;
  v_note text;
  v_total public.production_shift_totals;
  v_response jsonb;
begin
  if p_input is null or jsonb_typeof(p_input) <> 'object' then
    raise exception 'INVALID_PRODUCTION_INPUT' using errcode = '22023';
  end if;
  if (select private.is_active_user()) is distinct from true then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  begin
    v_day := (p_input->>'operatingDay')::date;
    v_shift_code := p_input->>'shiftCode';
    v_machine_id := (p_input->>'machineId')::uuid;
    v_good_bags := (p_input->>'goodBags')::bigint;
    v_rejected_bags := coalesce((p_input->>'rejectedBags')::bigint, 0);
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'INVALID_PRODUCTION_INPUT' using errcode = '22023';
  end;
  if v_shift_code not in ('ca_sang', 'ca_chieu', 'ca_dem')
    or v_good_bags < 0 or v_good_bags > 10000000
    or v_rejected_bags < 0 or v_rejected_bags > 10000000 then
    raise exception 'INVALID_PRODUCTION_INPUT' using errcode = '22023';
  end if;
  v_note := nullif(trim(p_input->>'note'), '');
  if v_note is not null and length(v_note) > 1000 then
    raise exception 'INVALID_NOTE' using errcode = '22023';
  end if;

  perform private.require_open_day(v_day);
  perform machine.id from public.machines as machine
  where machine.id = v_machine_id and machine.is_active for key share;
  if not found then raise exception 'ACTIVE_MACHINE_NOT_FOUND' using errcode = 'P0002'; end if;

  v_claim := private.claim_idempotency_key(p_idempotency_key, 'record_production_shift_total', v_actor_id);
  if v_claim.status = 'completed' then return v_claim.response; end if;

  insert into public.production_shift_totals (
    operating_day, shift_code, machine_id, good_bags, rejected_bags,
    note, idempotency_key, created_by
  ) values (
    v_day, v_shift_code, v_machine_id, v_good_bags, v_rejected_bags,
    v_note, p_idempotency_key, v_actor_id
  ) on conflict (operating_day, shift_code, machine_id)
  do update set good_bags = excluded.good_bags, rejected_bags = excluded.rejected_bags,
    note = excluded.note, idempotency_key = excluded.idempotency_key,
    version = public.production_shift_totals.version + 1
  returning * into v_total;

  perform private.reconcile_production_inventory(v_day, v_shift_code, v_machine_id, v_actor_id);
  perform private.write_audit('production_shift_total.saved', 'production_shift_total', v_total.id, null, null, to_jsonb(v_total));
  v_response := jsonb_build_object('shiftTotalId', v_total.id);
  update public.idempotency_keys set status = 'completed', entity_id = v_total.id,
    response = v_response, completed_at = now()
  where key = p_idempotency_key and actor_id = v_actor_id and operation = 'record_production_shift_total';
  if not found then raise exception 'IDEMPOTENCY_COMPLETION_FAILED' using errcode = 'P0001'; end if;
  return v_response;
end;
$$;

create function public.select_production_source(p_input jsonb, p_idempotency_key uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_claim public.idempotency_keys;
  v_day date;
  v_shift_code text;
  v_machine_id uuid;
  v_source public.production_source_kind;
  v_selection public.production_source_selections;
  v_response jsonb;
begin
  if p_input is null or jsonb_typeof(p_input) <> 'object' then
    raise exception 'INVALID_PRODUCTION_INPUT' using errcode = '22023';
  end if;
  perform private.require_manager();
  begin
    v_day := (p_input->>'operatingDay')::date;
    v_shift_code := p_input->>'shiftCode';
    v_machine_id := (p_input->>'machineId')::uuid;
    v_source := (p_input->>'selectedSource')::public.production_source_kind;
  exception when invalid_text_representation then
    raise exception 'INVALID_PRODUCTION_INPUT' using errcode = '22023';
  end;
  if v_shift_code not in ('ca_sang', 'ca_chieu', 'ca_dem') then
    raise exception 'INVALID_PRODUCTION_INPUT' using errcode = '22023';
  end if;
  perform private.require_open_day(v_day);
  v_claim := private.claim_idempotency_key(p_idempotency_key, 'select_production_source', v_actor_id);
  if v_claim.status = 'completed' then return v_claim.response; end if;

  v_selection := private.reconcile_production_inventory(
    v_day, v_shift_code, v_machine_id, v_actor_id, v_source, true
  );
  perform private.write_audit(
    'production_source.confirmed', 'production_source_selection', v_selection.id, null,
    null, to_jsonb(v_selection)
  );
  v_response := jsonb_build_object('selectionId', v_selection.id);
  update public.idempotency_keys set status = 'completed', entity_id = v_selection.id,
    response = v_response, completed_at = now()
  where key = p_idempotency_key and actor_id = v_actor_id and operation = 'select_production_source';
  if not found then raise exception 'IDEMPOTENCY_COMPLETION_FAILED' using errcode = 'P0001'; end if;
  return v_response;
end;
$$;

revoke all on function private.reconcile_production_inventory(date, text, uuid, uuid, public.production_source_kind, boolean)
  from public, anon, authenticated, service_role;
revoke all on function public.record_production_batch(jsonb, uuid) from public, anon, authenticated, service_role;
revoke all on function public.record_production_shift_total(jsonb, uuid) from public, anon, authenticated, service_role;
revoke all on function public.select_production_source(jsonb, uuid) from public, anon, authenticated, service_role;

grant execute on function public.record_production_batch(jsonb, uuid) to authenticated, service_role;
grant execute on function public.record_production_shift_total(jsonb, uuid) to authenticated, service_role;
grant execute on function public.select_production_source(jsonb, uuid) to authenticated, service_role;
