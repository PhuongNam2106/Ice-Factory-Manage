create or replace function public.set_harvest_quantity(
  p_harvest_id uuid,
  p_quantity bigint,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_now timestamptz := clock_timestamp();
  v_harvest public.machine_harvests;
  v_day public.production_days;
  v_existing jsonb;
  v_response jsonb;
begin
  if (select private.is_active_user()) is distinct from true then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity < 0 or p_quantity > 10000000 then
    raise exception 'INVALID_BAG_QUANTITY' using errcode = '22023';
  end if;

  select * into v_harvest from public.machine_harvests where id = p_harvest_id;
  if not found then raise exception 'HARVEST_NOT_FOUND' using errcode = 'P0002'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('production_machine:' || v_harvest.machine_id::text, 0));
  v_existing := private.claim_production_action(p_idempotency_key, v_actor_id, 'set_harvest_quantity', v_harvest.machine_id);
  if v_existing is not null then return v_existing; end if;

  select * into v_harvest from public.machine_harvests where id = p_harvest_id for update;
  select day.* into v_day
  from public.production_days as day
  join public.machine_runs as run on run.production_day_id = day.id
  where run.id = v_harvest.machine_run_id
  for update of day;
  if v_day.status <> 'open' then raise exception 'PRODUCTION_DAY_LOCKED' using errcode = '55000'; end if;

  if v_harvest.bag_quantity is not null
    and (
      select revision.changed_by
      from public.machine_harvest_revisions as revision
      where revision.harvest_id = v_harvest.id
      order by revision.id
      limit 1
    ) is distinct from v_actor_id
    and (select private.is_manager()) is distinct from true then
    raise exception 'FORBIDDEN_QUANTITY_EDIT' using errcode = '42501';
  end if;

  insert into public.machine_harvest_revisions (
    harvest_id, old_quantity, new_quantity, changed_at, changed_by
  ) values (
    v_harvest.id, v_harvest.bag_quantity, p_quantity, v_now, v_actor_id
  );

  update public.machine_harvests
  set bag_quantity = p_quantity,
      quantity_updated_at = v_now,
      quantity_updated_by = v_actor_id
  where id = v_harvest.id
  returning * into v_harvest;

  v_response := jsonb_build_object(
    'harvestId', v_harvest.id,
    'machineId', v_harvest.machine_id,
    'quantity', v_harvest.bag_quantity,
    'quantityUpdatedAt', v_harvest.quantity_updated_at
  );
  perform private.complete_production_action(p_idempotency_key, v_response);
  return v_response;
end;
$$;
