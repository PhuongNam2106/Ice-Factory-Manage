create function public.record_receipt(p_input jsonb, p_idempotency_key uuid)
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
  v_alloc jsonb;
  v_alloc_receivable_id uuid;
  v_alloc_amount_vnd bigint;
  v_total_allocated_vnd bigint := 0;
  v_rec_outstanding_vnd bigint;
  v_rec_status text;
  v_new_outstanding_vnd bigint;
  v_new_status text;
  v_receipt public.receipts;
  v_response jsonb;
begin
  if p_input is null or jsonb_typeof(p_input) <> 'object' then
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
  exception
    when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'INVALID_RECEIPT_INPUT' using errcode = '22023';
  end;

  if v_amount_vnd <= 0 then
    raise exception 'INVALID_RECEIPT_AMOUNT' using errcode = '22023';
  end if;

  v_note := nullif(trim(p_input->>'note'), '');
  if v_note is not null and length(v_note) > 1000 then
    raise exception 'INVALID_NOTE' using errcode = '22023';
  end if;

  perform private.require_open_day(v_day);
  v_claim := private.claim_idempotency_key(p_idempotency_key, 'record_receipt', v_actor_id);

  if v_claim.status = 'completed' then
    return v_claim.response;
  end if;

  select customer.id
  into v_customer_id
  from public.customers as customer
  where customer.id = v_customer_id and customer.is_active
  for key share;

  if not found then
    raise exception 'ACTIVE_CUSTOMER_NOT_FOUND' using errcode = 'P0002';
  end if;

  if jsonb_typeof(p_input->'allocations') = 'array' then
    if jsonb_array_length(p_input->'allocations') > 50 then
      raise exception 'INVALID_ALLOCATIONS_COUNT' using errcode = '22023';
    end if;

    for v_alloc in select value from jsonb_array_elements(p_input->'allocations')
    loop
      begin
        v_alloc_amount_vnd := (v_alloc->>'amountVnd')::bigint;
      exception
        when invalid_text_representation or numeric_value_out_of_range then
          raise exception 'INVALID_ALLOCATION_AMOUNT' using errcode = '22023';
      end;

      if v_alloc_amount_vnd <= 0 then
        raise exception 'INVALID_ALLOCATION_AMOUNT' using errcode = '22023';
      end if;

      begin
        v_total_allocated_vnd := v_total_allocated_vnd + v_alloc_amount_vnd;
      exception when numeric_value_out_of_range then
        raise exception 'ALLOCATION_TOTAL_OUT_OF_RANGE' using errcode = '22003';
      end;
    end loop;
  end if;

  if v_total_allocated_vnd > v_amount_vnd then
    raise exception 'ALLOCATIONS_EXCEED_RECEIPT_AMOUNT' using errcode = '22023';
  end if;

  insert into public.receipts (
    customer_id, operating_day, source_sale_id, amount_vnd,
    payment_method, note, idempotency_key, created_by
  ) values (
    v_customer_id, v_day, null, v_amount_vnd,
    v_payment_method, v_note, p_idempotency_key, v_actor_id
  ) returning * into v_receipt;

  if jsonb_typeof(p_input->'allocations') = 'array' then
    for v_alloc in select value from jsonb_array_elements(p_input->'allocations')
    loop
      v_alloc_receivable_id := (v_alloc->>'receivableId')::uuid;
      v_alloc_amount_vnd := (v_alloc->>'amountVnd')::bigint;

      select receivable.outstanding_amount_vnd, receivable.status
      into v_rec_outstanding_vnd, v_rec_status
      from public.receivables as receivable
      where receivable.id = v_alloc_receivable_id
        and receivable.customer_id = v_customer_id
        and receivable.status = 'open'
      for update;

      if not found then
        raise exception 'OPEN_RECEIVABLE_NOT_FOUND' using errcode = 'P0002';
      end if;

      if v_alloc_amount_vnd > v_rec_outstanding_vnd then
        raise exception 'ALLOCATION_EXCEEDS_OUTSTANDING' using errcode = '22023';
      end if;

      v_new_outstanding_vnd := v_rec_outstanding_vnd - v_alloc_amount_vnd;
      v_new_status := case when v_new_outstanding_vnd = 0 then 'paid' else 'open' end;

      update public.receivables
      set outstanding_amount_vnd = v_new_outstanding_vnd,
          status = v_new_status,
          updated_at = now()
      where id = v_alloc_receivable_id;

      insert into public.receipt_allocations (
        receipt_id, receivable_id, amount_vnd
      ) values (
        v_receipt.id, v_alloc_receivable_id, v_alloc_amount_vnd
      );
    end loop;
  end if;

  perform private.write_audit(
    'receipt.created',
    'receipt',
    v_receipt.id,
    null,
    null,
    jsonb_build_object(
      'receipt', to_jsonb(v_receipt),
      'totalAllocatedVnd', v_total_allocated_vnd,
      'unallocatedVnd', v_amount_vnd - v_total_allocated_vnd
    )
  );

  v_response := jsonb_build_object('receiptId', v_receipt.id);

  update public.idempotency_keys
  set status = 'completed',
      entity_id = v_receipt.id,
      response = v_response,
      completed_at = now()
  where key = p_idempotency_key
    and actor_id = v_actor_id
    and operation = 'record_receipt';

  if not found then
    raise exception 'IDEMPOTENCY_COMPLETION_FAILED' using errcode = 'P0001';
  end if;

  return v_response;
end;
$$;

revoke all on function public.record_receipt(jsonb, uuid) from public, anon, authenticated, service_role;
grant execute on function public.record_receipt(jsonb, uuid) to authenticated, service_role;
