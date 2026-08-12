revoke insert, update on public.customers, public.machines from authenticated;

create function public.upsert_customer(
  p_id uuid,
  p_name text,
  p_phone text,
  p_address text,
  p_payment_term_days integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.customers;
  v_after public.customers;
begin
  perform private.require_manager();

  if p_id is null then
    insert into public.customers (
      name, phone, address, payment_term_days, created_by
    ) values (
      trim(p_name), nullif(trim(p_phone), ''), nullif(trim(p_address), ''),
      p_payment_term_days, auth.uid()
    ) returning * into v_after;

    perform private.write_audit(
      'customer.created', 'customer', v_after.id, null, null, to_jsonb(v_after)
    );
  else
    select * into v_before
    from public.customers
    where id = p_id
    for update;

    if not found then
      raise exception 'CUSTOMER_NOT_FOUND' using errcode = 'P0002';
    end if;

    update public.customers
    set name = trim(p_name),
        phone = nullif(trim(p_phone), ''),
        address = nullif(trim(p_address), ''),
        payment_term_days = p_payment_term_days
    where id = p_id
    returning * into v_after;

    perform private.write_audit(
      'customer.updated', 'customer', v_after.id, null,
      to_jsonb(v_before), to_jsonb(v_after)
    );
  end if;

  return v_after.id;
end;
$$;

create function public.set_customer_active(p_id uuid, p_is_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.customers;
  v_after public.customers;
begin
  perform private.require_manager();

  select * into v_before
  from public.customers
  where id = p_id
  for update;

  if not found then
    raise exception 'CUSTOMER_NOT_FOUND' using errcode = 'P0002';
  end if;

  update public.customers
  set is_active = p_is_active
  where id = p_id
  returning * into v_after;

  perform private.write_audit(
    case when p_is_active then 'customer.activated' else 'customer.deactivated' end,
    'customer', p_id, null, to_jsonb(v_before), to_jsonb(v_after)
  );
end;
$$;

create function public.upsert_machine(p_id uuid, p_name text, p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.machines;
  v_after public.machines;
begin
  perform private.require_manager();

  if p_id is null then
    insert into public.machines (name, code, created_by)
    values (trim(p_name), nullif(trim(p_code), ''), auth.uid())
    returning * into v_after;

    perform private.write_audit(
      'machine.created', 'machine', v_after.id, null, null, to_jsonb(v_after)
    );
  else
    select * into v_before
    from public.machines
    where id = p_id
    for update;

    if not found then
      raise exception 'MACHINE_NOT_FOUND' using errcode = 'P0002';
    end if;

    update public.machines
    set name = trim(p_name), code = nullif(trim(p_code), '')
    where id = p_id
    returning * into v_after;

    perform private.write_audit(
      'machine.updated', 'machine', v_after.id, null,
      to_jsonb(v_before), to_jsonb(v_after)
    );
  end if;

  return v_after.id;
end;
$$;

create function public.set_machine_active(p_id uuid, p_is_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.machines;
  v_after public.machines;
begin
  perform private.require_manager();

  select * into v_before
  from public.machines
  where id = p_id
  for update;

  if not found then
    raise exception 'MACHINE_NOT_FOUND' using errcode = 'P0002';
  end if;

  update public.machines
  set is_active = p_is_active
  where id = p_id
  returning * into v_after;

  perform private.write_audit(
    case when p_is_active then 'machine.activated' else 'machine.deactivated' end,
    'machine', p_id, null, to_jsonb(v_before), to_jsonb(v_after)
  );
end;
$$;

revoke all on function public.upsert_customer(uuid, text, text, text, integer) from public, anon, authenticated, service_role;
revoke all on function public.set_customer_active(uuid, boolean) from public, anon, authenticated, service_role;
revoke all on function public.upsert_machine(uuid, text, text) from public, anon, authenticated, service_role;
revoke all on function public.set_machine_active(uuid, boolean) from public, anon, authenticated, service_role;

grant execute on function public.upsert_customer(uuid, text, text, text, integer) to authenticated, service_role;
grant execute on function public.set_customer_active(uuid, boolean) to authenticated, service_role;
grant execute on function public.upsert_machine(uuid, text, text) to authenticated, service_role;
grant execute on function public.set_machine_active(uuid, boolean) to authenticated, service_role;
