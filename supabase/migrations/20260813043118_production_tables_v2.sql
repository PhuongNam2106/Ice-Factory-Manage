create table public.production_batches (
  id uuid primary key default extensions.gen_random_uuid(),
  operating_day date not null references public.operating_days(day) on delete restrict,
  shift_code text not null check (shift_code in ('ca_sang', 'ca_chieu', 'ca_dem')),
  machine_id uuid not null references public.machines(id) on delete restrict,
  start_time timestamptz not null,
  end_time timestamptz not null check (end_time > start_time),
  good_bags bigint not null check (good_bags >= 0 and good_bags <= 10000000),
  rejected_bags bigint not null default 0 check (rejected_bags >= 0 and rejected_bags <= 10000000),
  note text check (note is null or length(note) <= 1000),
  status public.document_status not null default 'active',
  idempotency_key uuid not null unique,
  version integer not null default 1 check (version >= 1),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.production_shift_totals (
  id uuid primary key default extensions.gen_random_uuid(),
  operating_day date not null references public.operating_days(day) on delete restrict,
  shift_code text not null check (shift_code in ('ca_sang', 'ca_chieu', 'ca_dem')),
  machine_id uuid not null references public.machines(id) on delete restrict,
  good_bags bigint not null check (good_bags >= 0 and good_bags <= 10000000),
  rejected_bags bigint not null default 0 check (rejected_bags >= 0 and rejected_bags <= 10000000),
  note text check (note is null or length(note) <= 1000),
  idempotency_key uuid not null unique,
  version integer not null default 1 check (version >= 1),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (operating_day, shift_code, machine_id)
);

create table public.production_source_selections (
  id uuid primary key default extensions.gen_random_uuid(),
  operating_day date not null references public.operating_days(day) on delete restrict,
  shift_code text not null check (shift_code in ('ca_sang', 'ca_chieu', 'ca_dem')),
  machine_id uuid not null references public.machines(id) on delete restrict,
  selected_source public.production_source_kind not null,
  is_confirmed boolean not null default false,
  confirmed_by uuid references public.profiles(id) on delete restrict,
  confirmed_at timestamptz,
  official_quantity_bags bigint not null default 0 check (
    official_quantity_bags >= 0 and official_quantity_bags <= 10000000
  ),
  inventory_entry_id uuid references public.inventory_ledger(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (operating_day, shift_code, machine_id),
  check (
    (is_confirmed and confirmed_by is not null and confirmed_at is not null)
    or (not is_confirmed and confirmed_by is null and confirmed_at is null)
  ),
  check (
    (official_quantity_bags = 0 and inventory_entry_id is null)
    or (official_quantity_bags > 0 and inventory_entry_id is not null)
  )
);

create index production_batches_reconciliation_idx
on public.production_batches (operating_day, shift_code, machine_id)
where status = 'active';

create index production_batches_machine_id_idx on public.production_batches (machine_id);
create index production_batches_created_by_idx on public.production_batches (created_by);
create index production_shift_totals_machine_id_idx on public.production_shift_totals (machine_id);
create index production_shift_totals_created_by_idx on public.production_shift_totals (created_by);
create index production_source_selections_machine_id_idx on public.production_source_selections (machine_id);
create index production_source_selections_confirmed_by_idx
on public.production_source_selections (confirmed_by)
where confirmed_by is not null;
create index production_source_selections_inventory_entry_id_idx
on public.production_source_selections (inventory_entry_id)
where inventory_entry_id is not null;

create trigger production_batches_set_updated_at
before update on public.production_batches
for each row execute function private.set_updated_at();

create trigger production_shift_totals_set_updated_at
before update on public.production_shift_totals
for each row execute function private.set_updated_at();

create trigger production_source_selections_set_updated_at
before update on public.production_source_selections
for each row execute function private.set_updated_at();

alter table public.production_batches enable row level security;
alter table public.production_shift_totals enable row level security;
alter table public.production_source_selections enable row level security;

create policy production_batches_read_by_active_user on public.production_batches
for select to authenticated
using ((select private.is_active_user()));

create policy production_shift_totals_read_by_active_user on public.production_shift_totals
for select to authenticated
using ((select private.is_active_user()));

create policy production_source_selections_read_by_active_user on public.production_source_selections
for select to authenticated
using ((select private.is_active_user()));

revoke all on public.production_batches, public.production_shift_totals,
  public.production_source_selections from public, anon, authenticated;

grant select on public.production_batches, public.production_shift_totals,
  public.production_source_selections to authenticated;

grant select, insert, update on public.production_batches, public.production_shift_totals,
  public.production_source_selections to service_role;
