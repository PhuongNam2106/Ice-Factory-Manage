-- Replace the legacy batch/shift-total workflow with realtime machine tracking.

drop view if exists public.daily_dashboard;

drop function if exists public.record_production_batch(jsonb, uuid);
drop function if exists public.record_production_shift_total(jsonb, uuid);
drop function if exists public.select_production_source(jsonb, uuid);
drop function if exists public.cancel_document(text, uuid, integer, text);
drop function if exists private.reconcile_cancelled_production(date, text, uuid, uuid, text);
drop function if exists private.reconcile_production_inventory(date, text, uuid, uuid, public.production_source_kind, boolean);
drop trigger if exists production_shift_totals_reactivate_correction on public.production_shift_totals;
drop function if exists private.reactivate_corrected_shift_total();

drop table if exists public.production_source_selections;

drop trigger if exists inventory_ledger_reject_delete on public.inventory_ledger;

delete from public.inventory_ledger
where kind = 'reversal'
  and (
    source_type in ('production_reversal', 'production_cancellation')
    or reversal_of_id in (
      select original.id
      from public.inventory_ledger as original
      where original.source_type = 'production_reconciliation'
    )
  );

delete from public.inventory_ledger
where source_type in ('production_reconciliation', 'production_reversal', 'production_cancellation');

create trigger inventory_ledger_reject_delete
before delete on public.inventory_ledger
for each statement execute function private.reject_inventory_mutation();

drop table if exists public.production_shift_totals;
drop table if exists public.production_batches;
drop type if exists public.production_source_kind;

alter table public.settings
add column production_harvest_reminder_minutes integer not null default 30
check (production_harvest_reminder_minutes between 1 and 1440);

create table public.production_days (
  id uuid primary key default extensions.gen_random_uuid(),
  production_date date not null unique,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.operating_day_status not null default 'open',
  locked_at timestamptz,
  locked_by uuid references public.profiles(id) on delete restrict,
  reopened_at timestamptz,
  reopened_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (
    (status = 'open' and locked_at is null and locked_by is null)
    or (status = 'locked' and locked_at is not null and locked_by is not null)
  )
);

create table public.machine_runs (
  id uuid primary key default extensions.gen_random_uuid(),
  machine_id uuid not null references public.machines(id) on delete restrict,
  production_day_id uuid not null references public.production_days(id) on delete restrict,
  started_at timestamptz not null,
  started_by uuid not null references public.profiles(id) on delete restrict,
  stopped_at timestamptz,
  stopped_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (id, machine_id),
  check (stopped_at is null or stopped_at > started_at),
  check (
    (stopped_at is null and stopped_by is null)
    or (stopped_at is not null and stopped_by is not null)
  )
);

create unique index machine_runs_one_open_per_machine_idx
on public.machine_runs (machine_id)
where stopped_at is null;
create index machine_runs_machine_started_idx
on public.machine_runs (machine_id, started_at desc);
create index machine_runs_production_day_idx on public.machine_runs (production_day_id);
create index machine_runs_started_by_idx on public.machine_runs (started_by);
create index machine_runs_stopped_by_idx on public.machine_runs (stopped_by)
where stopped_by is not null;

create table public.machine_harvests (
  id uuid primary key default extensions.gen_random_uuid(),
  machine_id uuid not null references public.machines(id) on delete restrict,
  machine_run_id uuid not null,
  harvested_at timestamptz not null,
  harvested_by uuid not null references public.profiles(id) on delete restrict,
  bag_quantity bigint check (bag_quantity between 0 and 10000000),
  quantity_updated_at timestamptz,
  quantity_updated_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (machine_run_id, machine_id)
    references public.machine_runs(id, machine_id) on delete restrict,
  check (
    (bag_quantity is null and quantity_updated_at is null and quantity_updated_by is null)
    or (bag_quantity is not null and quantity_updated_at is not null and quantity_updated_by is not null)
  )
);

create unique index machine_harvests_one_pending_per_machine_idx
on public.machine_harvests (machine_id)
where bag_quantity is null;
create index machine_harvests_run_time_idx
on public.machine_harvests (machine_run_id, harvested_at desc);
create index machine_harvests_machine_time_idx
on public.machine_harvests (machine_id, harvested_at desc);
create index machine_harvests_harvested_by_idx on public.machine_harvests (harvested_by);
create index machine_harvests_quantity_updated_by_idx on public.machine_harvests (quantity_updated_by)
where quantity_updated_by is not null;

create table public.machine_harvest_revisions (
  id bigint generated always as identity primary key,
  harvest_id uuid not null references public.machine_harvests(id) on delete cascade,
  old_quantity bigint check (old_quantity is null or old_quantity between 0 and 10000000),
  new_quantity bigint not null check (new_quantity between 0 and 10000000),
  changed_at timestamptz not null default now(),
  changed_by uuid not null references public.profiles(id) on delete restrict
);

create index machine_harvest_revisions_harvest_time_idx
on public.machine_harvest_revisions (harvest_id, changed_at desc);
create index machine_harvest_revisions_changed_by_idx
on public.machine_harvest_revisions (changed_by);

create table public.production_action_requests (
  request_id uuid primary key,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  operation text not null check (operation in (
    'start_machine', 'record_machine_harvest', 'stop_machine',
    'set_harvest_quantity', 'correct_production_action'
  )),
  machine_id uuid not null references public.machines(id) on delete restrict,
  response jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check (
    (response is null and completed_at is null)
    or (response is not null and completed_at is not null)
  )
);

create index production_action_requests_actor_created_idx
on public.production_action_requests (actor_id, created_at desc);
create index production_action_requests_machine_created_idx
on public.production_action_requests (machine_id, created_at desc);

create function private.production_date_at(p_at timestamptz)
returns date
language sql
immutable
set search_path = ''
as $$
  select case
    when (p_at at time zone 'Asia/Bangkok')::time >= time '20:00'
      then (p_at at time zone 'Asia/Bangkok')::date
    else (p_at at time zone 'Asia/Bangkok')::date - 1
  end
$$;

create function private.ensure_open_production_day(p_production_date date)
returns public.production_days
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day public.production_days;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('production_day:' || p_production_date::text, 0)
  );

  insert into public.production_days (production_date, starts_at, ends_at)
  values (
    p_production_date,
    (p_production_date::timestamp + time '20:00') at time zone 'Asia/Bangkok',
    ((p_production_date + 1)::timestamp + time '18:00') at time zone 'Asia/Bangkok'
  )
  on conflict (production_date) do nothing;

  select * into v_day
  from public.production_days
  where production_date = p_production_date
  for update;

  if v_day.status <> 'open' then
    raise exception 'PRODUCTION_DAY_LOCKED' using errcode = '55000';
  end if;
  return v_day;
