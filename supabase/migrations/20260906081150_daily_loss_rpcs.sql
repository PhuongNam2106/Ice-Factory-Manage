create function private.daily_loss_source_snapshot(p_day date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_produced_bags bigint;
  v_pending_harvest_count integer;
  v_production_fingerprint text;
  v_sold_bags bigint;
  v_sales_fingerprint text;
begin
  select
    coalesce(sum(harvest.bag_quantity), 0),
    count(*) filter (where harvest.bag_quantity is null),
    md5(coalesce(jsonb_agg(
      jsonb_build_array(
        harvest.id,
        harvest.harvested_at,
        harvest.bag_quantity,
        harvest.quantity_updated_at
      ) order by harvest.id
    )::text, '[]'))
  into v_produced_bags, v_pending_harvest_count, v_production_fingerprint
  from public.machine_harvests as harvest
  where private.operating_day_at(harvest.harvested_at) = p_day;

  select
    coalesce(sum(line.quantity_bags), 0),
    md5(coalesce(jsonb_agg(
      jsonb_build_array(
        sale.id,
        sale.version,
        sale.status,
        line.line_number,
        line.quantity_bags
      ) order by sale.id, line.line_number
    )::text, '[]'))
  into v_sold_bags, v_sales_fingerprint
  from public.sales as sale
  join public.sale_lines as line on line.sale_id = sale.id
  where sale.operating_day = p_day
    and sale.status = 'active';

  return jsonb_build_object(
    'producedBags', v_produced_bags,
    'soldBags', v_sold_bags,
    'pendingHarvestCount', v_pending_harvest_count,
    'productionFingerprint', v_production_fingerprint,
    'salesFingerprint', v_sales_fingerprint
  );
end;
$$;

create function private.daily_loss_report_payload(
  p_report public.daily_loss_reports,
  p_source jsonb,
  p_is_stale boolean,
  p_previous_day_ready boolean,
  p_status public.operating_day_status
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_report.id,
    'operatingDay', p_report.operating_day,
    'openingBags', p_report.opening_bags,
    'producedBags', p_report.produced_bags,
    'soldBags', p_report.sold_bags,
    'expectedClosingBags', p_report.opening_bags + p_report.produced_bags - p_report.sold_bags,
    'closingBags', p_report.closing_bags,
    'differenceBags', p_report.difference_bags,
    'differencePct', p_report.difference_pct::text,
    'classification', p_report.classification,
    'warningPct', p_report.warning_pct::text,
    'requiresReview', p_report.requires_review,
    'warningConfirmedAt', p_report.warning_confirmed_at,
    'version', p_report.version,
    'isStale', p_is_stale,
    'pendingHarvestCount', (p_source->>'pendingHarvestCount')::integer,
    'previousDayReady', p_previous_day_ready,
    'canFinalize', p_previous_day_ready
      and not p_is_stale
      and (p_source->>'pendingHarvestCount')::integer = 0
      and (not p_report.requires_review or p_report.warning_confirmed_at is not null),
    'status', p_status,
    'note', p_report.note
  )
$$;

create function public.get_daily_loss_report(p_day date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_report public.daily_loss_reports;
  v_source jsonb;
  v_current_status public.operating_day_status;
  v_first_day date;
  v_previous_closing bigint;
  v_previous_day_ready boolean := false;
  v_is_stale boolean := false;
begin
  if (select private.is_active_user()) is distinct from true then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_day is null then
    raise exception 'INVALID_OPERATING_DAY' using errcode = '22023';
  end if;

  select private.operating_day_at(setting.operating_day_cutover_at)
  into v_first_day
  from public.settings as setting
  where setting.id = true and setting.operating_day_cutover_at is not null;
  if v_first_day is null then
    raise exception 'CUTOVER_NOT_CONFIGURED' using errcode = '55000';
  end if;

  select day.status into v_current_status
  from public.operating_days as day
  where day.day = p_day;
  v_current_status := coalesce(v_current_status, 'open'::public.operating_day_status);

  if p_day = v_first_day then
    v_previous_day_ready := true;
  elsif p_day > v_first_day then
    select report.closing_bags, day.status = 'locked'
    into v_previous_closing, v_previous_day_ready
    from public.daily_loss_reports as report
    join public.operating_days as day on day.day = report.operating_day
    where report.operating_day = p_day - 1;
    v_previous_day_ready := coalesce(v_previous_day_ready, false);
  end if;

  v_source := private.daily_loss_source_snapshot(p_day);
  select * into v_report
  from public.daily_loss_reports
  where operating_day = p_day;

  if found then
    v_is_stale := v_report.source_snapshot is distinct from v_source;
    return private.daily_loss_report_payload(
      v_report,
      v_source,
      v_is_stale,
      v_previous_day_ready,
      v_current_status
    );
  end if;

  return jsonb_build_object(
    'id', null,
    'operatingDay', p_day,
    'openingBags', case when v_previous_day_ready and p_day > v_first_day then v_previous_closing else null end,
    'producedBags', (v_source->>'producedBags')::bigint,
    'soldBags', (v_source->>'soldBags')::bigint,
    'expectedClosingBags', case
      when v_previous_day_ready and p_day > v_first_day
        then v_previous_closing
          + (v_source->>'producedBags')::bigint
          - (v_source->>'soldBags')::bigint
      else null
    end,
    'closingBags', null,
    'differenceBags', null,
    'differencePct', null,
    'classification', null,
    'warningPct', (select loss_warning_pct::text from public.settings where id = true),
    'requiresReview', false,
    'warningConfirmedAt', null,
    'version', null,
    'isStale', false,
    'pendingHarvestCount', (v_source->>'pendingHarvestCount')::integer,
    'previousDayReady', v_previous_day_ready,
    'canFinalize', false,
    'status', v_current_status,
    'note', null
  );
end;
$$;

create function public.save_daily_loss_report(p_input jsonb, p_idempotency_key uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_claim public.idempotency_keys;
  v_day date;
  v_first_day date;
  v_input_opening bigint;
  v_opening bigint;
  v_closing bigint;
  v_expected_version integer;
  v_note text;
  v_previous_status public.operating_day_status;
  v_source jsonb;
  v_produced bigint;
  v_sold bigint;
  v_difference bigint;
  v_difference_pct numeric(12,3);
  v_classification public.loss_classification;
  v_warning_pct numeric(5,2);
  v_requires_review boolean;
  v_report public.daily_loss_reports;
  v_before jsonb;
  v_after jsonb;
  v_response jsonb;
begin
  if (select private.is_active_user()) is distinct from true then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_input is null or jsonb_typeof(p_input) <> 'object'
    or p_idempotency_key is null
    or coalesce(p_input->>'operatingDay', '') !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'INVALID_DAILY_LOSS_INPUT' using errcode = '22023';
  end if;

  begin
    v_day := (p_input->>'operatingDay')::date;
    v_input_opening := nullif(p_input->>'openingBags', '')::bigint;
    v_closing := nullif(p_input->>'closingBags', '')::bigint;
    v_expected_version := nullif(p_input->>'expectedVersion', '')::integer;
    v_note := nullif(trim(p_input->>'note'), '');
  exception when invalid_text_representation or numeric_value_out_of_range
    or invalid_datetime_format or datetime_field_overflow then
    raise exception 'INVALID_DAILY_LOSS_INPUT' using errcode = '22023';
  end;

  if v_closing is null or v_closing < 0 or v_closing > 10000000
    or (v_input_opening is not null and (v_input_opening < 0 or v_input_opening > 10000000))
    or (v_expected_version is not null and v_expected_version < 1)
    or (v_note is not null and length(v_note) > 1000) then
    raise exception 'INVALID_DAILY_LOSS_INPUT' using errcode = '22023';
  end if;

  select
    private.operating_day_at(setting.operating_day_cutover_at),
    setting.loss_warning_pct
  into v_first_day, v_warning_pct
  from public.settings as setting
  where setting.id = true and setting.operating_day_cutover_at is not null;
  if v_first_day is null then
    raise exception 'CUTOVER_NOT_CONFIGURED' using errcode = '55000';
  end if;
  if v_day < v_first_day then
    raise exception 'OPERATING_DAY_BEFORE_CUTOVER' using errcode = '22023';
  end if;

  perform private.require_open_day(v_day);
  v_claim := private.claim_idempotency_key(
    p_idempotency_key,
    'save_daily_loss_report',
    v_actor_id
  );
  if v_claim.status = 'completed' then return v_claim.response; end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('daily_loss:' || v_day::text, 0)
  );

  if v_day = v_first_day then
    if v_input_opening is null then
      raise exception 'OPENING_BAGS_REQUIRED' using errcode = '22023';
    end if;
    v_opening := v_input_opening;
  else
    select report.closing_bags, day.status
    into v_opening, v_previous_status
    from public.daily_loss_reports as report
    join public.operating_days as day on day.day = report.operating_day
    where report.operating_day = v_day - 1;
    if v_opening is null or v_previous_status <> 'locked' then
      raise exception 'PREVIOUS_DAY_NOT_READY' using errcode = '55000';
    end if;
    if v_input_opening is not null and v_input_opening <> v_opening then
      raise exception 'OPENING_BAGS_DERIVED' using errcode = '22023';
    end if;
  end if;

  v_source := private.daily_loss_source_snapshot(v_day);
  v_produced := (v_source->>'producedBags')::bigint;
  v_sold := (v_source->>'soldBags')::bigint;
  v_difference := v_opening + v_produced - v_sold - v_closing;
  v_difference_pct := case when v_produced = 0 then null
    else round(abs(v_difference)::numeric / v_produced * 100, 3) end;
  v_classification := case
    when v_produced = 0 then 'no_production'::public.loss_classification
    when v_difference > 0 then 'loss'::public.loss_classification
    when v_difference < 0 then 'surplus'::public.loss_classification
    else 'matched'::public.loss_classification
  end;
  v_requires_review := case when v_difference_pct is null
    then v_difference <> 0 else v_difference_pct > v_warning_pct end;

  select * into v_report
  from public.daily_loss_reports
  where operating_day = v_day
  for update;
  v_before := case when found then to_jsonb(v_report) else null end;

  if v_report.id is null then
    if v_expected_version is not null then
      raise exception 'VERSION_CONFLICT' using errcode = 'PT409';
    end if;
    insert into public.daily_loss_reports (
      operating_day, opening_bags, produced_bags, sold_bags, closing_bags,
      difference_bags, difference_pct, classification, warning_pct,
      requires_review, source_snapshot, version, note, created_by, updated_by
    ) values (
      v_day, v_opening, v_produced, v_sold, v_closing,
      v_difference, v_difference_pct, v_classification, v_warning_pct,
      v_requires_review, v_source, 1, v_note, v_actor_id, v_actor_id
    ) returning * into v_report;
  else
    if v_expected_version is null or v_report.version <> v_expected_version then
      raise exception 'VERSION_CONFLICT' using errcode = 'PT409';
    end if;
    update public.daily_loss_reports
    set opening_bags = v_opening,
        produced_bags = v_produced,
        sold_bags = v_sold,
        closing_bags = v_closing,
        difference_bags = v_difference,
        difference_pct = v_difference_pct,
        classification = v_classification,
        warning_pct = v_warning_pct,
        requires_review = v_requires_review,
        source_snapshot = v_source,
        version = version + 1,
        note = v_note,
        warning_confirmed_by = null,
        warning_confirmed_at = null,
        updated_by = v_actor_id,
        updated_at = clock_timestamp()
    where id = v_report.id and version = v_expected_version
    returning * into v_report;
    if not found then
      raise exception 'VERSION_CONFLICT' using errcode = 'PT409';
    end if;
  end if;

  v_after := to_jsonb(v_report);
  insert into public.daily_loss_report_versions (
    report_id, version, snapshot, created_by
  ) values (v_report.id, v_report.version, v_after, v_actor_id);
  perform private.write_audit(
    case when v_before is null then 'daily_loss.created' else 'daily_loss.updated' end,
    'daily_loss_report',
    v_report.id,
    null,
    v_before,
    v_after
  );

  v_response := private.daily_loss_report_payload(
    v_report,
    v_source,
    false,
    true,
    'open'::public.operating_day_status
  );
  update public.idempotency_keys
  set status = 'completed',
      entity_id = v_report.id,
      response = v_response,
      completed_at = clock_timestamp()
  where key = p_idempotency_key
    and actor_id = v_actor_id
    and operation = 'save_daily_loss_report';
  if not found then
    raise exception 'IDEMPOTENCY_COMPLETION_FAILED' using errcode = 'P0001';
  end if;
  return v_response;
end;
$$;

create function public.confirm_daily_loss_warning(
  p_report_id uuid,
  p_expected_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_day date;
  v_report public.daily_loss_reports;
  v_source jsonb;
  v_before jsonb;
  v_after jsonb;
begin
  perform private.require_manager();
  if p_report_id is null or p_expected_version is null or p_expected_version < 1 then
    raise exception 'INVALID_WARNING_CONFIRMATION' using errcode = '22023';
  end if;

  select operating_day into v_day
  from public.daily_loss_reports
  where id = p_report_id;
  if not found then raise exception 'LOSS_REPORT_NOT_FOUND' using errcode = 'P0002'; end if;

  perform private.require_open_day(v_day);
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('daily_loss:' || v_day::text, 0)
  );
  select * into v_report
  from public.daily_loss_reports
  where id = p_report_id
  for update;
  if not found then raise exception 'LOSS_REPORT_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_report.version <> p_expected_version then
    raise exception 'VERSION_CONFLICT' using errcode = 'PT409';
  end if;
  if not v_report.requires_review then
    raise exception 'WARNING_NOT_REQUIRED' using errcode = '55000';
  end if;

  v_source := private.daily_loss_source_snapshot(v_report.operating_day);
  if v_report.source_snapshot is distinct from v_source then
    raise exception 'LOSS_REPORT_STALE' using errcode = '55000';
  end if;
  if (v_source->>'pendingHarvestCount')::integer > 0 then
    raise exception 'PENDING_HARVEST_QUANTITY' using errcode = '55000';
  end if;

  v_before := to_jsonb(v_report);
  update public.daily_loss_reports
  set warning_confirmed_by = v_actor_id,
      warning_confirmed_at = clock_timestamp(),
      version = version + 1,
      updated_by = v_actor_id,
      updated_at = clock_timestamp()
  where id = v_report.id and version = p_expected_version
  returning * into v_report;
  if not found then raise exception 'VERSION_CONFLICT' using errcode = 'PT409'; end if;

  v_after := to_jsonb(v_report);
  insert into public.daily_loss_report_versions (
    report_id, version, snapshot, created_by
  ) values (v_report.id, v_report.version, v_after, v_actor_id);
  perform private.write_audit(
    'daily_loss.warning_confirmed',
    'daily_loss_report',
    v_report.id,
    null,
    v_before,
    v_after
  );

  return private.daily_loss_report_payload(
    v_report,
    v_source,
    false,
    true,
    'open'::public.operating_day_status
  );
end;
$$;

revoke all on function private.daily_loss_source_snapshot(date)
  from public, anon, authenticated, service_role;
revoke all on function private.daily_loss_report_payload(
  public.daily_loss_reports, jsonb, boolean, boolean, public.operating_day_status
) from public, anon, authenticated, service_role;
revoke all on function public.get_daily_loss_report(date)
  from public, anon, authenticated, service_role;
revoke all on function public.save_daily_loss_report(jsonb, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.confirm_daily_loss_warning(uuid, integer)
  from public, anon, authenticated, service_role;

grant execute on function public.get_daily_loss_report(date)
  to authenticated, service_role;
grant execute on function public.save_daily_loss_report(jsonb, uuid)
  to authenticated, service_role;
grant execute on function public.confirm_daily_loss_warning(uuid, integer)
  to authenticated, service_role;
