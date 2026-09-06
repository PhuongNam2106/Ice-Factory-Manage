alter table public.settings
  add column operating_day_cutover_at timestamptz,
  add column loss_warning_pct numeric(5,2) not null default 5
    check (loss_warning_pct between 0 and 100);

alter table public.sales add column occurred_at timestamptz;
update public.sales set occurred_at = created_at where occurred_at is null;
alter table public.sales alter column occurred_at set not null;

alter table public.receipts add column occurred_at timestamptz;
update public.receipts set occurred_at = created_at where occurred_at is null;
alter table public.receipts alter column occurred_at set not null;

alter table public.expenses add column occurred_at timestamptz;
update public.expenses set occurred_at = created_at where occurred_at is null;
alter table public.expenses alter column occurred_at set not null;

create index sales_operating_day_occurred_at_idx
  on public.sales (operating_day, occurred_at desc);
create index receipts_operating_day_occurred_at_idx
  on public.receipts (operating_day, occurred_at desc);
create index expenses_operating_day_occurred_at_idx
  on public.expenses (operating_day, occurred_at desc);

update public.production_days
set starts_at = (production_date::timestamp + time '20:00') at time zone 'Asia/Bangkok',
    ends_at = ((production_date + 1)::timestamp + time '20:00') at time zone 'Asia/Bangkok';

create or replace function private.operating_day_at(p_at timestamptz)
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