end;
$$;

create function private.claim_production_action(
  p_request_id uuid,
  p_actor_id uuid,
  p_operation text,
  p_machine_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.production_action_requests;
begin
  if p_request_id is null then
    raise exception 'INVALID_IDEMPOTENCY_KEY' using errcode = '22023';
  end if;

  insert into public.production_action_requests (
    request_id, actor_id, operation, machine_id
  ) values (
    p_request_id, p_actor_id, p_operation, p_machine_id
  ) on conflict (request_id) do nothing;

  if found then return null; end if;

  select * into v_existing
  from public.production_action_requests
  where request_id = p_request_id
  for update;

  if v_existing.actor_id is distinct from p_actor_id
    or v_existing.operation is distinct from p_operation
    or v_existing.machine_id is distinct from p_machine_id then
    raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode = '22023';
  end if;
  if v_existing.response is null then
    raise exception 'ACTION_IN_PROGRESS' using errcode = '55000';
  end if;
  return v_existing.response;
end;
$$;

create function private.complete_production_action(
  p_request_id uuid,
  p_response jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.production_action_requests
  set response = p_response, completed_at = clock_timestamp()
  where request_id = p_request_id and response is null;
  if not found then
    raise exception 'IDEMPOTENCY_COMPLETION_FAILED' using errcode = 'P0001';
  end if;
end;
$$;

create function private.validate_machine_timeline(p_machine_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.machine_runs as run
    join public.production_days as day on day.id = run.production_day_id
    where run.machine_id = p_machine_id
      and (run.started_at < day.starts_at or run.started_at >= day.ends_at)
  ) then
    raise exception 'RUN_OUTSIDE_PRODUCTION_DAY' using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.machine_runs as earlier
    join public.machine_runs as later
      on later.machine_id = earlier.machine_id and later.id <> earlier.id
    where earlier.machine_id = p_machine_id
      and tstzrange(earlier.started_at, coalesce(earlier.stopped_at, 'infinity'::timestamptz), '[)')
        && tstzrange(later.started_at, coalesce(later.stopped_at, 'infinity'::timestamptz), '[)')
  ) then
    raise exception 'MACHINE_RUN_OVERLAP' using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.machine_harvests as harvest
    join public.machine_runs as run on run.id = harvest.machine_run_id
    where harvest.machine_id = p_machine_id
      and (
        harvest.harvested_at < run.started_at
        or (run.stopped_at is not null and harvest.harvested_at > run.stopped_at)
      )
  ) then
    raise exception 'HARVEST_OUTSIDE_RUN' using errcode = '23514';
  end if;
end;
$$;

create function public.start_machine(p_machine_id uuid, p_idempotency_key uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_now timestamptz := clock_timestamp();
  v_local_time time;
  v_day public.production_days;
  v_run public.machine_runs;
  v_existing jsonb;
  v_response jsonb;
begin
  if (select private.is_active_user()) is distinct from true then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_machine_id is null then
    raise exception 'INVALID_MACHINE' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('production_machine:' || p_machine_id::text, 0));
  v_existing := private.claim_production_action(p_idempotency_key, v_actor_id, 'start_machine', p_machine_id);
  if v_existing is not null then return v_existing; end if;

  perform machine.id from public.machines as machine
  where machine.id = p_machine_id and machine.is_active for key share;
  if not found then raise exception 'ACTIVE_MACHINE_NOT_FOUND' using errcode = 'P0002'; end if;

  v_local_time := (v_now at time zone 'Asia/Bangkok')::time;
  if v_local_time >= time '18:00' and v_local_time < time '20:00' then
    raise exception 'START_OUTSIDE_PRODUCTION_HOURS' using errcode = '22023';
  end if;
  if exists (select 1 from public.machine_runs where machine_id = p_machine_id and stopped_at is null) then
    raise exception 'MACHINE_ALREADY_RUNNING' using errcode = '55000';
  end if;

  v_day := private.ensure_open_production_day(private.production_date_at(v_now));
  insert into public.machine_runs (
    machine_id, production_day_id, started_at, started_by
  ) values (
    p_machine_id, v_day.id, v_now, v_actor_id
  ) returning * into v_run;

  v_response := jsonb_build_object(
    'runId', v_run.id,
    'machineId', p_machine_id,
    'productionDate', v_day.production_date,
    'startedAt', v_run.started_at
  );
  perform private.complete_production_action(p_idempotency_key, v_response);
  return v_response;
end;
$$;

create function public.record_machine_harvest(p_machine_id uuid, p_idempotency_key uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_now timestamptz := clock_timestamp();
  v_run public.machine_runs;
  v_day public.production_days;
  v_harvest public.machine_harvests;
  v_existing jsonb;
  v_response jsonb;
begin
  if (select private.is_active_user()) is distinct from true then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('production_machine:' || p_machine_id::text, 0));
  v_existing := private.claim_production_action(p_idempotency_key, v_actor_id, 'record_machine_harvest', p_machine_id);
  if v_existing is not null then return v_existing; end if;

  select run.* into v_run from public.machine_runs as run
  where run.machine_id = p_machine_id and run.stopped_at is null
  for update;
  if not found then raise exception 'MACHINE_NOT_RUNNING' using errcode = '55000'; end if;

  select * into v_day from public.production_days where id = v_run.production_day_id for update;
  if v_day.status <> 'open' then raise exception 'PRODUCTION_DAY_LOCKED' using errcode = '55000'; end if;
  if exists (select 1 from public.machine_harvests where machine_id = p_machine_id and bag_quantity is null) then
    raise exception 'PENDING_HARVEST_EXISTS' using errcode = '55000';
  end if;

  insert into public.machine_harvests (
    machine_id, machine_run_id, harvested_at, harvested_by
  ) values (
    p_machine_id, v_run.id, v_now, v_actor_id
  ) returning * into v_harvest;

  v_response := jsonb_build_object(
    'harvestId', v_harvest.id,
    'runId', v_run.id,
    'machineId', p_machine_id,
    'harvestedAt', v_harvest.harvested_at
  );
  perform private.complete_production_action(p_idempotency_key, v_response);
  return v_response;
