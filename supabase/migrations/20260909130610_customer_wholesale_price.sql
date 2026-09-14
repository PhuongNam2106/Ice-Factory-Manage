alter table public.customers
  add column wholesale_unit_price_vnd bigint,
  add constraint customers_wholesale_unit_price_vnd_valid
    check (
      wholesale_unit_price_vnd is null
      or wholesale_unit_price_vnd between 1 and 100000000000000
    );

comment on column public.customers.wholesale_unit_price_vnd is
  'Default wholesale price per bag in whole VND. Null only for customers created before this migration.';

drop function public.upsert_customer(uuid, text, text, text, integer);

create function public.upsert_customer(
  p_id uuid,
  p_name text,
  p_phone text,
  p_address text,
  p_payment_term_days integer,
  p_wholesale_unit_price_vnd bigint
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

  if p_wholesale_unit_price_vnd is null
    or p_wholesale_unit_price_vnd < 1
    or p_wholesale_unit_price_vnd > 100000000000000 then
    raise exception 'INVALID_WHOLESALE_PRICE' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.customers (
      name,
      phone,
      address,
      payment_term_days,
      wholesale_unit_price_vnd,
      created_by
    ) values (
      trim(p_name),
      nullif(trim(p_phone), ''),
      nullif(trim(p_address), ''),
      p_payment_term_days,
      p_wholesale_unit_price_vnd,
      auth.uid()
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
        payment_term_days = p_payment_term_days,
        wholesale_unit_price_vnd = p_wholesale_unit_price_vnd
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

revoke all on function public.upsert_customer(uuid, text, text, text, integer, bigint)
  from public, anon, authenticated, service_role;
grant execute on function public.upsert_customer(uuid, text, text, text, integer, bigint)
  to authenticated, service_role;

create or replace function public.create_sale(p_input jsonb, p_idempotency_key uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_claim public.idempotency_keys;
  v_kind public.sale_kind;
  v_day date;
  v_current_day date;
  v_occurred_at timestamptz;
  v_customer_id uuid;
  v_shift_code text;
  v_paid_now_vnd bigint;
  v_payment_method public.payment_method;
  v_note text;
  v_line jsonb;
  v_line_number integer := 0;
  v_quantity_bags bigint;
  v_unit_price_vnd bigint;
  v_customer_price_vnd bigint;
  v_historical_unit_price_vnd bigint;
  v_total_quantity_bags bigint := 0;
  v_total_vnd bigint := 0;
  v_customer_payment_term integer;
  v_used_historical_price boolean := false;
  v_sale public.sales;
  v_receivable_id uuid;
  v_receipt_id uuid;
  v_response jsonb;
begin
  if p_input is null or jsonb_typeof(p_input) <> 'object' then
    raise exception 'INVALID_SALE_INPUT' using errcode = '22023';
  end if;
  if (select private.is_active_user()) is distinct from true then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  begin
    v_kind := (p_input->>'kind')::public.sale_kind;
    v_occurred_at := coalesce(
      nullif(p_input->>'occurredAt', '')::timestamptz,
      statement_timestamp()
    );
    v_paid_now_vnd := (p_input->>'paidNowVnd')::bigint;
    v_payment_method := (p_input->>'paymentMethod')::public.payment_method;
  exception
    when invalid_text_representation or numeric_value_out_of_range
      or invalid_datetime_format or datetime_field_overflow then
      raise exception 'INVALID_SALE_INPUT' using errcode = '22023';
  end;

  perform private.require_occurrence_after_cutover(v_occurred_at);
  v_day := private.operating_day_at(v_occurred_at);
  v_current_day := private.operating_day_at(statement_timestamp());
  v_note := nullif(trim(p_input->>'note'), '');
  if v_note is not null and length(v_note) > 1000 then
    raise exception 'INVALID_NOTE' using errcode = '22023';
  end if;
  if v_paid_now_vnd < 0 then
    raise exception 'INVALID_PAID_AMOUNT' using errcode = '22023';
  end if;

  if v_kind = 'wholesale' then
    v_shift_code := null;
    begin
      v_customer_id := nullif(p_input->>'customerId', '')::uuid;
      v_quantity_bags := (p_input->>'quantityBags')::bigint;
      v_historical_unit_price_vnd :=
        nullif(p_input->>'historicalUnitPriceVnd', '')::bigint;
    exception
      when invalid_text_representation or numeric_value_out_of_range then
        raise exception 'INVALID_WHOLESALE_INPUT' using errcode = '22023';
    end;

    if v_customer_id is null then
      raise exception 'WHOLESALE_CUSTOMER_REQUIRED' using errcode = '22023';
    end if;
    if v_quantity_bags is null
      or v_quantity_bags < 1
      or v_quantity_bags > 10000000 then
      raise exception 'INVALID_WHOLESALE_QUANTITY' using errcode = '22023';
    end if;
  else
    v_customer_id := null;
    v_shift_code := upper(nullif(trim(p_input->>'shiftCode'), ''));
    if v_shift_code is null or length(v_shift_code) > 30 then
      raise exception 'INVALID_SHIFT' using errcode = '22023';
    end if;
    if jsonb_typeof(p_input->'lines') <> 'array'
      or jsonb_array_length(p_input->'lines') < 1
      or jsonb_array_length(p_input->'lines') > 50 then
      raise exception 'INVALID_SALE_LINES' using errcode = '22023';
    end if;
  end if;

  perform private.ensure_open_operating_day(v_day);
  v_claim := private.claim_idempotency_key(
    p_idempotency_key, 'create_sale', v_actor_id
  );
  if v_claim.status = 'completed' then
    return v_claim.response;
  end if;

  if v_kind = 'wholesale' then
    select customer.payment_term_days, customer.wholesale_unit_price_vnd
    into v_customer_payment_term, v_customer_price_vnd
    from public.customers as customer
    where customer.id = v_customer_id
      and customer.is_active
    for update;

    if not found then
      raise exception 'ACTIVE_CUSTOMER_NOT_FOUND' using errcode = 'P0002';
    end if;

    if v_day < v_current_day then
      if v_historical_unit_price_vnd is null then
        raise exception 'HISTORICAL_WHOLESALE_PRICE_REQUIRED' using errcode = '22023';
      end if;
      if (select private.is_manager()) is distinct from true then
        raise exception 'HISTORICAL_WHOLESALE_PRICE_FORBIDDEN' using errcode = '42501';
      end if;
      if v_historical_unit_price_vnd < 1
        or v_historical_unit_price_vnd > 100000000000000 then
        raise exception 'INVALID_WHOLESALE_PRICE' using errcode = '22023';
      end if;
      v_unit_price_vnd := v_historical_unit_price_vnd;
      v_used_historical_price := true;
    else
      if v_historical_unit_price_vnd is not null then
        raise exception 'HISTORICAL_WHOLESALE_PRICE_NOT_ALLOWED' using errcode = '22023';
      end if;
      if v_customer_price_vnd is null then
        raise exception 'CUSTOMER_WHOLESALE_PRICE_MISSING' using errcode = '22023';
      end if;
      v_unit_price_vnd := v_customer_price_vnd;
    end if;

    begin
      v_total_quantity_bags := v_quantity_bags;
      v_total_vnd := v_quantity_bags * v_unit_price_vnd;
    exception when numeric_value_out_of_range then
      raise exception 'SALE_TOTAL_OUT_OF_RANGE' using errcode = '22003';
    end;
  else
    for v_line in select value from jsonb_array_elements(p_input->'lines')
    loop
      v_line_number := v_line_number + 1;
      begin
        v_quantity_bags := (v_line->>'quantityBags')::bigint;
        v_unit_price_vnd := (v_line->>'unitPriceVnd')::bigint;
      exception when invalid_text_representation or numeric_value_out_of_range then
        raise exception 'INVALID_SALE_LINE' using errcode = '22023';
      end;
      if v_quantity_bags <= 0 or v_quantity_bags > 10000000
        or v_unit_price_vnd <= 0 or v_unit_price_vnd > 100000000000000 then
        raise exception 'INVALID_SALE_LINE' using errcode = '22023';
      end if;
      begin
        v_total_quantity_bags := v_total_quantity_bags + v_quantity_bags;
        v_total_vnd := v_total_vnd + (v_quantity_bags * v_unit_price_vnd);
      exception when numeric_value_out_of_range then
        raise exception 'SALE_TOTAL_OUT_OF_RANGE' using errcode = '22003';
      end;
    end loop;
  end if;

  if v_paid_now_vnd > v_total_vnd then
    raise exception 'PAID_AMOUNT_EXCEEDS_TOTAL' using errcode = '22023';
  end if;
  if v_kind = 'retail' and v_paid_now_vnd <> v_total_vnd then
    raise exception 'RETAIL_MUST_BE_FULLY_PAID' using errcode = '22023';
  end if;

  insert into public.sales (
    kind,
    operating_day,
    occurred_at,
    customer_id,
    shift_code,
    total_vnd,
    paid_now_vnd,
    payment_method,
    note,
    idempotency_key,
    created_by
  ) values (
    v_kind,
    v_day,
    v_occurred_at,
    v_customer_id,
    v_shift_code,
    v_total_vnd,
    v_paid_now_vnd,
    v_payment_method,
    v_note,
    p_idempotency_key,
    v_actor_id
  ) returning * into v_sale;

  if v_kind = 'wholesale' then
    insert into public.sale_lines (
      sale_id, line_number, quantity_bags, unit_price_vnd
    ) values (
      v_sale.id, 1, v_total_quantity_bags, v_unit_price_vnd
    );
  else
    v_line_number := 0;
    for v_line in select value from jsonb_array_elements(p_input->'lines')
    loop
      v_line_number := v_line_number + 1;
      insert into public.sale_lines (
        sale_id, line_number, quantity_bags, unit_price_vnd
      ) values (
        v_sale.id,
        v_line_number,
        (v_line->>'quantityBags')::bigint,
        (v_line->>'unitPriceVnd')::bigint
      );
    end loop;
  end if;

  if v_paid_now_vnd < v_total_vnd then
    insert into public.receivables (
      sale_id,
      customer_id,
      operating_day,
      original_amount_vnd,
      outstanding_amount_vnd,
      due_date,
      status
    ) values (
      v_sale.id,
      v_customer_id,
      v_day,
      v_total_vnd,
      v_total_vnd - v_paid_now_vnd,
      v_day + v_customer_payment_term,
      'open'
    ) returning id into v_receivable_id;
  end if;

  if v_paid_now_vnd > 0 then
    insert into public.receipts (
      customer_id,
      operating_day,
      occurred_at,
      source_sale_id,
      amount_vnd,
      payment_method,
      note,
      created_by
    ) values (
      v_customer_id,
      v_day,
      v_occurred_at,
      v_sale.id,
      v_paid_now_vnd,
      v_payment_method,
      'Thu khi bán hàng',
      v_actor_id
    ) returning id into v_receipt_id;

    if v_receivable_id is not null then
      insert into public.receipt_allocations (
        receipt_id, receivable_id, amount_vnd
      ) values (
        v_receipt_id, v_receivable_id, v_paid_now_vnd
      );
    end if;
  end if;

  perform private.write_audit(
    'sale.created', 'sale', v_sale.id, null, null,
    jsonb_build_object(
      'sale', to_jsonb(v_sale),
      'totalQuantityBags', v_total_quantity_bags,
      'unitPriceVnd', case
        when v_kind = 'wholesale' then v_unit_price_vnd
        else null
      end,
      'pricingSource', case
        when v_kind = 'retail' then 'manual_retail'
        when v_used_historical_price then 'historical_override'
        else 'customer_default'
      end,
      'receivableId', v_receivable_id,
      'receiptId', v_receipt_id
    )
  );

  v_response := jsonb_build_object(
    'saleId', v_sale.id,
    'kind', v_kind,
    'unitPriceVnd', case
      when v_kind = 'wholesale' then v_unit_price_vnd
      else null
    end,
    'totalVnd', v_total_vnd,
    'usedHistoricalPrice', v_used_historical_price
  );
  update public.idempotency_keys
  set status = 'completed',
      entity_id = v_sale.id,
      response = v_response,
      completed_at = now()
  where key = p_idempotency_key
    and actor_id = v_actor_id
    and operation = 'create_sale';
  if not found then
    raise exception 'IDEMPOTENCY_COMPLETION_FAILED' using errcode = 'P0001';
  end if;
  return v_response;
end;
$$;

revoke all on function public.create_sale(jsonb, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.create_sale(jsonb, uuid)
  to authenticated, service_role;
