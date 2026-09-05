alter table public.production_action_requests
drop constraint if exists production_action_requests_operation_check;

alter table public.production_action_requests
add constraint production_action_requests_operation_check
check (operation in (
  'start_machine', 'record_machine_harvest', 'stop_machine',
  'set_harvest_quantity', 'correct_production_action',
  'delete_production_action'
));

create function public.delete_production_action(
  p_action_type text,
  p_machine_id uuid,
  p_run_id uuid,
  p_harvest_id uuid,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_existing jsonb;
  v_response jsonb;
  v_run public.machine_runs;
  v_harvest public.machine_harvests;
  v_day public.production_days;
  v_before jsonb;
  v_after jsonb;
  v_latest_action text;
  v_latest_run_id uuid;
  v_latest_harvest_id uuid;
begin
  perform private.require_manager();
  if p_machine_id is null
    or p_action_type not in ('start', 'harvest', 'stop')
    or (p_action_type in ('start', 'stop') and (p_run_id is null or p_harvest_id is not null))
    or (p_action_type = 'harvest' and (p_harvest_id is null or p_run_id is not null)) then
    raise exception 'INVALID_DELETE_INPUT' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('production_machine:' || p_machine_id::text, 0)
  );
  v_existing := private.claim_production_action(
    p_idempotency_key,
    v_actor_id,
    'delete_production_action',
    p_machine_id
  );
  if v_existing is not null then return v_existing; end if;

  if p_action_type = 'harvest' then
    select harvest.* into v_harvest
    from public.machine_harvests as harvest
    where harvest.id = p_harvest_id and harvest.machine_id = p_machine_id
    for update;
    if not found then raise exception 'DELETE_ACTION_NOT_FOUND' using errcode = 'P0002'; end if;

    select day.* into v_day
    from public.production_days as day
    join public.machine_runs as run on run.production_day_id = day.id
    where run.id = v_harvest.machine_run_id
    for update of day;
  else
    select run.* into v_run
    from public.machine_runs as run
    where run.id = p_run_id and run.machine_id = p_machine_id
    for update;
    if not found then raise exception 'DELETE_ACTION_NOT_FOUND' using errcode = 'P0002'; end if;

    select day.* into v_day
    from public.production_days as day
    where day.id = v_run.production_day_id
    for update;
    if p_action_type = 'stop' and v_run.stopped_at is null then
      raise exception 'DELETE_ACTION_NOT_FOUND' using errcode = 'P0002';
    end if;
  end if;

  if v_day.status <> 'open' then
    raise exception 'PRODUCTION_DAY_LOCKED' using errcode = '55000';
  end if;

  select latest.action_type, latest.run_id, latest.harvest_id
  into v_latest_action, v_latest_run_id, v_latest_harvest_id
  from (
    select 'start'::text as action_type, run.id as run_id,
      null::uuid as harvest_id, run.started_at as occurred_at, 1 as action_order
    from public.machine_runs as run
    where run.machine_id = p_machine_id
    union all
    select 'harvest', harvest.machine_run_id, harvest.id,
      harvest.harvested_at, 2
    from public.machine_harvests as harvest
    where harvest.machine_id = p_machine_id
    union all
    select 'stop', run.id, null::uuid, run.stopped_at, 3
    from public.machine_runs as run
    where run.machine_id = p_machine_id and run.stopped_at is not null
  ) as latest
  order by latest.occurred_at desc, latest.action_order desc
  limit 1;

  if v_latest_action is distinct from p_action_type
    or (p_action_type = 'harvest' and v_latest_harvest_id is distinct from p_harvest_id)
    or (p_action_type in ('start', 'stop') and v_latest_run_id is distinct from p_run_id) then
    raise exception 'DELETE_ACTION_NOT_LATEST' using errcode = '55000';
  end if;

  if p_action_type = 'harvest' then
    v_before := to_jsonb(v_harvest) || jsonb_build_object(
      'quantity_revisions', coalesce((
        select jsonb_agg(to_jsonb(revision) order by revision.id)
        from public.machine_harvest_revisions as revision
        where revision.harvest_id = v_harvest.id
      ), '[]'::jsonb)
    );
    delete from public.machine_harvests where id = v_harvest.id;
    perform private.write_audit(
      'machine_harvest.deleted', 'machine_harvest', v_harvest.id,
      null, v_before, null
    );
  elsif p_action_type = 'stop' then
    v_before := to_jsonb(v_run);
    update public.machine_runs
    set stopped_at = null, stopped_by = null
    where id = v_run.id
    returning * into v_run;
    v_after := to_jsonb(v_run);
    perform private.write_audit(
      'machine_run.stop_deleted', 'machine_run', v_run.id,
      null, v_before, v_after
    );
  else
    v_before := to_jsonb(v_run);
    delete from public.machine_runs where id = v_run.id;
    perform private.write_audit(
      'machine_run.start_deleted', 'machine_run', v_run.id,
      null, v_before, null
    );
  end if;

  v_response := jsonb_strip_nulls(jsonb_build_object(
    'machineId', p_machine_id,
    'runId', p_run_id,
    'harvestId', p_harvest_id
  ));
  perform private.complete_production_action(p_idempotency_key, v_response);
  return v_response;
end;
$$;

revoke all on function public.delete_production_action(text, uuid, uuid, uuid, uuid)
from public, anon, authenticated, service_role;

grant execute on function public.delete_production_action(text, uuid, uuid, uuid, uuid)
to authenticated, service_role;