create function private.require_occurrence_after_cutover(p_at timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cutover timestamptz;
begin
  select setting.operating_day_cutover_at
  into v_cutover
  from public.settings as setting
  where setting.id = true;

  if v_cutover is null then
    raise exception 'CUTOVER_NOT_CONFIGURED' using errcode = '55000';
  end if;
  if p_at < v_cutover then
    raise exception 'OCCURRED_AT_BEFORE_CUTOVER' using errcode = '22023';
  end if;
end;
$$;

create function private.ensure_open_operating_day(p_day date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_day is null then
    raise exception 'INVALID_OPERATING_DAY' using errcode = '22023';
  end if;

  insert into public.operating_days (day)
  values (p_day)
  on conflict (day) do nothing;

  perform private.require_open_day(p_day);
end;
$$;

create or replace function private.production_date_at(p_at timestamptz)
returns date
language sql
immutable
set search_path = ''
as $$
  select private.operating_day_at(p_at)
$$;

create or replace function private.ensure_open_production_day(p_production_date date)
returns public.production_days
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day public.production_days;
begin
  perform private.ensure_open_operating_day(p_production_date);
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('production_day:' || p_production_date::text, 0)
  );

  insert into public.production_days (production_date, starts_at, ends_at)
  values (
    p_production_date,
    (p_production_date::timestamp + time '20:00') at time zone 'Asia/Bangkok',
    ((p_production_date + 1)::timestamp + time '20:00') at time zone 'Asia/Bangkok'
  )
  on conflict (production_date) do update
  set starts_at = excluded.starts_at,
      ends_at = excluded.ends_at
  where public.production_days.status = 'open';

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

revoke all on function private.operating_day_at(timestamptz) from public, anon, authenticated, service_role;
revoke all on function private.require_occurrence_after_cutover(timestamptz) from public, anon, authenticated, service_role;
revoke all on function private.ensure_open_operating_day(date) from public, anon, authenticated, service_role;
revoke all on function private.production_date_at(timestamptz) from public, anon, authenticated, service_role;
revoke all on function private.ensure_open_production_day(date) from public, anon, authenticated, service_role;

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
  v_total_quantity_bags bigint := 0;
  v_total_vnd bigint := 0;
  v_customer_payment_term integer;
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
    v_occurred_at := coalesce(nullif(p_input->>'occurredAt', '')::timestamptz, statement_timestamp());
    v_paid_now_vnd := (p_input->>'paidNowVnd')::bigint;
    v_payment_method := (p_input->>'paymentMethod')::public.payment_method;
  exception
    when invalid_text_representation or numeric_value_out_of_range
      or invalid_datetime_format or datetime_field_overflow then
      raise exception 'INVALID_SALE_INPUT' using errcode = '22023';
  end;

  perform private.require_occurrence_after_cutover(v_occurred_at);
  v_day := private.operating_day_at(v_occurred_at);
  v_note := nullif(trim(p_input->>'note'), '');
  if v_note is not null and length(v_note) > 1000 then
    raise exception 'INVALID_NOTE' using errcode = '22023';
  end if;
  if jsonb_typeof(p_input->'lines') <> 'array'
    or jsonb_array_length(p_input->'lines') < 1
    or jsonb_array_length(p_input->'lines') > 50 then
    raise exception 'INVALID_SALE_LINES' using errcode = '22023';
  end if;
  if v_paid_now_vnd < 0 then
    raise exception 'INVALID_PAID_AMOUNT' using errcode = '22023';
  end if;

  if v_kind = 'wholesale' then
    v_shift_code := null;
    begin
      v_customer_id := nullif(p_input->>'customerId', '')::uuid;
    exception when invalid_text_representation then
      raise exception 'INVALID_CUSTOMER' using errcode = '22023';
    end;
  else
    v_customer_id := null;
    v_shift_code := upper(nullif(trim(p_input->>'shiftCode'), ''));
    if v_shift_code is null or length(v_shift_code) > 30 then
      raise exception 'INVALID_SHIFT' using errcode = '22023';
    end if;
  end if;

  perform private.ensure_open_operating_day(v_day);
  v_claim := private.claim_idempotency_key(p_idempotency_key, 'create_sale', v_actor_id);
  if v_claim.status = 'completed' then return v_claim.response; end if;

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

  if v_paid_now_vnd > v_total_vnd then
    raise exception 'PAID_AMOUNT_EXCEEDS_TOTAL' using errcode = '22023';
  end if;
  if v_customer_id is not null then
    select customer.payment_term_days
    into v_customer_payment_term
    from public.customers as customer
    where customer.id = v_customer_id and customer.is_active
    for key share;
    if not found then
      raise exception 'ACTIVE_CUSTOMER_NOT_FOUND' using errcode = 'P0002';
    end if;
  elsif v_kind = 'wholesale' and v_paid_now_vnd < v_total_vnd then
    raise exception 'CUSTOMER_REQUIRED_FOR_CREDIT' using errcode = '22023';
  elsif v_kind = 'retail' and v_paid_now_vnd <> v_total_vnd then
    raise exception 'RETAIL_MUST_BE_FULLY_PAID' using errcode = '22023';
  end if;

  insert into public.sales (
    kind, operating_day, occurred_at, customer_id, shift_code, total_vnd, paid_now_vnd,
    payment_method, note, idempotency_key, created_by
  ) values (
    v_kind, v_day, v_occurred_at, v_customer_id, v_shift_code, v_total_vnd, v_paid_now_vnd,
    v_payment_method, v_note, p_idempotency_key, v_actor_id
  ) returning * into v_sale;

  v_line_number := 0;
  for v_line in select value from jsonb_array_elements(p_input->'lines')
  loop
    v_line_number := v_line_number + 1;
    insert into public.sale_lines (sale_id, line_number, quantity_bags, unit_price_vnd)
    values (
      v_sale.id,
      v_line_number,
      (v_line->>'quantityBags')::bigint,
      (v_line->>'unitPriceVnd')::bigint
    );
  end loop;

  if v_paid_now_vnd < v_total_vnd then
    insert into public.receivables (
      sale_id, customer_id, operating_day, original_amount_vnd,
      outstanding_amount_vnd, due_date, status
    ) values (
      v_sale.id, v_customer_id, v_day, v_total_vnd,
      v_total_vnd - v_paid_now_vnd, v_day + v_customer_payment_term, 'open'
    ) returning id into v_receivable_id;
  end if;

  if v_paid_now_vnd > 0 then
    insert into public.receipts (
      customer_id, operating_day, occurred_at, source_sale_id, amount_vnd,
      payment_method, note, created_by
    ) values (
      v_customer_id, v_day, v_occurred_at, v_sale.id, v_paid_now_vnd,
      v_payment_method, 'Thu khi bán hàng', v_actor_id
    ) returning id into v_receipt_id;

    if v_receivable_id is not null then
      insert into public.receipt_allocations (receipt_id, receivable_id, amount_vnd)
      values (v_receipt_id, v_receivable_id, v_paid_now_vnd);
    end if;
  end if;

  perform private.write_audit(
    'sale.created', 'sale', v_sale.id, null, null,
    jsonb_build_object(
      'sale', to_jsonb(v_sale),
      'totalQuantityBags', v_total_quantity_bags,
      'receivableId', v_receivable_id,
      'receiptId', v_receipt_id
    )
  );

  v_response := jsonb_build_object('saleId', v_sale.id);
  update public.idempotency_keys
  set status = 'completed', entity_id = v_sale.id, response = v_response, completed_at = now()
  where key = p_idempotency_key and actor_id = v_actor_id and operation = 'create_sale';
  if not found then
    raise exception 'IDEMPOTENCY_COMPLETION_FAILED' using errcode = 'P0001';
  end if;
  return v_response;
end;
$$;

revoke all on function public.create_sale(jsonb, uuid) from public, anon, authenticated, service_role;
grant execute on function public.create_sale(jsonb, uuid) to authenticated, service_role;

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
  v_occurred_at timestamptz;
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
    v_occurred_at := coalesce(nullif(p_input->>'occurredAt', '')::timestamptz, statement_timestamp());
    v_amount_vnd := (p_input->>'amountVnd')::bigint;
    v_payment_method := (p_input->>'paymentMethod')::public.payment_method;
  exception
    when invalid_text_representation or numeric_value_out_of_range
      or invalid_datetime_format or datetime_field_overflow then
      raise exception 'INVALID_RECEIPT_INPUT' using errcode = '22023';
  end;

  perform private.require_occurrence_after_cutover(v_occurred_at);
  v_day := private.operating_day_at(v_occurred_at);
  if v_amount_vnd <= 0 then
    raise exception 'INVALID_RECEIPT_AMOUNT' using errcode = '22023';
  end if;
  v_note := nullif(trim(p_input->>'note'), '');
  if v_note is not null and length(v_note) > 1000 then
    raise exception 'INVALID_NOTE' using errcode = '22023';
  end if;

  perform private.ensure_open_operating_day(v_day);
  perform customer.id from public.customers as customer
  where customer.id = v_customer_id and customer.is_active for key share;
  if not found then
    raise exception 'ACTIVE_CUSTOMER_NOT_FOUND' using errcode = 'P0002';
  end if;

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
  ) then
    raise exception 'INVALID_ALLOCATION_AMOUNT' using errcode = '22023';
  end if;

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
    customer_id, operating_day, occurred_at, amount_vnd, payment_method, note,
    idempotency_key, created_by
  ) values (
    v_customer_id, v_day, v_occurred_at, v_amount_vnd, v_payment_method, v_note,
    p_idempotency_key, v_actor_id
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
    jsonb_build_object(
      'receipt', to_jsonb(v_receipt),
      'totalAllocatedVnd', v_total_allocated_vnd,
      'unallocatedVnd', v_amount_vnd - v_total_allocated_vnd
    )
  );
  v_response := jsonb_build_object('receiptId', v_receipt.id);
  update public.idempotency_keys
  set status = 'completed', entity_id = v_receipt.id, response = v_response, completed_at = now()
  where key = p_idempotency_key and actor_id = v_actor_id and operation = 'record_receipt';
  if not found then
    raise exception 'IDEMPOTENCY_COMPLETION_FAILED' using errcode = 'P0001';
  end if;
  return v_response;
