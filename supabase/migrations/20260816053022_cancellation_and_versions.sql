alter table public.production_shift_totals
  add column status public.document_status not null default 'active';

alter table public.expenses
  add column version integer not null default 1 check (version >= 1);

alter table public.sales
  add column cancelled_at timestamptz,
  add column cancelled_by uuid references public.profiles(id) on delete restrict,
  add column cancel_reason text;
alter table public.receipts
  add column cancelled_at timestamptz,
  add column cancelled_by uuid references public.profiles(id) on delete restrict,
  add column cancel_reason text;
alter table public.production_batches
  add column cancelled_at timestamptz,
  add column cancelled_by uuid references public.profiles(id) on delete restrict,
  add column cancel_reason text;
alter table public.production_shift_totals
  add column cancelled_at timestamptz,
  add column cancelled_by uuid references public.profiles(id) on delete restrict,
  add column cancel_reason text;
alter table public.expenses
  add column cancelled_at timestamptz,
  add column cancelled_by uuid references public.profiles(id) on delete restrict,
  add column cancel_reason text;

alter table public.expenses drop constraint expenses_check;
alter table public.expenses add constraint expenses_status_metadata_check check (
  (status = 'pending' and reviewed_by is null and reviewed_at is null and review_reason is null and cancelled_by is null and cancelled_at is null and cancel_reason is null)
  or (status = 'approved' and reviewed_by is not null and reviewed_at is not null and cancelled_by is null and cancelled_at is null and cancel_reason is null)
  or (status = 'rejected' and reviewed_by is not null and reviewed_at is not null and review_reason is not null and cancelled_by is null and cancelled_at is null and cancel_reason is null)
  or (status = 'cancelled' and cancelled_by is not null and cancelled_at is not null and length(trim(cancel_reason)) between 5 and 500)
);

alter table public.sales add constraint sales_cancellation_metadata_check check (
  (status = 'active' and cancelled_by is null and cancelled_at is null and cancel_reason is null)
  or (status = 'cancelled' and cancelled_by is not null and cancelled_at is not null and length(trim(cancel_reason)) between 5 and 500)
);
alter table public.receipts add constraint receipts_cancellation_metadata_check check (
  (status = 'active' and cancelled_by is null and cancelled_at is null and cancel_reason is null)
  or (status = 'cancelled' and cancelled_by is not null and cancelled_at is not null and length(trim(cancel_reason)) between 5 and 500)
);
alter table public.production_batches add constraint production_batches_cancellation_metadata_check check (
  (status = 'active' and cancelled_by is null and cancelled_at is null and cancel_reason is null)
  or (status = 'cancelled' and cancelled_by is not null and cancelled_at is not null and length(trim(cancel_reason)) between 5 and 500)
);
alter table public.production_shift_totals add constraint production_shift_totals_cancellation_metadata_check check (
  (status = 'active' and cancelled_by is null and cancelled_at is null and cancel_reason is null)
  or (status = 'cancelled' and cancelled_by is not null and cancelled_at is not null and length(trim(cancel_reason)) between 5 and 500)
);

create index sales_cancelled_by_idx on public.sales (cancelled_by) where cancelled_by is not null;
create index receipts_cancelled_by_idx on public.receipts (cancelled_by) where cancelled_by is not null;
create index production_batches_cancelled_by_idx on public.production_batches (cancelled_by) where cancelled_by is not null;
create index production_shift_totals_cancelled_by_idx on public.production_shift_totals (cancelled_by) where cancelled_by is not null;
create index expenses_cancelled_by_idx on public.expenses (cancelled_by) where cancelled_by is not null;

create function private.bump_version_if_unchanged()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.version = old.version then new.version := old.version + 1; end if;
  return new;
end;
$$;

create trigger expenses_bump_version
before update on public.expenses
for each row execute function private.bump_version_if_unchanged();

create function private.require_cancel_permission(p_owner_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select private.is_active_user()) is distinct from true then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_owner_id is distinct from (select auth.uid())
    and (select private.is_manager()) is distinct from true then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
end;
$$;

create function private.cancel_receipt_core(
  p_receipt_id uuid,
  p_actor_id uuid,
  p_reason text,
  p_allow_source_sale boolean default false
)
returns public.receipts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_receipt public.receipts;
  v_allocation record;