end;
$$;

create function public.stop_machine(p_machine_id uuid, p_idempotency_key uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_now timestamptz := clock_timestamp();
  v_run public.machine_runs;
  v_day public.production_days;
  v_existing jsonb;
  v_response jsonb;
begin
  if (select private.is_active_user()) is distinct from true then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('production_machine:' || p_machine_id::text, 0));
  v_existing := private.claim_production_action(p_idempotency_key, v_actor_id, 'stop_machine', p_machine_id);
  if v_existing is not null then return v_existing; end if;

  select run.* into v_run from public.machine_runs as run
  where run.machine_id = p_machine_id and run.stopped_at is null
  for update;
  if not found then raise exception 'MACHINE_NOT_RUNNING' using errcode = '55000'; end if;
  select * into v_day from public.production_days where id = v_run.production_day_id for update;
  if v_day.status <> 'open' then raise exception 'PRODUCTION_DAY_LOCKED' using errcode = '55000'; end if;

  update public.machine_runs
  set stopped_at = v_now, stopped_by = v_actor_id
  where id = v_run.id
  returning * into v_run;

  v_response := jsonb_build_object(
    'runId', v_run.id,
    'machineId', p_machine_id,
    'stoppedAt', v_run.stopped_at
  );
  perform private.complete_production_action(p_idempotency_key, v_response);
  return v_response;
end;
$$;

