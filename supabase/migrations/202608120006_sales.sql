create table public.sales (
  id uuid primary key default extensions.gen_random_uuid(),
  kind public.sale_kind not null,
  operating_day date not null references public.operating_days(day) on delete restrict,
  customer_id uuid references public.customers(id) on delete restrict,
  shift_code text,
  status public.document_status not null default 'active',
  total_vnd bigint not null check (total_vnd >= 0),
  paid_now_vnd bigint not null check (paid_now_vnd >= 0 and paid_now_vnd <= total_vnd),
  payment_method public.payment_method not null,
  note text check (note is null or length(note) <= 1000),
  idempotency_key uuid not null unique,
  version integer not null default 1 check (version >= 1),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (kind = 'wholesale' and shift_code is null)
    or
    (kind = 'retail' and customer_id is null and nullif(trim(shift_code), '') is not null)
  )
);

create unique index sales_active_retail_shift_key
on public.sales (operating_day, shift_code)
where kind = 'retail' and status = 'active';

create index sales_operating_day_idx on public.sales (operating_day);
create index sales_customer_id_idx on public.sales (customer_id) where customer_id is not null;
create index sales_created_by_idx on public.sales (created_by);

create trigger sales_set_updated_at
before update on public.sales
for each row execute function private.set_updated_at();

create table public.sale_lines (
  id uuid primary key default extensions.gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete restrict,
  line_number integer not null check (line_number > 0),
  quantity_bags bigint not null check (quantity_bags > 0 and quantity_bags <= 10000000),
  unit_price_vnd bigint not null check (unit_price_vnd > 0 and unit_price_vnd <= 100000000000000),
  line_total_vnd bigint generated always as (quantity_bags * unit_price_vnd) stored,
  created_at timestamptz not null default now(),
  unique (sale_id, line_number)
);

create index sale_lines_sale_id_idx on public.sale_lines (sale_id);

create table public.receivables (
  id uuid primary key default extensions.gen_random_uuid(),
  sale_id uuid not null unique references public.sales(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  operating_day date not null references public.operating_days(day) on delete restrict,
  original_amount_vnd bigint not null check (original_amount_vnd > 0),
  outstanding_amount_vnd bigint not null check (
    outstanding_amount_vnd >= 0 and outstanding_amount_vnd <= original_amount_vnd
  ),
  due_date date not null,
  status text not null default 'open' check (status in ('open', 'paid', 'cancelled')),
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'open' and outstanding_amount_vnd > 0)
    or (status in ('paid', 'cancelled'))
  )
);

create index receivables_customer_due_idx
on public.receivables (customer_id, due_date)
where status = 'open';
create index receivables_operating_day_idx on public.receivables (operating_day);

create trigger receivables_set_updated_at
before update on public.receivables
for each row execute function private.set_updated_at();

create table public.receipts (
  id uuid primary key default extensions.gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete restrict,
  operating_day date not null references public.operating_days(day) on delete restrict,
  source_sale_id uuid unique references public.sales(id) on delete restrict,
  amount_vnd bigint not null check (amount_vnd > 0),
  payment_method public.payment_method not null,
  note text check (note is null or length(note) <= 1000),
  status public.document_status not null default 'active',
  idempotency_key uuid unique,
  version integer not null default 1 check (version >= 1),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index receipts_customer_day_idx on public.receipts (customer_id, operating_day)
where customer_id is not null;
create index receipts_operating_day_idx on public.receipts (operating_day);
create index receipts_created_by_idx on public.receipts (created_by);

create trigger receipts_set_updated_at
before update on public.receipts
for each row execute function private.set_updated_at();

create table public.receipt_allocations (
  id uuid primary key default extensions.gen_random_uuid(),
  receipt_id uuid not null references public.receipts(id) on delete restrict,
  receivable_id uuid not null references public.receivables(id) on delete restrict,
  amount_vnd bigint not null check (amount_vnd > 0),
  created_at timestamptz not null default now(),
  unique (receipt_id, receivable_id)
);

create index receipt_allocations_receipt_id_idx on public.receipt_allocations (receipt_id);
create index receipt_allocations_receivable_id_idx on public.receipt_allocations (receivable_id);

create table public.inventory_ledger (
  id uuid primary key default extensions.gen_random_uuid(),
  operating_day date not null references public.operating_days(day) on delete restrict,
  kind public.inventory_entry_kind not null,
  quantity_delta_bags bigint not null check (quantity_delta_bags <> 0),
  source_type text not null check (nullif(trim(source_type), '') is not null),
  source_id uuid not null,
  note text check (note is null or length(note) <= 1000),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (kind, source_type, source_id)
);

create index inventory_ledger_operating_day_idx on public.inventory_ledger (operating_day);
create index inventory_ledger_created_by_idx on public.inventory_ledger (created_by);

alter table public.sales enable row level security;
alter table public.sale_lines enable row level security;
alter table public.receivables enable row level security;
alter table public.receipts enable row level security;
alter table public.receipt_allocations enable row level security;
alter table public.inventory_ledger enable row level security;

create policy sales_read_by_active_user on public.sales
for select to authenticated
using ((select private.is_active_user()));

create policy sale_lines_read_by_active_user on public.sale_lines
for select to authenticated
using ((select private.is_active_user()));

create policy receivables_read_by_active_user on public.receivables
for select to authenticated
using ((select private.is_active_user()));

create policy receipts_read_by_active_user on public.receipts
for select to authenticated
using ((select private.is_active_user()));

create policy receipt_allocations_read_by_active_user on public.receipt_allocations
for select to authenticated
using ((select private.is_active_user()));

create policy inventory_ledger_read_by_active_user on public.inventory_ledger
for select to authenticated
using ((select private.is_active_user()));

revoke all on public.sales, public.sale_lines, public.receivables, public.receipts,
  public.receipt_allocations, public.inventory_ledger from public, anon, authenticated;

grant select on public.sales, public.sale_lines, public.receivables, public.receipts,
  public.receipt_allocations, public.inventory_ledger to authenticated;

grant select, insert, update on public.sales, public.sale_lines, public.receivables,
  public.receipts, public.receipt_allocations, public.inventory_ledger to service_role;