begin
  select * into v_receipt from public.receipts where id = p_receipt_id for update;
  if not found or v_receipt.status <> 'active' then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  if v_receipt.source_sale_id is not null and not p_allow_source_sale then
    raise exception 'INVALID_STATE: cancel the source sale instead' using errcode = 'P0001';
  end if;

  for v_allocation in
    select allocation.receivable_id, allocation.amount_vnd
    from public.receipt_allocations allocation
    where allocation.receipt_id = p_receipt_id
    order by allocation.receivable_id
  loop
    perform receivable.id from public.receivables receivable
    where receivable.id = v_allocation.receivable_id for update;
    update public.receivables
    set outstanding_amount_vnd = outstanding_amount_vnd + v_allocation.amount_vnd,
      status = 'open', version = version + 1
    where id = v_allocation.receivable_id and status <> 'cancelled';
    if not found then raise exception 'INVALID_STATE' using errcode = 'P0001'; end if;
  end loop;

  update public.receipts
  set status = 'cancelled', cancelled_at = now(), cancelled_by = p_actor_id,
    cancel_reason = p_reason, version = version + 1
  where id = p_receipt_id
  returning * into v_receipt;
  return v_receipt;
end;
$$;

create function private.reconcile_cancelled_production(
  p_day date,
  p_shift_code text,
  p_machine_id uuid,
  p_actor_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_selection public.production_source_selections;
  v_quantity bigint;
  v_new_entry_id uuid;
  v_source_event_id uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_day::text || '/' || p_shift_code || '/' || p_machine_id::text, 0)
  );
  select * into v_selection from public.production_source_selections
  where operating_day = p_day and shift_code = p_shift_code and machine_id = p_machine_id
  for update;
  if not found then return; end if;

  if v_selection.selected_source = 'batches' then
    select coalesce(sum(good_bags), 0) into v_quantity from public.production_batches
    where operating_day = p_day and shift_code = p_shift_code and machine_id = p_machine_id and status = 'active';
  else
    select coalesce(max(good_bags), 0) into v_quantity from public.production_shift_totals
    where operating_day = p_day and shift_code = p_shift_code and machine_id = p_machine_id and status = 'active';
  end if;

  if v_selection.inventory_entry_id is not null and v_selection.official_quantity_bags <> 0 then
    insert into public.inventory_ledger (
      operating_day, kind, quantity_delta_bags, source_type, source_id, reversal_of_id, note, created_by
    ) values (
      p_day, 'reversal', -v_selection.official_quantity_bags,
      'production_cancellation', v_selection.inventory_entry_id, v_selection.inventory_entry_id, p_reason, p_actor_id
    );
  end if;

  if v_quantity > 0 then
    v_source_event_id := extensions.gen_random_uuid();
    insert into public.inventory_ledger (
      operating_day, kind, quantity_delta_bags, source_type, source_id, note, created_by
    ) values (
      p_day, 'production', v_quantity, 'production_reconciliation', v_source_event_id,
      'Sản lượng sau hủy chứng từ / ' || p_shift_code, p_actor_id
    ) returning id into v_new_entry_id;
  end if;

  update public.production_source_selections
  set official_quantity_bags = v_quantity, inventory_entry_id = v_new_entry_id,
    is_confirmed = false, confirmed_by = null, confirmed_at = null
  where id = v_selection.id;
end;
$$;

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
  v_batch public.production_batches;
  v_total public.production_shift_totals;
  v_expense public.expenses;
  v_quantity bigint;
  v_original_inventory_id uuid;
