create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  phone text not null unique,
  full_name text not null check (length(trim(full_name)) between 2 and 100),
  role public.app_role not null default 'employee',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 160),
  phone text,
  address text,
  payment_term_days integer not null default 0 check (payment_term_days >= 0),
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.machines (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 100),
  code text unique,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.operating_days (
  day date primary key,
  status public.operating_day_status not null default 'open',
  locked_at timestamptz,
  locked_by uuid references public.profiles(id),
  reopened_at timestamptz,
  reopened_by uuid references public.profiles(id),
  reopen_reason text,
  snapshot jsonb,
  check ((status = 'open') or (locked_at is not null and locked_by is not null))
);

create table public.settings (
  id boolean primary key default true check (id),
  time_zone text not null default 'Asia/Bangkok' check (time_zone = 'Asia/Bangkok'),
  stock_variance_warning_pct numeric(5,2) not null default 5 check (stock_variance_warning_pct between 0 and 100),
  allow_negative_stock boolean not null default false,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table public.audit_log (
  id uuid primary key default extensions.gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  action text not null check (length(trim(action)) between 1 and 120),
  entity_type text not null check (length(trim(entity_type)) between 1 and 120),
  entity_id uuid not null,
  reason text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create table public.idempotency_keys (
  key uuid primary key,
  operation text not null check (length(trim(operation)) between 1 and 120),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  response jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index customers_created_by_idx on public.customers (created_by);
create index machines_created_by_idx on public.machines (created_by);
create index operating_days_locked_by_idx on public.operating_days (locked_by);
create index operating_days_reopened_by_idx on public.operating_days (reopened_by);
create index settings_updated_by_idx on public.settings (updated_by);
create index audit_log_actor_id_idx on public.audit_log (actor_id);
create index idempotency_keys_actor_id_idx on public.idempotency_keys (actor_id);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger customers_set_updated_at
before update on public.customers
for each row execute function private.set_updated_at();

create trigger machines_set_updated_at
before update on public.machines
for each row execute function private.set_updated_at();

create trigger settings_set_updated_at
before update on public.settings
for each row execute function private.set_updated_at();

insert into public.settings (id) values (true)
on conflict (id) do nothing;