create function public.set_harvest_quantity(
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

create function public.correct_production_action(p_input jsonb, p_idempotency_key uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_action text;
  v_occurred_at timestamptz;
  v_machine_id uuid;
  v_run_id uuid;
  v_harvest_id uuid;
  v_production_date date;
  v_day public.production_days;
  v_run public.machine_runs;
  v_harvest public.machine_harvests;
  v_before jsonb;
  v_after jsonb;
  v_existing jsonb;
  v_response jsonb;
  v_quantity bigint;
begin
  perform private.require_manager();
  if p_input is null or jsonb_typeof(p_input) <> 'object' then
    raise exception 'INVALID_CORRECTION_INPUT' using errcode = '22023';
  end if;

  begin
    v_action := p_input->>'actionType';
    v_occurred_at := (p_input->>'occurredAt')::timestamptz;
    v_run_id := nullif(p_input->>'runId', '')::uuid;
    v_harvest_id := nullif(p_input->>'harvestId', '')::uuid;
    v_machine_id := nullif(p_input->>'machineId', '')::uuid;
    v_quantity := nullif(p_input->>'bagQuantity', '')::bigint;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'INVALID_CORRECTION_INPUT' using errcode = '22023';
  end;
  if v_action not in (
    'add_start', 'add_harvest', 'add_stop',
    'change_run_start', 'change_run_stop', 'change_harvest_time'
  ) or v_occurred_at is null then
    raise exception 'INVALID_CORRECTION_INPUT' using errcode = '22023';
  end if;
  if v_quantity is not null and (v_quantity < 0 or v_quantity > 10000000) then
    raise exception 'INVALID_BAG_QUANTITY' using errcode = '22023';
  end if;

  if v_action in ('change_run_start', 'change_run_stop') then
    select * into v_run from public.machine_runs where id = v_run_id;
    if not found then raise exception 'RUN_NOT_FOUND' using errcode = 'P0002'; end if;
    v_machine_id := v_run.machine_id;
  elsif v_action = 'change_harvest_time' then
    select * into v_harvest from public.machine_harvests where id = v_harvest_id;
    if not found then raise exception 'HARVEST_NOT_FOUND' using errcode = 'P0002'; end if;
    v_machine_id := v_harvest.machine_id;
  elsif v_machine_id is null then
    raise exception 'INVALID_CORRECTION_INPUT' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('production_machine:' || v_machine_id::text, 0));
  v_existing := private.claim_production_action(p_idempotency_key, v_actor_id, 'correct_production_action', v_machine_id);
  if v_existing is not null then return v_existing; end if;

  if v_action = 'add_start' then
    if ((v_occurred_at at time zone 'Asia/Bangkok')::time >= time '18:00'
      and (v_occurred_at at time zone 'Asia/Bangkok')::time < time '20:00') then
      raise exception 'START_OUTSIDE_PRODUCTION_HOURS' using errcode = '22023';
    end if;
    perform machine.id from public.machines as machine
    where machine.id = v_machine_id and machine.is_active for key share;
    if not found then raise exception 'ACTIVE_MACHINE_NOT_FOUND' using errcode = 'P0002'; end if;
    v_production_date := private.production_date_at(v_occurred_at);
    v_day := private.ensure_open_production_day(v_production_date);
    insert into public.machine_runs (machine_id, production_day_id, started_at, started_by)
    values (v_machine_id, v_day.id, v_occurred_at, v_actor_id)
    returning * into v_run;
    v_before := null;
    v_after := to_jsonb(v_run);
    v_run_id := v_run.id;

  elsif v_action = 'add_stop' then
    select run.* into v_run from public.machine_runs as run
    where run.machine_id = v_machine_id and run.stopped_at is null
    for update;
    if not found then raise exception 'MACHINE_NOT_RUNNING' using errcode = '55000'; end if;
    select * into v_day from public.production_days where id = v_run.production_day_id for update;
    if v_day.status <> 'open' then raise exception 'PRODUCTION_DAY_LOCKED' using errcode = '55000'; end if;
    v_before := to_jsonb(v_run);
    update public.machine_runs set stopped_at = v_occurred_at, stopped_by = v_actor_id
    where id = v_run.id returning * into v_run;
    v_after := to_jsonb(v_run);
    v_run_id := v_run.id;

  elsif v_action = 'add_harvest' then
    select run.* into v_run from public.machine_runs as run
    join public.production_days as day on day.id = run.production_day_id
    where run.machine_id = v_machine_id
      and day.status = 'open'
      and v_occurred_at >= run.started_at
      and (run.stopped_at is null or v_occurred_at <= run.stopped_at)
    order by run.started_at desc
    limit 1 for update of run;
    if not found then raise exception 'RUN_NOT_FOUND_FOR_TIME' using errcode = 'P0002'; end if;
    insert into public.machine_harvests (
      machine_id, machine_run_id, harvested_at, harvested_by,
      bag_quantity, quantity_updated_at, quantity_updated_by
    ) values (
      v_machine_id, v_run.id, v_occurred_at, v_actor_id,
      v_quantity,
      case when v_quantity is not null then clock_timestamp() end,
      case when v_quantity is not null then v_actor_id end
    ) returning * into v_harvest;
    if v_quantity is not null then
      insert into public.machine_harvest_revisions (harvest_id, old_quantity, new_quantity, changed_by)
      values (v_harvest.id, null, v_quantity, v_actor_id);
    end if;
    v_before := null;
    v_after := to_jsonb(v_harvest);
    v_harvest_id := v_harvest.id;

  elsif v_action = 'change_run_start' then
    select * into v_run from public.machine_runs where id = v_run_id for update;
    select * into v_day from public.production_days where id = v_run.production_day_id for update;
    if v_day.status <> 'open' then raise exception 'PRODUCTION_DAY_LOCKED' using errcode = '55000'; end if;
    v_before := to_jsonb(v_run);
    update public.machine_runs set started_at = v_occurred_at
    where id = v_run.id returning * into v_run;
    v_after := to_jsonb(v_run);

  elsif v_action = 'change_run_stop' then
    select * into v_run from public.machine_runs where id = v_run_id for update;
    if not found or v_run.stopped_at is null then raise exception 'RUN_NOT_STOPPED' using errcode = '55000'; end if;
    select * into v_day from public.production_days where id = v_run.production_day_id for update;
    if v_day.status <> 'open' then raise exception 'PRODUCTION_DAY_LOCKED' using errcode = '55000'; end if;
    v_before := to_jsonb(v_run);
    update public.machine_runs set stopped_at = v_occurred_at
    where id = v_run.id returning * into v_run;
    v_after := to_jsonb(v_run);

  else
    select * into v_harvest from public.machine_harvests where id = v_harvest_id for update;
    select day.* into v_day
    from public.production_days as day
    join public.machine_runs as run on run.production_day_id = day.id
    where run.id = v_harvest.machine_run_id
    for update of day;
    if v_day.status <> 'open' then raise exception 'PRODUCTION_DAY_LOCKED' using errcode = '55000'; end if;
    v_before := to_jsonb(v_harvest);
    update public.machine_harvests set harvested_at = v_occurred_at
    where id = v_harvest.id returning * into v_harvest;
    v_after := to_jsonb(v_harvest);
  end if;

  perform private.validate_machine_timeline(v_machine_id);
  perform private.write_audit(
    case v_action
      when 'add_start' then 'machine_run.missing_start_added'
      when 'add_stop' then 'machine_run.missing_stop_added'
      when 'add_harvest' then 'machine_harvest.missing_harvest_added'
      when 'change_run_start' then 'machine_run.start_time_changed'
      when 'change_run_stop' then 'machine_run.stop_time_changed'
      else 'machine_harvest.time_changed'
    end,
    case when v_action in ('add_harvest', 'change_harvest_time') then 'machine_harvest' else 'machine_run' end,
    coalesce(v_harvest_id, v_run_id), null, v_before, v_after
  );

  v_response := jsonb_build_object(
    'actionType', v_action,
    'machineId', v_machine_id,
    'runId', v_run_id,
    'harvestId', v_harvest_id
  );
  perform private.complete_production_action(p_idempotency_key, v_response);
  return v_response;
end;
$$;

create function public.lock_production_day(p_production_date date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_day public.production_days;
  v_before jsonb;
begin
  perform private.require_manager();
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('production_day:' || p_production_date::text, 0));
  select * into v_day from public.production_days
  where production_date = p_production_date for update;
  if not found then raise exception 'PRODUCTION_DAY_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_day.status <> 'open' then raise exception 'INVALID_STATE' using errcode = '55000'; end if;
  if exists (
    select 1 from public.machine_runs
    where production_day_id = v_day.id and stopped_at is null
  ) then raise exception 'OPEN_MACHINE_RUNS' using errcode = '55000'; end if;
  if exists (
    select 1 from public.machine_harvests as harvest
    join public.machine_runs as run on run.id = harvest.machine_run_id
    where run.production_day_id = v_day.id and harvest.bag_quantity is null
  ) then raise exception 'PENDING_HARVESTS' using errcode = '55000'; end if;

  v_before := to_jsonb(v_day);
  update public.production_days
  set status = 'locked', locked_at = clock_timestamp(), locked_by = v_actor_id
  where id = v_day.id returning * into v_day;
  perform private.write_audit('production_day.locked', 'production_day', v_day.id, null, v_before, to_jsonb(v_day));
  return jsonb_build_object('productionDate', v_day.production_date, 'status', v_day.status);
end;
$$;

create function public.reopen_production_day(p_production_date date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_day public.production_days;
  v_before jsonb;
begin
  perform private.require_manager();
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('production_day:' || p_production_date::text, 0));
  select * into v_day from public.production_days
  where production_date = p_production_date for update;
  if not found then raise exception 'PRODUCTION_DAY_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_day.status <> 'locked' then raise exception 'INVALID_STATE' using errcode = '55000'; end if;
  v_before := to_jsonb(v_day);
  update public.production_days
  set status = 'open', locked_at = null, locked_by = null,
      reopened_at = clock_timestamp(), reopened_by = v_actor_id
  where id = v_day.id returning * into v_day;
  perform private.write_audit('production_day.reopened', 'production_day', v_day.id, null, v_before, to_jsonb(v_day));
  return jsonb_build_object('productionDate', v_day.production_date, 'status', v_day.status);
end;
$$;

create function public.get_production_board(p_production_date date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_starts_at timestamptz := (p_production_date::timestamp + time '20:00') at time zone 'Asia/Bangkok';
  v_ends_at timestamptz := ((p_production_date + 1)::timestamp + time '18:00') at time zone 'Asia/Bangkok';
  v_day public.production_days;
begin
  if (select private.is_active_user()) is distinct from true then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  select * into v_day from public.production_days where production_date = p_production_date;

  return jsonb_build_object(
    'productionDate', p_production_date,
    'startsAt', coalesce(v_day.starts_at, v_starts_at),
    'endsAt', coalesce(v_day.ends_at, v_ends_at),
    'status', coalesce(v_day.status::text, 'open'),
    'reminderMinutes', (select production_harvest_reminder_minutes from public.settings where id = true),
    'machines', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', machine.id,
        'name', machine.name,
        'code', machine.code,
        'openRun', (
          select jsonb_build_object(
            'id', open_run.id,
            'productionDate', open_day.production_date,
            'startedAt', open_run.started_at,
            'startedBy', starter.full_name
          )
          from public.machine_runs as open_run
          join public.production_days as open_day on open_day.id = open_run.production_day_id
          join public.profiles as starter on starter.id = open_run.started_by
          where open_run.machine_id = machine.id and open_run.stopped_at is null
          limit 1
        ),
        'pendingHarvest', (
          select jsonb_build_object(
            'id', pending.id,
            'runId', pending.machine_run_id,
            'harvestedAt', pending.harvested_at,
            'harvestedBy', harvester.full_name
          )
          from public.machine_harvests as pending
          join public.profiles as harvester on harvester.id = pending.harvested_by
          where pending.machine_id = machine.id and pending.bag_quantity is null
          limit 1
        ),
        'totalBags', coalesce((
          select sum(harvest.bag_quantity)
          from public.machine_harvests as harvest
          join public.machine_runs as run on run.id = harvest.machine_run_id
          where run.machine_id = machine.id
            and run.production_day_id = v_day.id
        ), 0),
        'harvestCount', (
          select count(*)
          from public.machine_harvests as harvest
          join public.machine_runs as run on run.id = harvest.machine_run_id
          where run.machine_id = machine.id
            and run.production_day_id = v_day.id
            and harvest.bag_quantity is not null
        ),
        'logs', coalesce((
          select jsonb_agg(log_item.item order by log_item.occurred_at desc)
          from (
            select run.started_at as occurred_at, jsonb_build_object(
              'id', run.id::text || ':start', 'type', 'start', 'occurredAt', run.started_at,
              'actorName', starter.full_name, 'runId', run.id
            ) as item
            from public.machine_runs as run
            join public.profiles as starter on starter.id = run.started_by
            where run.machine_id = machine.id and run.production_day_id = v_day.id
            union all
            select harvest.harvested_at, jsonb_build_object(
              'id', harvest.id::text || ':harvest', 'type', 'harvest', 'occurredAt', harvest.harvested_at,
              'actorName', harvester.full_name, 'runId', harvest.machine_run_id,
              'harvestId', harvest.id, 'bagQuantity', harvest.bag_quantity,
              'quantityUpdatedAt', harvest.quantity_updated_at,
              'quantityUpdatedBy', updater.full_name
            )
            from public.machine_harvests as harvest
            join public.machine_runs as run on run.id = harvest.machine_run_id
            join public.profiles as harvester on harvester.id = harvest.harvested_by
            left join public.profiles as updater on updater.id = harvest.quantity_updated_by
            where run.machine_id = machine.id and run.production_day_id = v_day.id
            union all
            select run.stopped_at, jsonb_build_object(
              'id', run.id::text || ':stop', 'type', 'stop', 'occurredAt', run.stopped_at,
              'actorName', stopper.full_name, 'runId', run.id
            )
            from public.machine_runs as run
            join public.profiles as stopper on stopper.id = run.stopped_by
            where run.machine_id = machine.id and run.production_day_id = v_day.id
              and run.stopped_at is not null
          ) as log_item
        ), '[]'::jsonb)
      ) order by machine.name)
      from public.machines as machine
      where machine.is_active
    ), '[]'::jsonb)
  );
