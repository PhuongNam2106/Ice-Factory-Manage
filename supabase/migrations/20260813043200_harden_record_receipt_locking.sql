create or replace function public.record_receipt(p_input jsonb, p_idempotency_key uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_claim public.idempotency_keys;
  v_customer_id uuid;
  v_day date;
  v_amount_vnd bigint;
  v_payment_method public.payment_method;
  v_note text;
  v_total_allocated_vnd bigint;
  v_allocation_count integer;
  v_distinct_receivable_count integer;
  v_target_count integer;
  v_allocation record;
  v_receipt public.receipts;
  v_response jsonb;
begin
  if p_input is null or jsonb_typeof(p_input) <> 'object'
    or coalesce(jsonb_typeof(p_input->'allocations'), 'array') <> 'array' then
    raise exception 'INVALID_RECEIPT_INPUT' using errcode = '22023';
  end if;
  if (select private.is_active_user()) is distinct from true then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  begin
    v_customer_id := (p_input->>'customerId')::uuid;
    v_day := (p_input->>'operatingDay')::date;
    v_amount_vnd := (p_input->>'amountVnd')::bigint;
    v_payment_method := (p_input->>'paymentMethod')::public.payment_method;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'INVALID_RECEIPT_INPUT' using errcode = '22023';
  end;
  if v_amount_vnd <= 0 then raise exception 'INVALID_RECEIPT_AMOUNT' using errcode = '22023'; end if;
  v_note := nullif(trim(p_input->>'note'), '');
  if v_note is not null and length(v_note) > 1000 then
    raise exception 'INVALID_NOTE' using errcode = '22023';
  end if;

  perform private.require_open_day(v_day);
  perform customer.id from public.customers as customer
  where customer.id = v_customer_id and customer.is_active for key share;
  if not found then raise exception 'ACTIVE_CUSTOMER_NOT_FOUND' using errcode = 'P0002'; end if;

  v_claim := private.claim_idempotency_key(p_idempotency_key, 'record_receipt', v_actor_id);
  if v_claim.status = 'completed' then return v_claim.response; end if;

  begin
    select count(*), count(distinct (item->>'receivableId')::uuid),
      coalesce(sum((item->>'amountVnd')::bigint), 0)
    into v_allocation_count, v_distinct_receivable_count, v_total_allocated_vnd
    from jsonb_array_elements(coalesce(p_input->'allocations', '[]'::jsonb)) as item;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'INVALID_ALLOCATION_INPUT' using errcode = '22023';
  end;
  if v_allocation_count > 50 or v_allocation_count <> v_distinct_receivable_count then
    raise exception 'DUPLICATE_OR_EXCESS_ALLOCATIONS' using errcode = '22023';
  end if;
  if v_total_allocated_vnd > v_amount_vnd then
    raise exception 'ALLOCATIONS_EXCEED_RECEIPT_AMOUNT' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(coalesce(p_input->'allocations', '[]'::jsonb)) as item
    where (item->>'amountVnd')::bigint <= 0
  ) then raise exception 'INVALID_ALLOCATION_AMOUNT' using errcode = '22023'; end if;

  -- One set-based lock acquires targets in stable UUID order, avoiding A/B versus B/A deadlocks.
  perform receivable.id
  from public.receivables as receivable
  join lateral (
    select (item->>'receivableId')::uuid as receivable_id
    from jsonb_array_elements(coalesce(p_input->'allocations', '[]'::jsonb)) as item
  ) as input on input.receivable_id = receivable.id
  order by receivable.id
  for update of receivable;

  select count(*) into v_target_count
  from public.receivables as receivable
  join lateral (
    select (item->>'receivableId')::uuid as receivable_id,
      (item->>'amountVnd')::bigint as amount_vnd
    from jsonb_array_elements(coalesce(p_input->'allocations', '[]'::jsonb)) as item
  ) as input on input.receivable_id = receivable.id
  where receivable.customer_id = v_customer_id
    and receivable.status = 'open'
    and input.amount_vnd <= receivable.outstanding_amount_vnd;
  if v_target_count <> v_allocation_count then
    raise exception 'INVALID_RECEIVABLE_ALLOCATION' using errcode = '22023';
  end if;

  insert into public.receipts (
    customer_id, operating_day, amount_vnd, payment_method, note, idempotency_key, created_by
  ) values (
    v_customer_id, v_day, v_amount_vnd, v_payment_method, v_note, p_idempotency_key, v_actor_id
  ) returning * into v_receipt;

  for v_allocation in
    select (item->>'receivableId')::uuid as receivable_id,
      (item->>'amountVnd')::bigint as amount_vnd
    from jsonb_array_elements(coalesce(p_input->'allocations', '[]'::jsonb)) as item
    order by (item->>'receivableId')::uuid
  loop
    update public.receivables
    set outstanding_amount_vnd = outstanding_amount_vnd - v_allocation.amount_vnd,
      status = case when outstanding_amount_vnd = v_allocation.amount_vnd then 'paid' else 'open' end,
      version = version + 1
    where id = v_allocation.receivable_id;
    insert into public.receipt_allocations (receipt_id, receivable_id, amount_vnd)
    values (v_receipt.id, v_allocation.receivable_id, v_allocation.amount_vnd);
  end loop;

  perform private.write_audit(
    'receipt.created', 'receipt', v_receipt.id, null, null,
    jsonb_build_object('receipt', to_jsonb(v_receipt), 'totalAllocatedVnd', v_total_allocated_vnd,
      'unallocatedVnd', v_amount_vnd - v_total_allocated_vnd)
  );
  v_response := jsonb_build_object('receiptId', v_receipt.id);
  update public.idempotency_keys set status = 'completed', entity_id = v_receipt.id,
    response = v_response, completed_at = now()
  where key = p_idempotency_key and actor_id = v_actor_id and operation = 'record_receipt';
  if not found then raise exception 'IDEMPOTENCY_COMPLETION_FAILED' using errcode = 'P0001'; end if;
  return v_response;
end;
$$;

revoke all on function public.record_receipt(jsonb, uuid) from public, anon, authenticated, service_role;
grant execute on function public.record_receipt(jsonb, uuid) to authenticated, service_role;