end;
$$;

revoke all on function public.record_receipt(jsonb, uuid) from public, anon, authenticated, service_role;
grant execute on function public.record_receipt(jsonb, uuid) to authenticated, service_role;

create or replace function public.create_expense(p_input jsonb, p_idempotency_key uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_claim public.idempotency_keys;
  v_day date;
  v_occurred_at timestamptz;
  v_category_id uuid;
  v_amount_vnd bigint;
  v_payee text;
  v_note text;
  v_expense public.expenses;
  v_response jsonb;
begin
  if p_input is null or jsonb_typeof(p_input) <> 'object' then
    raise exception 'INVALID_EXPENSE_INPUT' using errcode = '22023';
  end if;
  if (select private.is_active_user()) is distinct from true then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  begin
    v_occurred_at := coalesce(nullif(p_input->>'occurredAt', '')::timestamptz, statement_timestamp());
    v_category_id := (p_input->>'categoryId')::uuid;
    v_amount_vnd := (p_input->>'amountVnd')::bigint;
  exception
    when invalid_text_representation or numeric_value_out_of_range
      or invalid_datetime_format or datetime_field_overflow then
      raise exception 'INVALID_EXPENSE_INPUT' using errcode = '22023';
  end;

  perform private.require_occurrence_after_cutover(v_occurred_at);
  v_day := private.operating_day_at(v_occurred_at);
  v_payee := trim(p_input->>'payee');
  v_note := nullif(trim(p_input->>'note'), '');
  if v_amount_vnd < 1 or v_amount_vnd > 10000000000
    or v_payee is null or length(v_payee) not between 1 and 200
    or (v_note is not null and length(v_note) > 1000) then
    raise exception 'INVALID_EXPENSE_INPUT' using errcode = '22023';
  end if;

  perform private.ensure_open_operating_day(v_day);
  if not exists (
    select 1 from public.expense_categories
    where id = v_category_id and is_active
  ) then
    raise exception 'ACTIVE_EXPENSE_CATEGORY_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_claim := private.claim_idempotency_key(p_idempotency_key, 'create_expense', v_actor_id);
  if v_claim.status = 'completed' then return v_claim.response; end if;

  insert into public.expenses (
    operating_day, occurred_at, category_id, amount_vnd, payee, note,
    idempotency_key, created_by
  ) values (
    v_day, v_occurred_at, v_category_id, v_amount_vnd, v_payee, v_note,
    p_idempotency_key, v_actor_id
  ) returning * into v_expense;

  perform private.write_audit(
    'expense.created', 'expense', v_expense.id, null, null, to_jsonb(v_expense)
  );
  v_response := jsonb_build_object('expenseId', v_expense.id);
  update public.idempotency_keys
  set status = 'completed', entity_id = v_expense.id, response = v_response, completed_at = now()
  where key = p_idempotency_key and actor_id = v_actor_id and operation = 'create_expense';
  if not found then
    raise exception 'IDEMPOTENCY_COMPLETION_FAILED' using errcode = 'P0001';
  end if;
  return v_response;
end;
$$;

revoke all on function public.create_expense(jsonb, uuid) from public, anon, authenticated, service_role;
grant execute on function public.create_expense(jsonb, uuid) to authenticated, service_role;

create function public.correct_document_occurred_at(
  p_entity_type text,
  p_entity_id uuid,
  p_expected_version integer,
  p_occurred_at timestamptz,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_claim public.idempotency_keys;
  v_sale public.sales;
  v_receipt public.receipts;
  v_expense public.expenses;
  v_original_day date;
  v_new_day date;
  v_before jsonb;
  v_after jsonb;
  v_new_version integer;
  v_response jsonb;
begin
  if (select private.is_active_user()) is distinct from true then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_entity_type not in ('sale', 'receipt', 'expense')
    or p_entity_id is null or p_expected_version < 1
    or p_occurred_at is null or p_idempotency_key is null then
    raise exception 'INVALID_DOCUMENT_TIME_INPUT' using errcode = '22023';
  end if;

  perform private.require_occurrence_after_cutover(p_occurred_at);
  v_new_day := private.operating_day_at(p_occurred_at);
  v_claim := private.claim_idempotency_key(
    p_idempotency_key,
    'correct_document_occurred_at',
    v_actor_id
  );
  if v_claim.status = 'completed' then return v_claim.response; end if;

  if p_entity_type = 'sale' then
    select * into v_sale from public.sales where id = p_entity_id for update;
    if not found or v_sale.status <> 'active' then
      raise exception 'INVALID_STATE' using errcode = '55000';
    end if;
    perform private.require_cancel_permission(v_sale.created_by);
    if v_sale.version <> p_expected_version then
      raise exception 'VERSION_CONFLICT' using errcode = 'PT409';
    end if;
    v_original_day := v_sale.operating_day;

  elsif p_entity_type = 'receipt' then
    select * into v_receipt from public.receipts where id = p_entity_id for update;
    if not found or v_receipt.status <> 'active' or v_receipt.source_sale_id is not null then
      raise exception 'INVALID_STATE' using errcode = '55000';
    end if;
    perform private.require_cancel_permission(v_receipt.created_by);
    if v_receipt.version <> p_expected_version then
      raise exception 'VERSION_CONFLICT' using errcode = 'PT409';
    end if;
    v_original_day := v_receipt.operating_day;

  else
    select * into v_expense from public.expenses where id = p_entity_id for update;
    if not found or v_expense.status = 'cancelled' then
      raise exception 'INVALID_STATE' using errcode = '55000';
    end if;
    perform private.require_cancel_permission(v_expense.created_by);
    if v_expense.version <> p_expected_version then
      raise exception 'VERSION_CONFLICT' using errcode = 'PT409';
    end if;
    v_original_day := v_expense.operating_day;
  end if;

  insert into public.operating_days (day)
  values (v_new_day)
  on conflict (day) do nothing;
  perform private.require_open_day(least(v_original_day, v_new_day));
  if v_original_day <> v_new_day then
    perform private.require_open_day(greatest(v_original_day, v_new_day));
  end if;

  if p_entity_type = 'sale' then
    select jsonb_build_object(
      'sale', to_jsonb(v_sale),
      'receivable', (select to_jsonb(item) from public.receivables as item where item.sale_id = v_sale.id),
      'receipt', (select to_jsonb(item) from public.receipts as item where item.source_sale_id = v_sale.id)
    ) into v_before;

    update public.sales
    set occurred_at = p_occurred_at,
        operating_day = v_new_day,
        version = version + 1
    where id = v_sale.id and version = p_expected_version and status = 'active'
    returning version into v_new_version;
    if not found then
      raise exception 'VERSION_CONFLICT' using errcode = 'PT409';
    end if;

    update public.receivables as receivable
    set operating_day = v_new_day,
        due_date = v_new_day + customer.payment_term_days,
        version = receivable.version + 1
    from public.customers as customer
    where receivable.sale_id = v_sale.id
      and customer.id = receivable.customer_id;

    update public.receipts
    set occurred_at = p_occurred_at,
        operating_day = v_new_day,
        version = version + 1
    where source_sale_id = v_sale.id;

    select jsonb_build_object(
      'sale', to_jsonb(item),
      'receivable', (select to_jsonb(debt) from public.receivables as debt where debt.sale_id = item.id),
      'receipt', (select to_jsonb(payment) from public.receipts as payment where payment.source_sale_id = item.id)
    ) into v_after
    from public.sales as item
    where item.id = v_sale.id;

  elsif p_entity_type = 'receipt' then
    v_before := to_jsonb(v_receipt);
    update public.receipts
    set occurred_at = p_occurred_at,
        operating_day = v_new_day,
        version = version + 1
    where id = v_receipt.id and version = p_expected_version and status = 'active'
    returning * into v_receipt;
    if not found then
      raise exception 'VERSION_CONFLICT' using errcode = 'PT409';
    end if;
    v_new_version := v_receipt.version;
    v_after := to_jsonb(v_receipt);

  else
    v_before := to_jsonb(v_expense);
    update public.expenses
    set occurred_at = p_occurred_at,
        operating_day = v_new_day,
        version = version + 1
    where id = v_expense.id and version = p_expected_version and status <> 'cancelled'
    returning * into v_expense;
    if not found then
      raise exception 'VERSION_CONFLICT' using errcode = 'PT409';
    end if;
    v_new_version := v_expense.version;
    v_after := to_jsonb(v_expense);
  end if;

  perform private.write_audit(
    p_entity_type || '.occurred_at_changed',
    p_entity_type,
    p_entity_id,
    null,
    v_before,
    v_after
  );

  v_response := jsonb_build_object(
    'entityType', p_entity_type,
    'entityId', p_entity_id,
    'operatingDay', v_new_day,
    'occurredAt', p_occurred_at,
    'version', v_new_version
  );
  update public.idempotency_keys
  set status = 'completed', entity_id = p_entity_id, response = v_response, completed_at = now()
  where key = p_idempotency_key
    and actor_id = v_actor_id
    and operation = 'correct_document_occurred_at';
  if not found then
    raise exception 'IDEMPOTENCY_COMPLETION_FAILED' using errcode = 'P0001';
  end if;
  return v_response;
end;
$$;

revoke all on function public.correct_document_occurred_at(text, uuid, integer, timestamptz, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.correct_document_occurred_at(text, uuid, integer, timestamptz, uuid)
  to authenticated, service_role;

create or replace function public.start_machine(p_machine_id uuid, p_idempotency_key uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_now timestamptz := clock_timestamp();
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
  perform private.require_occurrence_after_cutover(v_now);

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('production_machine:' || p_machine_id::text, 0)
  );
  v_existing := private.claim_production_action(
    p_idempotency_key, v_actor_id, 'start_machine', p_machine_id
  );
  if v_existing is not null then return v_existing; end if;

  perform machine.id from public.machines as machine
  where machine.id = p_machine_id and machine.is_active for key share;
  if not found then
    raise exception 'ACTIVE_MACHINE_NOT_FOUND' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from public.machine_runs where machine_id = p_machine_id and stopped_at is null
  ) then
    raise exception 'MACHINE_ALREADY_RUNNING' using errcode = '55000';
  end if;

  v_day := private.ensure_open_production_day(private.production_date_at(v_now));
  insert into public.machine_runs (machine_id, production_day_id, started_at, started_by)
  values (p_machine_id, v_day.id, v_now, v_actor_id)
  returning * into v_run;

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

revoke all on function public.start_machine(uuid, uuid) from public, anon, authenticated, service_role;
grant execute on function public.start_machine(uuid, uuid) to authenticated, service_role;

create or replace function public.correct_production_action(p_input jsonb, p_idempotency_key uuid)
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
  v_target_date date;
  v_original_date date;
  v_target_day public.production_days;
  v_original_day public.production_days;
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
  exception when invalid_text_representation or numeric_value_out_of_range
    or invalid_datetime_format or datetime_field_overflow then
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

  perform private.require_occurrence_after_cutover(v_occurred_at);
  v_target_date := private.production_date_at(v_occurred_at);

  if v_action in ('change_run_start', 'change_run_stop') then
    select run.*
    into v_run
    from public.machine_runs as run
    join public.production_days as day on day.id = run.production_day_id
    where run.id = v_run_id;
    if not found then raise exception 'RUN_NOT_FOUND' using errcode = 'P0002'; end if;
    select production_date into v_original_date
    from public.production_days where id = v_run.production_day_id;
    v_machine_id := v_run.machine_id;
  elsif v_action = 'change_harvest_time' then
    select harvest.*
    into v_harvest
    from public.machine_harvests as harvest
    join public.machine_runs as run on run.id = harvest.machine_run_id
    join public.production_days as day on day.id = run.production_day_id
    where harvest.id = v_harvest_id;
    if not found then raise exception 'HARVEST_NOT_FOUND' using errcode = 'P0002'; end if;
    select day.production_date into v_original_date
    from public.production_days as day
    join public.machine_runs as run on run.production_day_id = day.id
    where run.id = v_harvest.machine_run_id;
    v_machine_id := v_harvest.machine_id;
  elsif v_machine_id is null then
    raise exception 'INVALID_CORRECTION_INPUT' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('production_machine:' || v_machine_id::text, 0)
  );
  v_existing := private.claim_production_action(
    p_idempotency_key, v_actor_id, 'correct_production_action', v_machine_id
  );
  if v_existing is not null then return v_existing; end if;

  if v_action = 'add_start' then
    perform machine.id
    from public.machines as machine
    where machine.id = v_machine_id and machine.is_active
    for key share;
    if not found then raise exception 'ACTIVE_MACHINE_NOT_FOUND' using errcode = 'P0002'; end if;

    v_target_day := private.ensure_open_production_day(v_target_date);
    insert into public.machine_runs (machine_id, production_day_id, started_at, started_by)
    values (v_machine_id, v_target_day.id, v_occurred_at, v_actor_id)
    returning * into v_run;
    v_before := null;
    v_after := to_jsonb(v_run);
    v_run_id := v_run.id;

  elsif v_action = 'add_stop' then
    select run.*
    into v_run
    from public.machine_runs as run
    join public.production_days as day on day.id = run.production_day_id
    where run.machine_id = v_machine_id and run.stopped_at is null
    for update of run;
    if not found then raise exception 'MACHINE_NOT_RUNNING' using errcode = '55000'; end if;
    select production_date into v_original_date
    from public.production_days where id = v_run.production_day_id;

    perform private.ensure_open_operating_day(least(v_original_date, v_target_date));
    if v_original_date <> v_target_date then
      perform private.ensure_open_operating_day(greatest(v_original_date, v_target_date));
    end if;
    select * into v_original_day
    from public.production_days where id = v_run.production_day_id for update;
    if v_original_day.status <> 'open' then
      raise exception 'PRODUCTION_DAY_LOCKED' using errcode = '55000';
    end if;

    v_before := to_jsonb(v_run);
    update public.machine_runs
    set stopped_at = v_occurred_at, stopped_by = v_actor_id
    where id = v_run.id
    returning * into v_run;
    v_after := to_jsonb(v_run);
    v_run_id := v_run.id;

  elsif v_action = 'add_harvest' then
    select run.*
    into v_run
    from public.machine_runs as run
    join public.production_days as day on day.id = run.production_day_id
    where run.machine_id = v_machine_id
      and day.status = 'open'
      and v_occurred_at >= run.started_at
      and (run.stopped_at is null or v_occurred_at <= run.stopped_at)
    order by run.started_at desc
    limit 1
    for update of run;
    if not found then raise exception 'RUN_NOT_FOUND_FOR_TIME' using errcode = 'P0002'; end if;
    select production_date into v_original_date
    from public.production_days where id = v_run.production_day_id;

    perform private.ensure_open_operating_day(least(v_original_date, v_target_date));
    if v_original_date <> v_target_date then
      perform private.ensure_open_operating_day(greatest(v_original_date, v_target_date));
    end if;
    select * into v_original_day
    from public.production_days where id = v_run.production_day_id for update;
    if v_original_day.status <> 'open' then
      raise exception 'PRODUCTION_DAY_LOCKED' using errcode = '55000';
    end if;

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
      insert into public.machine_harvest_revisions (
        harvest_id, old_quantity, new_quantity, changed_by
      ) values (v_harvest.id, null, v_quantity, v_actor_id);
    end if;
    v_before := null;
    v_after := to_jsonb(v_harvest);
    v_harvest_id := v_harvest.id;

  elsif v_action = 'change_run_start' then
    select run.*
    into v_run
    from public.machine_runs as run
    join public.production_days as day on day.id = run.production_day_id
    where run.id = v_run_id
    for update of run;
    if not found then raise exception 'RUN_NOT_FOUND' using errcode = 'P0002'; end if;
    select production_date into v_original_date
    from public.production_days where id = v_run.production_day_id;

    perform private.ensure_open_operating_day(least(v_original_date, v_target_date));
    if v_original_date <> v_target_date then
      perform private.ensure_open_operating_day(greatest(v_original_date, v_target_date));
    end if;
    v_target_day := private.ensure_open_production_day(v_target_date);
    select * into v_original_day
    from public.production_days where id = v_run.production_day_id for update;
    if v_original_day.status <> 'open' then
      raise exception 'PRODUCTION_DAY_LOCKED' using errcode = '55000';
    end if;

    v_before := to_jsonb(v_run);
    update public.machine_runs
    set started_at = v_occurred_at,
        production_day_id = v_target_day.id
    where id = v_run.id
    returning * into v_run;
    v_after := to_jsonb(v_run);

  elsif v_action = 'change_run_stop' then
    select run.*
    into v_run
    from public.machine_runs as run
    join public.production_days as day on day.id = run.production_day_id
    where run.id = v_run_id
    for update of run;
    if not found or v_run.stopped_at is null then
      raise exception 'RUN_NOT_STOPPED' using errcode = '55000';
    end if;
    select production_date into v_original_date
    from public.production_days where id = v_run.production_day_id;

    perform private.ensure_open_operating_day(least(v_original_date, v_target_date));
    if v_original_date <> v_target_date then
      perform private.ensure_open_operating_day(greatest(v_original_date, v_target_date));
    end if;
    select * into v_original_day
    from public.production_days where id = v_run.production_day_id for update;
    if v_original_day.status <> 'open' then
      raise exception 'PRODUCTION_DAY_LOCKED' using errcode = '55000';
    end if;

    v_before := to_jsonb(v_run);
    update public.machine_runs
    set stopped_at = v_occurred_at
    where id = v_run.id
    returning * into v_run;
    v_after := to_jsonb(v_run);

  else
    select harvest.*
    into v_harvest
    from public.machine_harvests as harvest
    join public.machine_runs as run on run.id = harvest.machine_run_id
    join public.production_days as day on day.id = run.production_day_id
    where harvest.id = v_harvest_id
    for update of harvest;
    if not found then raise exception 'HARVEST_NOT_FOUND' using errcode = 'P0002'; end if;
    select day.production_date into v_original_date
    from public.production_days as day
    join public.machine_runs as run on run.production_day_id = day.id
    where run.id = v_harvest.machine_run_id;

    perform private.ensure_open_operating_day(least(v_original_date, v_target_date));
    if v_original_date <> v_target_date then
      perform private.ensure_open_operating_day(greatest(v_original_date, v_target_date));
    end if;
    select day.* into v_original_day
    from public.production_days as day
    join public.machine_runs as run on run.production_day_id = day.id
    where run.id = v_harvest.machine_run_id
    for update of day;
    if v_original_day.status <> 'open' then
      raise exception 'PRODUCTION_DAY_LOCKED' using errcode = '55000';
    end if;

    v_before := to_jsonb(v_harvest);
    update public.machine_harvests
    set harvested_at = v_occurred_at
    where id = v_harvest.id
    returning * into v_harvest;
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
    case when v_action in ('add_harvest', 'change_harvest_time')
      then 'machine_harvest' else 'machine_run' end,
    coalesce(v_harvest_id, v_run_id),
    null,
    v_before,
    v_after
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

revoke all on function public.correct_production_action(jsonb, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.correct_production_action(jsonb, uuid)
  to authenticated, service_role;

create or replace function public.get_production_board(p_production_date date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_starts_at timestamptz :=
    (p_production_date::timestamp + time '20:00') at time zone 'Asia/Bangkok';
  v_ends_at timestamptz :=
    ((p_production_date + 1)::timestamp + time '20:00') at time zone 'Asia/Bangkok';
  v_day public.production_days;
begin
  if (select private.is_active_user()) is distinct from true then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  select * into v_day
  from public.production_days
  where production_date = p_production_date;

  return jsonb_build_object(
    'productionDate', p_production_date,
    'startsAt', v_starts_at,
    'endsAt', v_ends_at,
    'status', coalesce(v_day.status::text, 'open'),
    'reminderMinutes', (
      select production_harvest_reminder_minutes
      from public.settings
      where id = true
    ),
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
          where harvest.machine_id = machine.id
            and harvest.harvested_at >= v_starts_at
            and harvest.harvested_at < v_ends_at
        ), 0),
        'harvestCount', (
          select count(*)
          from public.machine_harvests as harvest
          where harvest.machine_id = machine.id
            and harvest.harvested_at >= v_starts_at
            and harvest.harvested_at < v_ends_at
            and harvest.bag_quantity is not null
        ),
        'logs', coalesce((
          select jsonb_agg(log_item.item order by log_item.occurred_at desc)
          from (
            select run.started_at as occurred_at, jsonb_build_object(
              'id', run.id::text || ':start',
              'type', 'start',
              'occurredAt', run.started_at,
              'actorName', starter.full_name,
              'runId', run.id
            ) as item
            from public.machine_runs as run
            join public.profiles as starter on starter.id = run.started_by
            where run.machine_id = machine.id
              and run.started_at >= v_starts_at
              and run.started_at < v_ends_at

            union all

            select harvest.harvested_at, jsonb_build_object(
              'id', harvest.id::text || ':harvest',
              'type', 'harvest',
              'occurredAt', harvest.harvested_at,
              'actorName', harvester.full_name,
              'runId', harvest.machine_run_id,
              'harvestId', harvest.id,
              'bagQuantity', harvest.bag_quantity,
              'quantityUpdatedAt', harvest.quantity_updated_at,
              'quantityUpdatedBy', updater.full_name
            )
            from public.machine_harvests as harvest
            join public.profiles as harvester on harvester.id = harvest.harvested_by
            left join public.profiles as updater on updater.id = harvest.quantity_updated_by
            where harvest.machine_id = machine.id
              and harvest.harvested_at >= v_starts_at
              and harvest.harvested_at < v_ends_at

            union all

            select run.stopped_at, jsonb_build_object(
              'id', run.id::text || ':stop',
              'type', 'stop',
              'occurredAt', run.stopped_at,
              'actorName', stopper.full_name,
              'runId', run.id
            )
            from public.machine_runs as run
            join public.profiles as stopper on stopper.id = run.stopped_by
            where run.machine_id = machine.id
              and run.stopped_at is not null
              and run.stopped_at >= v_starts_at
              and run.stopped_at < v_ends_at
          ) as log_item
        ), '[]'::jsonb)
      ) order by machine.name)
      from public.machines as machine
      where machine.is_active
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_production_board(date)
  from public, anon, authenticated, service_role;
grant execute on function public.get_production_board(date)
  to authenticated, service_role;
