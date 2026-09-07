create type public.loss_classification as enum (
  'matched',
  'loss',
  'surplus',
  'no_production'
);

create table public.daily_loss_reports (
  id uuid primary key default extensions.gen_random_uuid(),
  operating_day date not null unique
    references public.operating_days(day) on delete restrict,
  opening_bags bigint not null check (opening_bags between 0 and 10000000),
  produced_bags bigint not null check (produced_bags between 0 and 10000000),
  sold_bags bigint not null check (sold_bags between 0 and 10000000),
  closing_bags bigint not null check (closing_bags between 0 and 10000000),
  difference_bags bigint not null,
  difference_pct numeric(12,3),
  classification public.loss_classification not null,
  warning_pct numeric(5,2) not null check (warning_pct between 0 and 100),
  requires_review boolean not null,
  source_snapshot jsonb not null check (jsonb_typeof(source_snapshot) = 'object'),
  version integer not null default 1 check (version > 0),
  note text check (note is null or length(note) <= 1000),
  warning_confirmed_by uuid references public.profiles(id) on delete restrict,
  warning_confirmed_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((warning_confirmed_by is null) = (warning_confirmed_at is null))
);

create table public.daily_loss_report_versions (
  id uuid primary key default extensions.gen_random_uuid(),
  report_id uuid not null
    references public.daily_loss_reports(id) on delete restrict,
  version integer not null check (version > 0),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (report_id, version)
);

create index daily_loss_reports_day_updated_idx
  on public.daily_loss_reports (operating_day, updated_at desc);
create index daily_loss_reports_warning_confirmed_by_idx
  on public.daily_loss_reports (warning_confirmed_by)
  where warning_confirmed_by is not null;
create index daily_loss_reports_created_by_idx
  on public.daily_loss_reports (created_by);
create index daily_loss_reports_updated_by_idx
  on public.daily_loss_reports (updated_by);
create index daily_loss_report_versions_report_created_idx
  on public.daily_loss_report_versions (report_id, created_at desc);
create index daily_loss_report_versions_created_by_idx
  on public.daily_loss_report_versions (created_by);

alter table public.daily_loss_reports enable row level security;
alter table public.daily_loss_report_versions enable row level security;

create policy daily_loss_reports_read_by_active_user
on public.daily_loss_reports
for select
to authenticated
using ((select private.is_active_user()));

create policy daily_loss_report_versions_read_by_manager
on public.daily_loss_report_versions
for select
to authenticated
using ((select private.is_manager()));

create function private.reject_daily_loss_version_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'DAILY_LOSS_VERSION_IMMUTABLE' using errcode = '55000';
end;
$$;

create trigger daily_loss_report_versions_reject_mutation
before update or delete on public.daily_loss_report_versions
for each statement
execute function private.reject_daily_loss_version_mutation();

revoke all on public.daily_loss_reports from public, anon, authenticated;
revoke all on public.daily_loss_report_versions from public, anon, authenticated;
grant select on public.daily_loss_reports to authenticated;
grant select on public.daily_loss_report_versions to authenticated;
grant select, insert, update, delete on public.daily_loss_reports to service_role;
grant select, insert on public.daily_loss_report_versions to service_role;

revoke all on function private.reject_daily_loss_version_mutation()
  from public, anon, authenticated, service_role;
