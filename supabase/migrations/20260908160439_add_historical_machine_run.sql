create function public.add_historical_machine_run(
  p_machine_id uuid,
  p_production_date date,
  p_started_at timestamptz,
  p_stopped_at timestamptz,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_target_day public.production_days;
  v_stop_date date;
  v_run public.machine_runs;
  v_existing jsonb;
  v_response jsonb;
begin
  perform private.require_manager();
  if p_machine_id is null or p_production_date is null
    or p_started_at is null or p_stopped_at is null then
    raise exception 'INVALID_HISTORICAL_RUN_INPUT' using errcode = '22023';
  end if;
  if p_stopped_at <= p_started_at then
    raise exception 'INVALID_HISTORICAL_RUN_RANGE' using errcode = '22023';
  end if;

  perform private.require_occurrence_after_cutover(p_started_at);
  perform private.require_occurrence_after_cutover(p_stopped_at);
  if private.production_date_at(p_started_at) <> p_production_date then
    raise exception 'HISTORICAL_RUN_DAY_MISMATCH' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('production_machine:' || p_machine_id::text, 0)
  );
  v_existing := private.claim_production_action(
    p_idempotency_key,
    v_actor_id,
    'add_historical_machine_run',
    p_machine_id
  );
  if v_existing is not null then return v_existing; end if;

  perform machine.id
  from public.machines as machine
  where machine.id = p_machine_id and machine.is_active
  for key share;
  if not found then
    raise exception 'ACTIVE_MACHINE_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_target_day := private.ensure_open_production_day(p_production_date);
  v_stop_date := private.production_date_at(p_stopped_at);
  if v_stop_date <> p_production_date then
    perform private.ensure_open_operating_day(v_stop_date);
  end if;

  insert into public.machine_runs (
    machine_id,
    production_day_id,
    started_at,
    stopped_at,
    started_by,
    stopped_by
  ) values (
    p_machine_id,
    v_target_day.id,
    p_started_at,
    p_stopped_at,
    v_actor_id,
    v_actor_id
  )
  returning * into v_run;

  perform private.validate_machine_timeline(p_machine_id);
  perform private.write_audit(
    'machine_run.historical_run_added',
    'machine_run',
    v_run.id,
    null,
    null,
    to_jsonb(v_run)
  );

  v_response := jsonb_build_object(
    'machineId', p_machine_id,
    'runId', v_run.id,
    'productionDate', v_target_day.production_date,
    'startedAt', v_run.started_at,
    'stoppedAt', v_run.stopped_at
  );
  perform private.complete_production_action(p_idempotency_key, v_response);
  return v_response;
end;
$$;

revoke all on function public.add_historical_machine_run(uuid, date, timestamptz, timestamptz, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.add_historical_machine_run(uuid, date, timestamptz, timestamptz, uuid)
  to authenticated, service_role;