end;
$$;

create function public.get_production_summary(p_from date, p_to date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select private.is_active_user()) is distinct from true then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 366 then
    raise exception 'INVALID_DATE_RANGE' using errcode = '22023';
  end if;

  return coalesce((
    with selected_days as (
      select day.id, day.production_date, day.starts_at, day.ends_at
      from public.production_days as day
      where day.production_date between p_from and p_to
    ),
    run_stats as (
      select
        run.machine_id,
        coalesce(sum(extract(epoch from (coalesce(run.stopped_at, clock_timestamp()) - run.started_at))), 0) as runtime_seconds,
        coalesce(sum(extract(epoch from (
          greatest(
            interval '0 seconds',
            least(coalesce(run.stopped_at, day.ends_at), day.ends_at) - greatest(run.started_at, day.starts_at)
          )
        ))), 0) as scheduled_runtime_seconds
      from public.machine_runs as run
      join selected_days as day on day.id = run.production_day_id
      group by run.machine_id
    ),
    harvest_rows as (
      select
        run.machine_id,
        harvest.harvested_at,
        harvest.bag_quantity,
        lag(harvest.harvested_at) over (
          partition by run.machine_id order by harvest.harvested_at
        ) as previous_harvest_at
      from public.machine_harvests as harvest
      join public.machine_runs as run on run.id = harvest.machine_run_id
      join selected_days as day on day.id = run.production_day_id
    ),
    harvest_stats as (
      select
        machine_id,
        coalesce(sum(bag_quantity), 0) as total_bags,
        count(*) filter (where bag_quantity is not null) as harvest_count,
        count(*) filter (where bag_quantity is null) as pending_harvest_count,
        avg(extract(epoch from (harvested_at - previous_harvest_at)))
          filter (where previous_harvest_at is not null) as average_harvest_interval_seconds,
        max(harvested_at) as latest_harvest_at
      from harvest_rows
      group by machine_id
    )
    select jsonb_agg(jsonb_build_object(
      'machineId', machine.id,
      'machineName', machine.name,
      'machineCode', machine.code,
      'totalBags', coalesce(harvest.total_bags, 0),
      'harvestCount', coalesce(harvest.harvest_count, 0),
      'pendingHarvestCount', coalesce(harvest.pending_harvest_count, 0),
      'averageBagsPerHarvest', case
        when coalesce(harvest.harvest_count, 0) = 0 then null
        else round(harvest.total_bags::numeric / harvest.harvest_count, 2)
      end,
      'runtimeSeconds', coalesce(runs.runtime_seconds, 0),
      'downtimeSeconds', greatest(
        0,
        ((p_to - p_from + 1) * 22 * 60 * 60)::numeric - coalesce(runs.scheduled_runtime_seconds, 0)
      ),
      'averageHarvestIntervalSeconds', harvest.average_harvest_interval_seconds,
      'latestHarvestAt', harvest.latest_harvest_at,
      'isRunning', exists (
        select 1 from public.machine_runs current_run
        where current_run.machine_id = machine.id and current_run.stopped_at is null
      )
    ) order by machine.name)
    from public.machines as machine
    left join run_stats as runs on runs.machine_id = machine.id
    left join harvest_stats as harvest on harvest.machine_id = machine.id
    where machine.is_active
  ), '[]'::jsonb);
