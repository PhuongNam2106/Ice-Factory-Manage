create function private.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = ''
as $$
  select p
  from public.profiles as p
  where p.id = (select auth.uid())
$$;

create function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as p
    where p.id = (select auth.uid())
      and p.is_active
  )
$$;

create function private.is_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as p
    where p.id = (select auth.uid())
      and p.is_active
      and p.role = 'manager'
  )
$$;

create function private.require_manager()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_manager()) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
end;
$$;

create function private.require_open_day(p_day date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.operating_day_status;
begin
  select od.status into v_status
  from public.operating_days as od
  where od.day = p_day;

  if v_status is null then
    raise exception 'OPERATING_DAY_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_status <> 'open' then
    raise exception 'DAY_LOCKED' using errcode = 'P0001';
  end if;
end;
$$;

create function private.write_audit(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_reason text,
  p_before jsonb,
  p_after jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_audit_id uuid;
begin
  if v_actor_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  if not (select private.is_active_user()) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  insert into public.audit_log (
    actor_id, action, entity_type, entity_id, reason, before_data, after_data
  )
  values (
    v_actor_id, p_action, p_entity_type, p_entity_id, nullif(trim(p_reason), ''), p_before, p_after
  )
  returning id into v_audit_id;

  return v_audit_id;
end;
$$;

create function private.reject_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_log is append-only' using errcode = '55000';
end;
$$;

create trigger audit_log_reject_update
before update on public.audit_log
for each statement execute function private.reject_audit_mutation();

create trigger audit_log_reject_delete
before delete on public.audit_log
for each statement execute function private.reject_audit_mutation();

revoke all on function private.current_profile() from public;
revoke all on function private.is_active_user() from public;
revoke all on function private.is_manager() from public;
revoke all on function private.require_manager() from public;
revoke all on function private.require_open_day(date) from public;
revoke all on function private.write_audit(text, text, uuid, text, jsonb, jsonb) from public;
revoke all on function private.reject_audit_mutation() from public;
grant execute on function private.is_active_user() to authenticated;
grant execute on function private.is_manager() to authenticated;

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.machines enable row level security;
alter table public.operating_days enable row level security;
alter table public.settings enable row level security;
alter table public.audit_log enable row level security;
alter table public.idempotency_keys enable row level security;

create policy profiles_read_self_or_manager on public.profiles
for select to authenticated
using (
  (select private.is_active_user())
  and (id = (select auth.uid()) or (select private.is_manager()))
);

create policy profiles_manage_by_manager on public.profiles
for all to authenticated
using (
  (select private.is_manager())
)
with check (
  (select private.is_manager())
);

create policy customers_read_by_active_user on public.customers
for select to authenticated
using ((select private.is_active_user()));

create policy customers_manage_by_manager on public.customers
for all to authenticated
using ((select private.is_manager()))
with check ((select private.is_manager()));

create policy machines_read_by_active_user on public.machines
for select to authenticated
using ((select private.is_active_user()));

create policy machines_manage_by_manager on public.machines
for all to authenticated
using ((select private.is_manager()))
with check ((select private.is_manager()));

create policy operating_days_read_by_active_user on public.operating_days
for select to authenticated
using ((select private.is_active_user()));

create policy operating_days_create_open_by_active_user on public.operating_days
for insert to authenticated
with check (
  (select private.is_active_user())
  and status = 'open'
  and locked_at is null
  and locked_by is null
  and reopened_at is null
  and reopened_by is null
  and reopen_reason is null
  and snapshot is null
);

create policy operating_days_manage_by_manager on public.operating_days
for update to authenticated
using ((select private.is_manager()))
with check ((select private.is_manager()));

create policy settings_read_by_active_user on public.settings
for select to authenticated
using ((select private.is_active_user()));

create policy settings_manage_by_manager on public.settings
for update to authenticated
using ((select private.is_manager()))
with check ((select private.is_manager()));

create policy audit_log_read_by_manager on public.audit_log
for select to authenticated
using ((select private.is_manager()));

create policy idempotency_keys_read_by_manager on public.idempotency_keys
for select to authenticated
using ((select private.is_manager()));

grant select on public.profiles, public.customers, public.machines, public.operating_days, public.settings, public.audit_log, public.idempotency_keys to authenticated;
grant insert on public.operating_days to authenticated;
grant update on public.profiles, public.customers, public.machines, public.operating_days, public.settings to authenticated;
grant insert on public.profiles, public.customers, public.machines to authenticated;

grant select, insert, update on public.profiles, public.customers, public.machines, public.operating_days, public.settings, public.audit_log, public.idempotency_keys to service_role;
grant delete on public.audit_log to service_role;