begin
  if p_entity_type not in ('sale', 'receipt', 'production_batch', 'production_shift_total', 'expense')
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
    select id, -quantity_delta_bags into v_original_inventory_id, v_quantity from public.inventory_ledger
    where kind = 'sale' and source_type = 'sale' and source_id = v_sale.id;
    if v_quantity > 0 then
      insert into public.inventory_ledger (operating_day, kind, quantity_delta_bags, source_type, source_id, reversal_of_id, note, created_by)
      values (v_sale.operating_day, 'reversal', v_quantity, 'sale_cancellation', v_sale.id, v_original_inventory_id, v_reason, v_actor_id);
    end if;
    select * into v_receipt from public.receipts where source_sale_id = v_sale.id and status = 'active';
    if found then perform private.cancel_receipt_core(v_receipt.id, v_actor_id, v_reason, true); end if;
    update public.receivables set outstanding_amount_vnd = 0, status = 'cancelled', version = version + 1
    where sale_id = v_sale.id and status <> 'cancelled';
    update public.sales set status = 'cancelled', cancelled_at = now(), cancelled_by = v_actor_id,
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

  elsif p_entity_type = 'production_batch' then
    select * into v_batch from public.production_batches where id = p_entity_id for update;
    if not found then raise exception 'INVALID_STATE' using errcode = 'P0001'; end if;
    perform private.require_cancel_permission(v_batch.created_by);
    perform private.require_open_day(v_batch.operating_day);
    if v_batch.status <> 'active' then raise exception 'INVALID_STATE' using errcode = 'P0001'; end if;
    if v_batch.version <> p_expected_version then raise exception 'VERSION_CONFLICT' using errcode = 'PT409'; end if;
    v_before := to_jsonb(v_batch);
    update public.production_batches set status = 'cancelled', cancelled_at = now(), cancelled_by = v_actor_id,
      cancel_reason = v_reason, version = version + 1
    where id = v_batch.id and version = p_expected_version and status = 'active'
    returning * into v_batch;
    if not found then raise exception 'VERSION_CONFLICT' using errcode = 'PT409'; end if;
    perform private.reconcile_cancelled_production(v_batch.operating_day, v_batch.shift_code, v_batch.machine_id, v_actor_id, v_reason);
    v_after := to_jsonb(v_batch);

  elsif p_entity_type = 'production_shift_total' then
    select * into v_total from public.production_shift_totals where id = p_entity_id for update;
    if not found then raise exception 'INVALID_STATE' using errcode = 'P0001'; end if;
    perform private.require_cancel_permission(v_total.created_by);
    perform private.require_open_day(v_total.operating_day);
    if v_total.status <> 'active' then raise exception 'INVALID_STATE' using errcode = 'P0001'; end if;
    if v_total.version <> p_expected_version then raise exception 'VERSION_CONFLICT' using errcode = 'PT409'; end if;
    v_before := to_jsonb(v_total);
    update public.production_shift_totals set status = 'cancelled', cancelled_at = now(), cancelled_by = v_actor_id,
      cancel_reason = v_reason, version = version + 1
    where id = v_total.id and version = p_expected_version and status = 'active'
    returning * into v_total;
    if not found then raise exception 'VERSION_CONFLICT' using errcode = 'PT409'; end if;
    perform private.reconcile_cancelled_production(v_total.operating_day, v_total.shift_code, v_total.machine_id, v_actor_id, v_reason);
    v_after := to_jsonb(v_total);

  else
    select * into v_expense from public.expenses where id = p_entity_id for update;
    if not found then raise exception 'INVALID_STATE' using errcode = 'P0001'; end if;
    perform private.require_cancel_permission(v_expense.created_by);
    perform private.require_open_day(v_expense.operating_day);
    if v_expense.status = 'cancelled' then raise exception 'INVALID_STATE' using errcode = 'P0001'; end if;
    if v_expense.version <> p_expected_version then raise exception 'VERSION_CONFLICT' using errcode = 'PT409'; end if;
    v_before := to_jsonb(v_expense);
    update public.expenses set status = 'cancelled', cancelled_at = now(), cancelled_by = v_actor_id,
      cancel_reason = v_reason, version = version + 1
    where id = v_expense.id and version = p_expected_version and status <> 'cancelled'
    returning * into v_expense;
    if not found then raise exception 'VERSION_CONFLICT' using errcode = 'PT409'; end if;
    v_after := to_jsonb(v_expense);
  end if;

  perform private.write_audit(p_entity_type || '.cancelled', p_entity_type, p_entity_id, v_reason, v_before, v_after);
  return jsonb_build_object('entityType', p_entity_type, 'entityId', p_entity_id, 'version', p_expected_version + 1);
end;
$$;

revoke all on function private.require_cancel_permission(uuid) from public, anon, authenticated, service_role;
revoke all on function private.bump_version_if_unchanged() from public, anon, authenticated, service_role;
revoke all on function private.cancel_receipt_core(uuid, uuid, text, boolean) from public, anon, authenticated, service_role;
revoke all on function private.reconcile_cancelled_production(date, text, uuid, uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.cancel_document(text, uuid, integer, text) from public, anon, authenticated, service_role;
grant execute on function public.cancel_document(text, uuid, integer, text) to authenticated, service_role;