end;
$$;

create or replace function private.compute_daily_reconciliation(p_day date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wholesale_vnd bigint;
  v_retail_vnd bigint;
  v_sold_bags bigint;
  v_collected_vnd bigint;
  v_new_debt_vnd bigint;
  v_production_bags bigint;
  v_approved_expense_vnd bigint;
  v_pending_expense_vnd bigint;
  v_pending_expense_count integer;
  v_unnamed_credit_count integer;
  v_invalid_document_count integer := 0;
  v_stock_expected bigint;
  v_stock_actual bigint;
  v_stock_variance bigint;
  v_stock_variance_pct numeric(12,3);
  v_stock_count_exists boolean;
  v_warning_pct numeric(5,2);
  v_checks jsonb := '[]'::jsonb;
begin
  select
    coalesce(sum(total_vnd) filter (where kind = 'wholesale'), 0),
    coalesce(sum(total_vnd) filter (where kind = 'retail'), 0),
    coalesce(sum((select sum(sl.quantity_bags) from public.sale_lines sl where sl.sale_id = s.id)), 0),
    count(*) filter (where kind = 'wholesale' and paid_now_vnd < total_vnd and customer_id is null)
  into v_wholesale_vnd, v_retail_vnd, v_sold_bags, v_unnamed_credit_count
  from public.sales s
  where operating_day = p_day and status = 'active';

  select coalesce(sum(amount_vnd), 0) into v_collected_vnd
  from public.receipts where operating_day = p_day and status = 'active';
  select coalesce(sum(original_amount_vnd), 0) into v_new_debt_vnd
  from public.receivables where operating_day = p_day and status <> 'cancelled';
  select coalesce(sum(harvest.bag_quantity), 0) into v_production_bags
  from public.machine_harvests as harvest
  join public.machine_runs as run on run.id = harvest.machine_run_id
  join public.production_days as production_day on production_day.id = run.production_day_id
  where production_day.production_date = p_day;
  select
    coalesce(sum(amount_vnd) filter (where status = 'approved'), 0),
    coalesce(sum(amount_vnd) filter (where status = 'pending'), 0),
    count(*) filter (where status = 'pending')
  into v_approved_expense_vnd, v_pending_expense_vnd, v_pending_expense_count
  from public.expenses where operating_day = p_day;

  select expected_bags, actual_bags, variance_bags, variance_pct
  into v_stock_expected, v_stock_actual, v_stock_variance, v_stock_variance_pct
  from public.stock_counts where operating_day = p_day
  order by created_at desc limit 1;
  v_stock_count_exists := found;
  select stock_variance_warning_pct into v_warning_pct from public.settings where id = true;

  if not v_stock_count_exists then
    v_checks := v_checks || jsonb_build_array(jsonb_build_object(
      'code', 'MISSING_STOCK_COUNT', 'blocking', true, 'overridable', false,
      'message', 'Chưa có kiểm kho cuối ngày'
    ));
  end if;
  if v_pending_expense_count > 0 then
    v_checks := v_checks || jsonb_build_array(jsonb_build_object(
      'code', 'PENDING_EXPENSES', 'blocking', true, 'overridable', false,
      'message', v_pending_expense_count || ' khoản chi đang chờ duyệt'
    ));
  end if;
  if v_unnamed_credit_count > 0 then
    v_checks := v_checks || jsonb_build_array(jsonb_build_object(
      'code', 'UNNAMED_CREDIT_SALES', 'blocking', true, 'overridable', false,
      'message', 'Có giao dịch bán chịu thiếu khách hàng'
    ));
  end if;
  if v_invalid_document_count > 0 then
    v_checks := v_checks || jsonb_build_array(jsonb_build_object(
      'code', 'INVALID_DOCUMENTS', 'blocking', true, 'overridable', false,
      'message', 'Có chứng từ thiếu dữ liệu bắt buộc'
    ));
  end if;
  if v_stock_count_exists and (
    v_stock_variance_pct is null or v_stock_variance_pct > v_warning_pct
  ) then
    v_checks := v_checks || jsonb_build_array(jsonb_build_object(
      'code', 'STOCK_VARIANCE', 'blocking', true, 'overridable', true,
      'message', 'Chênh lệch tồn vượt ngưỡng ' || v_warning_pct || '%'
    ));
  end if;

  return jsonb_build_object(
    'day', p_day,
    'totals', jsonb_build_object(
      'wholesaleRevenueVnd', v_wholesale_vnd,
      'retailRevenueVnd', v_retail_vnd,
      'revenueVnd', v_wholesale_vnd + v_retail_vnd,
      'soldBags', v_sold_bags,
      'collectedVnd', v_collected_vnd,
      'newDebtVnd', v_new_debt_vnd,
      'productionBags', v_production_bags,
      'approvedExpenseVnd', v_approved_expense_vnd,
      'pendingExpenseVnd', v_pending_expense_vnd,
      'stockExpectedBags', v_stock_expected,
      'stockActualBags', v_stock_actual,
      'stockVarianceBags', v_stock_variance,
      'stockVariancePct', v_stock_variance_pct
    ),
    'checks', v_checks,
    'stockWarningPct', v_warning_pct
  );
end;
$$;

update public.operating_days
set snapshot = jsonb_set(snapshot, '{totals,productionBags}', '0'::jsonb, true)
where snapshot is not null;

create view public.daily_dashboard
with (security_invoker = true)
as
select
  od.day,
  od.status,
  coalesce(s.wholesale_revenue_vnd, 0)::bigint as wholesale_revenue_vnd,
  coalesce(s.retail_revenue_vnd, 0)::bigint as retail_revenue_vnd,
  coalesce(s.sold_bags, 0)::bigint as sold_bags,
  coalesce(p.production_bags, 0)::bigint as production_bags,
  coalesce(r.collected_vnd, 0)::bigint as collected_vnd,
  coalesce(d.new_debt_vnd, 0)::bigint as new_debt_vnd,
  coalesce(d.total_debt_vnd, 0)::bigint as total_debt_vnd,
  coalesce(i.opening_stock_bags, 0)::bigint as opening_stock_bags,
  coalesce(i.stock_balance_bags, 0)::bigint as stock_balance_bags,
  sc.expected_bags as stock_expected_bags,
  sc.actual_bags as stock_actual_bags,
  sc.variance_bags as stock_variance_bags,
  sc.variance_pct as stock_variance_pct,
  settings.stock_variance_warning_pct as stock_warning_pct,
  coalesce(e.approved_expense_vnd, 0)::bigint as approved_expense_vnd,
  coalesce(e.pending_expense_vnd, 0)::bigint as pending_expense_vnd,
  coalesce(e.pending_expense_count, 0)::integer as pending_expense_count,
  coalesce(d.overdue_debt_vnd, 0)::bigint as overdue_debt_vnd,
  0::integer as production_mismatch_count,
  coalesce(previous_day.status = 'open', false) as previous_day_unlocked
from public.operating_days od
cross join public.settings settings
left join lateral (
  select
    (select sum(sale.total_vnd) from public.sales sale
      where sale.operating_day = od.day and sale.status = 'active' and sale.kind = 'wholesale') as wholesale_revenue_vnd,
    (select sum(sale.total_vnd) from public.sales sale
      where sale.operating_day = od.day and sale.status = 'active' and sale.kind = 'retail') as retail_revenue_vnd,
    (select sum(lines.quantity_bags) from public.sale_lines lines
      join public.sales sale on sale.id = lines.sale_id
      where sale.operating_day = od.day and sale.status = 'active') as sold_bags
) s on true
left join lateral (
  select sum(harvest.bag_quantity) as production_bags
  from public.machine_harvests as harvest
  join public.machine_runs as run on run.id = harvest.machine_run_id
  join public.production_days as production_day on production_day.id = run.production_day_id
  where production_day.production_date = od.day
) p on true
left join lateral (
  select sum(receipt.amount_vnd) as collected_vnd
  from public.receipts receipt
  where receipt.operating_day = od.day and receipt.status = 'active'
) r on true
left join lateral (
  select
    sum(receivable.original_amount_vnd) filter (where receivable.operating_day = od.day and receivable.status <> 'cancelled') as new_debt_vnd,
    sum(receivable.outstanding_amount_vnd) filter (where receivable.status = 'open') as total_debt_vnd,
    sum(receivable.outstanding_amount_vnd) filter (where receivable.status = 'open' and receivable.due_date < od.day) as overdue_debt_vnd
  from public.receivables receivable
) d on true
left join lateral (
  select
    sum(ledger.quantity_delta_bags) filter (where ledger.operating_day < od.day) as opening_stock_bags,
    sum(ledger.quantity_delta_bags) filter (where ledger.operating_day <= od.day) as stock_balance_bags
  from public.inventory_ledger ledger
) i on true
left join lateral (
  select count.expected_bags, count.actual_bags, count.variance_bags, count.variance_pct
  from public.stock_counts count
  where count.operating_day = od.day
  order by count.created_at desc
  limit 1
) sc on true
left join lateral (
  select
    sum(expense.amount_vnd) filter (where expense.status = 'approved') as approved_expense_vnd,
    sum(expense.amount_vnd) filter (where expense.status = 'pending') as pending_expense_vnd,
    count(*) filter (where expense.status = 'pending') as pending_expense_count
  from public.expenses expense
  where expense.operating_day = od.day
) e on true
left join lateral (
  select earlier.status
  from public.operating_days earlier
  where earlier.day < od.day
  order by earlier.day desc
  limit 1
) previous_day on true;

revoke all on public.daily_dashboard from public, anon, authenticated;
grant select on public.daily_dashboard to authenticated, service_role;

create function public.cancel_document(
  p_entity_type text,
  p_entity_id uuid,
  p_expected_version integer,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_reason text := nullif(trim(p_reason), '');
  v_before jsonb;
  v_after jsonb;
  v_sale public.sales;
  v_receipt public.receipts;
  v_expense public.expenses;
  v_quantity bigint;
  v_original_inventory_id uuid;
begin
  if p_entity_type not in ('sale', 'receipt', 'expense')
    or p_entity_id is null or p_expected_version < 1
    or v_reason is null or length(v_reason) not between 5 and 500 then
    raise exception 'INVALID_CANCELLATION_INPUT' using errcode = '22023';
  end if;

  if p_entity_type = 'sale' then
    select * into v_sale from public.sales where id = p_entity_id for update;
    if not found then raise exception 'INVALID_STATE' using errcode = 'P0001'; end if;
    perform private.require_cancel_permission(v_sale.created_by);
    perform private.require_open_day(v_sale.operating_day);
    if v_sale.status <> 'active' then raise exception 'INVALID_STATE' using errcode = 'P0001'; end if;
    if v_sale.version <> p_expected_version then raise exception 'VERSION_CONFLICT' using errcode = 'PT409'; end if;
    if exists (
      select 1 from public.receivables debt
      join public.receipt_allocations allocation on allocation.receivable_id = debt.id
      join public.receipts receipt on receipt.id = allocation.receipt_id
      where debt.sale_id = v_sale.id and receipt.status = 'active'
        and receipt.source_sale_id is distinct from v_sale.id
    ) then
      raise exception 'INVALID_STATE: cancel or reallocate later receipts first' using errcode = 'P0001';
    end if;
    v_before := to_jsonb(v_sale);
    select id, -quantity_delta_bags into v_original_inventory_id, v_quantity
    from public.inventory_ledger
    where kind = 'sale' and source_type = 'sale' and source_id = v_sale.id;
    if v_quantity > 0 then
      insert into public.inventory_ledger (
        operating_day, kind, quantity_delta_bags, source_type, source_id,
        reversal_of_id, note, created_by
      ) values (
        v_sale.operating_day, 'reversal', v_quantity, 'sale_cancellation',
        v_sale.id, v_original_inventory_id, v_reason, v_actor_id
      );
    end if;
    select * into v_receipt from public.receipts
    where source_sale_id = v_sale.id and status = 'active';
    if found then
      perform private.cancel_receipt_core(v_receipt.id, v_actor_id, v_reason, true);
    end if;
    update public.receivables
    set outstanding_amount_vnd = 0, status = 'cancelled', version = version + 1
    where sale_id = v_sale.id and status <> 'cancelled';
    update public.sales
    set status = 'cancelled', cancelled_at = now(), cancelled_by = v_actor_id,
        cancel_reason = v_reason, version = version + 1
    where id = v_sale.id and version = p_expected_version and status = 'active'
    returning * into v_sale;
    if not found then raise exception 'VERSION_CONFLICT' using errcode = 'PT409'; end if;
    v_after := to_jsonb(v_sale);

  elsif p_entity_type = 'receipt' then
    select * into v_receipt from public.receipts where id = p_entity_id for update;
    if not found then raise exception 'INVALID_STATE' using errcode = 'P0001'; end if;
    perform private.require_cancel_permission(v_receipt.created_by);
    perform private.require_open_day(v_receipt.operating_day);
    if v_receipt.status <> 'active' then raise exception 'INVALID_STATE' using errcode = 'P0001'; end if;
    if v_receipt.version <> p_expected_version then raise exception 'VERSION_CONFLICT' using errcode = 'PT409'; end if;
    v_before := to_jsonb(v_receipt);
    v_receipt := private.cancel_receipt_core(v_receipt.id, v_actor_id, v_reason, false);
    v_after := to_jsonb(v_receipt);

  else
    select * into v_expense from public.expenses where id = p_entity_id for update;
    if not found then raise exception 'INVALID_STATE' using errcode = 'P0001'; end if;
    perform private.require_cancel_permission(v_expense.created_by);
    perform private.require_open_day(v_expense.operating_day);
    if v_expense.status = 'cancelled' then raise exception 'INVALID_STATE' using errcode = 'P0001'; end if;
    if v_expense.version <> p_expected_version then raise exception 'VERSION_CONFLICT' using errcode = 'PT409'; end if;
    v_before := to_jsonb(v_expense);
    update public.expenses
    set status = 'cancelled', cancelled_at = now(), cancelled_by = v_actor_id,
        cancel_reason = v_reason, version = version + 1
    where id = v_expense.id and version = p_expected_version and status <> 'cancelled'
    returning * into v_expense;
    if not found then raise exception 'VERSION_CONFLICT' using errcode = 'PT409'; end if;
    v_after := to_jsonb(v_expense);
  end if;

  perform private.write_audit(
    p_entity_type || '.cancelled', p_entity_type, p_entity_id,
    v_reason, v_before, v_after
  );
  return jsonb_build_object(
    'entityType', p_entity_type,
    'entityId', p_entity_id,
    'version', p_expected_version + 1
  );
end;
$$;

alter function public.cancel_document(text, uuid, integer, text) strict;

create function private.broadcast_production_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.broadcast_changes(
    'production:machines',
    tg_op,
    tg_op,
    tg_table_name,
    tg_table_schema,
    new,
    old
  );
  return null;
end;
$$;

create trigger machine_runs_broadcast_change
after insert or update or delete on public.machine_runs
for each row execute function private.broadcast_production_change();

create trigger machine_harvests_broadcast_change
after insert or update or delete on public.machine_harvests
for each row execute function private.broadcast_production_change();

alter table public.production_days enable row level security;
alter table public.machine_runs enable row level security;
alter table public.machine_harvests enable row level security;
alter table public.machine_harvest_revisions enable row level security;
alter table public.production_action_requests enable row level security;

create policy production_days_read_by_active_user on public.production_days
for select to authenticated
using ((select private.is_active_user()));

create policy machine_runs_read_by_active_user on public.machine_runs
for select to authenticated
using ((select private.is_active_user()));

create policy machine_harvests_read_by_active_user on public.machine_harvests
for select to authenticated
using ((select private.is_active_user()));

create policy machine_harvest_revisions_read_by_manager on public.machine_harvest_revisions
for select to authenticated
using ((select private.is_manager()));

create policy production_action_requests_read_by_manager on public.production_action_requests
for select to authenticated
using ((select private.is_manager()));

drop policy if exists production_active_users_receive_broadcast on realtime.messages;
create policy production_active_users_receive_broadcast
on realtime.messages
for select
to authenticated
using (
  extension = 'broadcast'
  and (select realtime.topic()) = 'production:machines'
  and (select private.is_active_user())
);

revoke all on public.production_days, public.machine_runs, public.machine_harvests,
  public.machine_harvest_revisions, public.production_action_requests
from public, anon, authenticated;

grant select on public.production_days, public.machine_runs, public.machine_harvests to authenticated;
grant select on public.machine_harvest_revisions, public.production_action_requests to authenticated;
grant select, insert, update, delete on public.production_days, public.machine_runs,
  public.machine_harvests, public.machine_harvest_revisions,
  public.production_action_requests to service_role;
grant usage, select on sequence public.machine_harvest_revisions_id_seq to service_role;

revoke all on function private.production_date_at(timestamptz) from public, anon, authenticated, service_role;
revoke all on function private.ensure_open_production_day(date) from public, anon, authenticated, service_role;
revoke all on function private.claim_production_action(uuid, uuid, text, uuid) from public, anon, authenticated, service_role;
revoke all on function private.complete_production_action(uuid, jsonb) from public, anon, authenticated, service_role;
revoke all on function private.validate_machine_timeline(uuid) from public, anon, authenticated, service_role;
revoke all on function private.broadcast_production_change() from public, anon, authenticated, service_role;

revoke all on function public.start_machine(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function public.record_machine_harvest(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function public.stop_machine(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function public.set_harvest_quantity(uuid, bigint, uuid) from public, anon, authenticated, service_role;
revoke all on function public.correct_production_action(jsonb, uuid) from public, anon, authenticated, service_role;
revoke all on function public.lock_production_day(date) from public, anon, authenticated, service_role;
revoke all on function public.reopen_production_day(date) from public, anon, authenticated, service_role;
revoke all on function public.get_production_board(date) from public, anon, authenticated, service_role;
revoke all on function public.get_production_summary(date, date) from public, anon, authenticated, service_role;
revoke all on function public.cancel_document(text, uuid, integer, text) from public, anon, authenticated, service_role;

grant execute on function public.start_machine(uuid, uuid) to authenticated, service_role;
grant execute on function public.record_machine_harvest(uuid, uuid) to authenticated, service_role;
grant execute on function public.stop_machine(uuid, uuid) to authenticated, service_role;
grant execute on function public.set_harvest_quantity(uuid, bigint, uuid) to authenticated, service_role;
grant execute on function public.correct_production_action(jsonb, uuid) to authenticated, service_role;
grant execute on function public.lock_production_day(date) to authenticated, service_role;
grant execute on function public.reopen_production_day(date) to authenticated, service_role;
grant execute on function public.get_production_board(date) to authenticated, service_role;
grant execute on function public.get_production_summary(date, date) to authenticated, service_role;
grant execute on function public.cancel_document(text, uuid, integer, text) to authenticated, service_role;
