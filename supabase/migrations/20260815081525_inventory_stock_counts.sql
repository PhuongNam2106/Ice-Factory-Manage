alter table public.inventory_ledger
add column reversal_of_id uuid references public.inventory_ledger(id) on delete restrict;

update public.inventory_ledger
set reversal_of_id = source_id
where kind = 'reversal'
  and source_type = 'production_reversal'
  and reversal_of_id is null;

alter table public.inventory_ledger
add constraint inventory_ledger_reversal_shape_check check (
  (kind = 'reversal' and reversal_of_id is not null)
  or (kind <> 'reversal' and reversal_of_id is null)
);

create unique index inventory_ledger_one_reversal_idx
on public.inventory_ledger (reversal_of_id)
where reversal_of_id is not null;

create table public.stock_counts (
  id uuid primary key default extensions.gen_random_uuid(),
  operating_day date not null references public.operating_days(day) on delete restrict,
  expected_bags bigint not null,
  actual_bags bigint not null check (actual_bags >= 0 and actual_bags <= 10000000),
  variance_bags bigint generated always as (actual_bags - expected_bags) stored,
  variance_pct numeric(12,3),
  warning_pct numeric(5,2) not null check (warning_pct between 0 and 100),
  requires_review boolean not null,
  adjustment_entry_id uuid references public.inventory_ledger(id) on delete restrict,
  note text check (note is null or length(note) <= 1000),
  idempotency_key uuid not null unique,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (
    (actual_bags = expected_bags and adjustment_entry_id is null)
    or (actual_bags <> expected_bags and adjustment_entry_id is not null)
  )
);

create index stock_counts_operating_day_created_at_idx
on public.stock_counts (operating_day, created_at desc);
create index stock_counts_created_by_idx on public.stock_counts (created_by);
create index stock_counts_adjustment_entry_id_idx
on public.stock_counts (adjustment_entry_id)
where adjustment_entry_id is not null;

create function private.reject_inventory_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'INVENTORY_LEDGER_IS_APPEND_ONLY' using errcode = '55000';
end;
$$;

create trigger inventory_ledger_reject_update
before update on public.inventory_ledger
for each statement execute function private.reject_inventory_mutation();

create trigger inventory_ledger_reject_delete
before delete on public.inventory_ledger
for each statement execute function private.reject_inventory_mutation();

create function private.reject_stock_count_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'STOCK_COUNTS_ARE_APPEND_ONLY' using errcode = '55000';
end;
$$;

create trigger stock_counts_reject_update
before update on public.stock_counts
for each statement execute function private.reject_stock_count_mutation();

create trigger stock_counts_reject_delete
before delete on public.stock_counts
for each statement execute function private.reject_stock_count_mutation();

alter table public.stock_counts enable row level security;

create policy stock_counts_read_by_active_user on public.stock_counts
for select to authenticated
using ((select private.is_active_user()));

revoke all on public.stock_counts from public, anon, authenticated;
grant select on public.stock_counts to authenticated;
grant select, insert on public.stock_counts to service_role;

revoke all on function private.reject_inventory_mutation() from public, anon, authenticated, service_role;
revoke all on function private.reject_stock_count_mutation() from public, anon, authenticated, service_role;
