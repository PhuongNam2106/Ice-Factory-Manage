alter table public.operating_days
add column id uuid not null default extensions.gen_random_uuid() unique,
add column snapshot_version integer not null default 0 check (snapshot_version >= 0);

create or replace function private.require_open_day(p_day date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.operating_day_status;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('operating_day:' || p_day::text, 0)
  );

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

create function private.compute_daily_reconciliation(p_day date)
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
  v_invalid_production_count integer;
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
  select coalesce(sum(official_quantity_bags), 0), count(*) filter (where not is_confirmed)
  into v_production_bags, v_invalid_production_count
  from public.production_source_selections where operating_day = p_day;
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
  if v_invalid_production_count > 0 then
    v_checks := v_checks || jsonb_build_array(jsonb_build_object(
      'code', 'INVALID_PRODUCTION_SOURCE', 'blocking', true, 'overridable', false,
      'message', 'Có nguồn sản xuất chưa được xác nhận'
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

create function public.get_daily_reconciliation(p_day date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_day public.operating_days;
begin
  if (select private.is_active_user()) is distinct from true then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  select * into v_day from public.operating_days where day = p_day;
  if not found then raise exception 'OPERATING_DAY_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_day.status = 'locked' and v_day.snapshot is not null then
    return v_day.snapshot || jsonb_build_object('status', v_day.status, 'snapshotVersion', v_day.snapshot_version);
  end if;
  return private.compute_daily_reconciliation(p_day)
    || jsonb_build_object('status', v_day.status, 'snapshotVersion', v_day.snapshot_version);
end;
$$;

create function public.lock_operating_day(p_day date, p_variance_override_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_day public.operating_days;
  v_before jsonb;
  v_reconciliation jsonb;
  v_reason text := nullif(trim(p_variance_override_reason), '');
  v_has_nonoverridable boolean;
  v_has_variance boolean;
begin
  if (select private.is_manager()) is distinct from true then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('operating_day:' || p_day::text, 0)
  );
  select * into v_day from public.operating_days where day = p_day for update;
  if not found then raise exception 'OPERATING_DAY_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_day.status <> 'open' then raise exception 'INVALID_STATE' using errcode = '55000'; end if;

  v_reconciliation := private.compute_daily_reconciliation(p_day);
  select exists (
    select 1 from jsonb_array_elements(v_reconciliation->'checks') check_item
    where (check_item->>'blocking')::boolean and not (check_item->>'overridable')::boolean
  ) into v_has_nonoverridable;
  select exists (
    select 1 from jsonb_array_elements(v_reconciliation->'checks') check_item
    where check_item->>'code' = 'STOCK_VARIANCE'
  ) into v_has_variance;
  if v_has_nonoverridable then raise exception 'CLOSING_BLOCKED' using errcode = '55000'; end if;
  if v_has_variance and v_reason is null then raise exception 'VARIANCE_OVERRIDE_REASON_REQUIRED' using errcode = '22023'; end if;
  if not v_has_variance and v_reason is not null then raise exception 'OVERRIDE_NOT_ALLOWED' using errcode = '22023'; end if;
  if v_reason is not null and length(v_reason) > 1000 then raise exception 'INVALID_OVERRIDE_REASON' using errcode = '22023'; end if;

  v_before := to_jsonb(v_day);
  v_reconciliation := v_reconciliation || jsonb_build_object(
    'schemaVersion', 1,
    'snapshotVersion', v_day.snapshot_version + 1,
    'lockedAt', now(),
    'lockedBy', v_actor_id,
    'overrideReason', v_reason,
    'status', 'locked'
  );
  update public.operating_days
  set status = 'locked', locked_at = now(), locked_by = v_actor_id,
      snapshot = v_reconciliation, snapshot_version = snapshot_version + 1
  where day = p_day returning * into v_day;
  perform private.write_audit('operating_day.locked', 'operating_day', v_day.id, v_reason, v_before, to_jsonb(v_day));
  return v_reconciliation;
end;
$$;

create function public.reopen_operating_day(p_day date, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_day public.operating_days;
  v_before jsonb;
  v_reason text := nullif(trim(p_reason), '');
begin
  if (select private.is_manager()) is distinct from true then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v_reason is null or length(v_reason) > 1000 then
    raise exception 'REOPEN_REASON_REQUIRED' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('operating_day:' || p_day::text, 0)
  );
  select * into v_day from public.operating_days where day = p_day for update;
  if not found then raise exception 'OPERATING_DAY_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_day.status <> 'locked' then raise exception 'INVALID_STATE' using errcode = '55000'; end if;
  v_before := to_jsonb(v_day);
  update public.operating_days
  set status = 'open', locked_at = null, locked_by = null, snapshot = null,
      reopened_at = now(), reopened_by = v_actor_id, reopen_reason = v_reason
  where day = p_day returning * into v_day;
  perform private.write_audit('operating_day.reopened', 'operating_day', v_day.id, v_reason, v_before, to_jsonb(v_day));
  return jsonb_build_object('day', p_day, 'status', 'open', 'snapshotVersion', v_day.snapshot_version);
end;
$$;

revoke all on function private.compute_daily_reconciliation(date) from public, anon, authenticated, service_role;
revoke all on function public.get_daily_reconciliation(date) from public, anon, authenticated, service_role;
revoke all on function public.lock_operating_day(date, text) from public, anon, authenticated, service_role;
revoke all on function public.reopen_operating_day(date, text) from public, anon, authenticated, service_role;
grant execute on function public.get_daily_reconciliation(date) to authenticated, service_role;
grant execute on function public.lock_operating_day(date, text) to authenticated, service_role;
grant execute on function public.reopen_operating_day(date, text) to authenticated, service_role;
