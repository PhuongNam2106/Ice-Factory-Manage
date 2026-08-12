alter table public.idempotency_keys
  add column status text not null default 'processing'
    check (status in ('processing', 'completed')),
  add column entity_id uuid,
  add constraint idempotency_keys_completion_check check (
    (status = 'processing' and completed_at is null)
    or (status = 'completed' and completed_at is not null and response is not null)
  );

create or replace function private.claim_idempotency_key(
  p_key uuid,
  p_operation text,
  p_actor uuid
)
returns public.idempotency_keys
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claim public.idempotency_keys;
begin
  if p_actor is null or p_actor is distinct from auth.uid() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if (select private.is_active_user()) is distinct from true then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if nullif(trim(p_operation), '') is null then
    raise exception 'INVALID_OPERATION' using errcode = '22023';
  end if;

  insert into public.idempotency_keys (key, operation, actor_id, status)
  values (p_key, trim(p_operation), p_actor, 'processing')
  on conflict (key) do nothing
  returning * into v_claim;

  if v_claim.key is null then
    select existing.* into v_claim
    from public.idempotency_keys as existing
    where existing.key = p_key;

    if v_claim.operation <> trim(p_operation) or v_claim.actor_id <> p_actor then
      raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode = '22023';
    end if;
  end if;

  return v_claim;
end;
$$;

revoke all on function private.claim_idempotency_key(uuid, text, uuid) from public;
