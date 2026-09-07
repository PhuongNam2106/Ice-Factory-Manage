-- Supabase Dev migration version: 20260906090030
create or replace function private.compute_daily_reconciliation(p_day date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wholesale_vnd bigint := 0;
  v_retail_vnd bigint := 0;
  v_collected_vnd bigint := 0;
  v_new_debt_vnd bigint := 0;
  v_approved_expense_vnd bigint := 0;
  v_pending_expense_vnd bigint := 0;
  v_pending_expense_count integer := 0;
  v_unnamed_credit_count integer := 0;
  v_invalid_document_count integer := 0;
  v_open_machine_run_count integer := 0;
  v_first_day date;
  v_previous_day_ready boolean := false;
  v_source jsonb;
  v_report public.daily_loss_reports;
  v_report_exists boolean := false;
  v_is_stale boolean := false;
  v_checks jsonb := '[]'::jsonb;
  v_warning_pct numeric(5,2);
begin
  select
    private.operating_day_at(setting.operating_day_cutover_at),
    setting.loss_warning_pct
  into v_first_day, v_warning_pct
  from public.settings as setting
  where setting.id = true and setting.operating_day_cutover_at is not null;

  if v_first_day is null then
    raise exception 'CUTOVER_NOT_CONFIGURED' using errcode = '55000';
  end if;

  if p_day = v_first_day then
    v_previous_day_ready := true;
  elsif p_day > v_first_day then
    select day.status = 'locked'
    into v_previous_day_ready
    from public.daily_loss_reports as report
    join public.operating_days as day on day.day = report.operating_day
    where report.operating_day = p_day - 1;
    v_previous_day_ready := coalesce(v_previous_day_ready, false);
  end if;

  v_source := private.daily_loss_source_snapshot(p_day);
  select * into v_report
  from public.daily_loss_reports
  where operating_day = p_day;
  v_report_exists := found;
  if v_report_exists then
    v_is_stale := v_report.source_snapshot is distinct from v_source;
  end if;

  select
    coalesce(sum(total_vnd) filter (where kind = 'wholesale'), 0),
    coalesce(sum(total_vnd) filter (where kind = 'retail'), 0),
    count(*) filter (
      where kind = 'wholesale'
        and paid_now_vnd < total_vnd
        and customer_id is null
    )
  into v_wholesale_vnd, v_retail_vnd, v_unnamed_credit_count
  from public.sales
  where operating_day = p_day and status = 'active';

  select coalesce(sum(amount_vnd), 0)
  into v_collected_vnd
  from public.receipts
  where operating_day = p_day and status = 'active';

  select coalesce(sum(original_amount_vnd), 0)
  into v_new_debt_vnd
  from public.receivables
  where operating_day = p_day and status <> 'cancelled';

  select
    coalesce(sum(amount_vnd) filter (where status = 'approved'), 0),
    coalesce(sum(amount_vnd) filter (where status = 'pending'), 0),
    count(*) filter (where status = 'pending')
  into v_approved_expense_vnd, v_pending_expense_vnd, v_pending_expense_count
  from public.expenses
  where operating_day = p_day;

  select count(*)
  into v_open_machine_run_count
  from public.machine_runs as run
  join public.production_days as production_day on production_day.id = run.production_day_id
  where production_day.production_date = p_day and run.stopped_at is null;

  if not v_report_exists then
    v_checks := v_checks || jsonb_build_array(jsonb_build_object(
      'code', 'MISSING_LOSS_REPORT', 'blocking', true, 'overridable', false,
      'message', 'Chưa nhập tồn cuối và lưu đối soát hao hụt'
    ));
  end if;
  if not v_previous_day_ready then
    v_checks := v_checks || jsonb_build_array(jsonb_build_object(
      'code', 'PREVIOUS_DAY_NOT_READY', 'blocking', true, 'overridable', false,
      'message', 'Ngày trước chưa khóa nên chưa xác định được tồn đầu'
    ));
  end if;
  if (v_source->>'pendingHarvestCount')::integer > 0 then
    v_checks := v_checks || jsonb_build_array(jsonb_build_object(
      'code', 'PENDING_HARVEST_QUANTITY', 'blocking', true, 'overridable', false,
      'message', 'Còn ' || (v_source->>'pendingHarvestCount') || ' lần xả đá chưa nhập số bao'
    ));
  end if;
  if v_is_stale then
    v_checks := v_checks || jsonb_build_array(jsonb_build_object(
      'code', 'LOSS_REPORT_STALE', 'blocking', true, 'overridable', false,
      'message', 'Số liệu sản xuất hoặc bán hàng đã thay đổi sau lần đối soát'
    ));
  end if;
  if v_report_exists and v_report.requires_review and v_report.warning_confirmed_at is null then
    v_checks := v_checks || jsonb_build_array(jsonb_build_object(
      'code', 'LOSS_REVIEW_REQUIRED', 'blocking', true, 'overridable', false,
      'message', 'Chênh lệch hao hụt vượt ngưỡng và chưa được quản lý xác nhận'
    ));
  end if;
  if v_open_machine_run_count > 0 then
    v_checks := v_checks || jsonb_build_array(jsonb_build_object(
      'code', 'OPEN_MACHINE_RUNS', 'blocking', true, 'overridable', false,
      'message', 'Còn ' || v_open_machine_run_count || ' máy chưa tắt'
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

  return jsonb_build_object(
    'day', p_day,
    'totals', jsonb_build_object(
      'wholesaleRevenueVnd', v_wholesale_vnd,
      'retailRevenueVnd', v_retail_vnd,
      'revenueVnd', v_wholesale_vnd + v_retail_vnd,
      'soldBags', (v_source->>'soldBags')::bigint,
      'collectedVnd', v_collected_vnd,
      'newDebtVnd', v_new_debt_vnd,
      'productionBags', (v_source->>'producedBags')::bigint,
      'approvedExpenseVnd', v_approved_expense_vnd,
      'pendingExpenseVnd', v_pending_expense_vnd,
      'openingBags', case when v_report_exists then v_report.opening_bags else null end,
      'expectedClosingBags', case when v_report_exists then v_report.opening_bags + v_report.produced_bags - v_report.sold_bags else null end,
      'closingBags', case when v_report_exists then v_report.closing_bags else null end,
      'differenceBags', case when v_report_exists then v_report.difference_bags else null end,
      'differencePct', case when v_report_exists then v_report.difference_pct else null end
    ),
    'checks', v_checks,
    'lossWarningPct', v_warning_pct,
    'lossReportId', case when v_report_exists then v_report.id else null end,
    'lossReportVersion', case when v_report_exists then v_report.version else null end
  );
end;
$$;

drop function public.lock_operating_day(date, text);

create function public.lock_operating_day(p_day date)
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
  v_report public.daily_loss_reports;
  v_locked_at timestamptz := clock_timestamp();
begin
  if (select private.is_manager()) is distinct from true then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('operating_day:' || p_day::text, 0)
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('production_day:' || p_day::text, 0)
  );

  select * into v_day
  from public.operating_days
  where day = p_day
  for update;
  if not found then raise exception 'OPERATING_DAY_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_day.status <> 'open' then raise exception 'INVALID_STATE' using errcode = '55000'; end if;

  v_reconciliation := private.compute_daily_reconciliation(p_day);
  if exists (
    select 1
    from jsonb_array_elements(v_reconciliation->'checks') as check_item
    where (check_item->>'blocking')::boolean
  ) then
    raise exception 'CLOSING_BLOCKED' using errcode = '55000';
  end if;

  select * into strict v_report
  from public.daily_loss_reports
  where operating_day = p_day;
  if v_report.source_snapshot is distinct from private.daily_loss_source_snapshot(p_day) then
    raise exception 'LOSS_REPORT_STALE' using errcode = '55000';
  end if;

  v_before := to_jsonb(v_day);
  v_reconciliation := v_reconciliation || jsonb_build_object(
    'schemaVersion', 2,
    'snapshotVersion', v_day.snapshot_version + 1,
    'lockedAt', v_locked_at,
    'lockedBy', v_actor_id,
    'lossReport', to_jsonb(v_report),
    'status', 'locked'
  );

  update public.operating_days
  set status = 'locked',
      locked_at = v_locked_at,
      locked_by = v_actor_id,
      snapshot = v_reconciliation,
      snapshot_version = snapshot_version + 1
  where day = p_day
  returning * into v_day;

  insert into public.production_days (
    production_date, starts_at, ends_at, status, locked_at, locked_by
  ) values (
    p_day,
    (p_day::timestamp + time '20:00') at time zone 'Asia/Bangkok',
    ((p_day + 1)::timestamp + time '20:00') at time zone 'Asia/Bangkok',
    'locked', v_locked_at, v_actor_id
  )
  on conflict (production_date) do update
  set status = 'locked',
      locked_at = excluded.locked_at,
      locked_by = excluded.locked_by;

  perform private.write_audit(
    'operating_day.locked', 'operating_day', v_day.id, null, v_before, to_jsonb(v_day)
  );
  return v_reconciliation;
end;
$$;

create or replace function public.reopen_operating_day(p_day date, p_reason text)
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
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('production_day:' || p_day::text, 0)
  );

  select * into v_day
  from public.operating_days
  where day = p_day
  for update;
  if not found then raise exception 'OPERATING_DAY_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_day.status <> 'locked' then raise exception 'INVALID_STATE' using errcode = '55000'; end if;

  v_before := to_jsonb(v_day);
  update public.production_days
  set status = 'open',
      locked_at = null,
      locked_by = null,
      reopened_at = clock_timestamp(),
      reopened_by = v_actor_id
  where production_date = p_day;

  update public.operating_days
  set status = 'open',
      locked_at = null,
      locked_by = null,
      snapshot = null,
      reopened_at = clock_timestamp(),
      reopened_by = v_actor_id,
      reopen_reason = v_reason
  where day = p_day
  returning * into v_day;

  perform private.write_audit(
    'operating_day.reopened', 'operating_day', v_day.id, v_reason, v_before, to_jsonb(v_day)
  );
  return jsonb_build_object(
    'day', p_day,
    'status', 'open',
    'snapshotVersion', v_day.snapshot_version
  );
end;
$$;

revoke all on function private.compute_daily_reconciliation(date)
  from public, anon, authenticated, service_role;
revoke all on function public.lock_operating_day(date)
  from public, anon, authenticated, service_role;
revoke all on function public.reopen_operating_day(date, text)
  from public, anon, authenticated, service_role;
grant execute on function public.lock_operating_day(date)
  to authenticated, service_role;
grant execute on function public.reopen_operating_day(date, text)
  to authenticated, service_role;

drop function public.lock_production_day(date);
drop function public.reopen_production_day(date);
