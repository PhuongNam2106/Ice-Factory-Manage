create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create type public.app_role as enum ('employee', 'manager');
create type public.document_status as enum ('active', 'cancelled');
create type public.operating_day_status as enum ('open', 'locked');
create type public.expense_status as enum ('pending', 'approved', 'rejected');
create type public.sale_kind as enum ('wholesale', 'retail');
create type public.payment_method as enum ('cash', 'bank_transfer');
create type public.production_source_kind as enum ('batches', 'shift_total');
create type public.inventory_entry_kind as enum ('opening', 'production', 'sale', 'adjustment', 'reversal');

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public;
