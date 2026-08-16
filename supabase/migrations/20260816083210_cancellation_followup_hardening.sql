create function private.reactivate_corrected_shift_total()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'cancelled'
    and new.status = 'cancelled'
    and new.idempotency_key is distinct from old.idempotency_key then
    new.status := 'active';
    new.cancelled_at := null;
    new.cancelled_by := null;
    new.cancel_reason := null;
  end if;
  return new;
end;
$$;

create trigger production_shift_totals_reactivate_correction
before update on public.production_shift_totals
for each row execute function private.reactivate_corrected_shift_total();

create or replace function private.reconcile_cancelled_production(
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

  if v_quantity = v_selection.official_quantity_bags then return; end if;

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

revoke all on function private.reactivate_corrected_shift_total() from public, anon, authenticated, service_role;
revoke all on function private.reconcile_cancelled_production(date, text, uuid, uuid, text) from public, anon, authenticated, service_role;
