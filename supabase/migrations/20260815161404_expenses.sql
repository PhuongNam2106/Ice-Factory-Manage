create table public.expense_categories (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_]{2,50}$'),
  name text not null check (length(trim(name)) between 1 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.expense_categories (code, name) values
  ('electricity', 'Tiền điện'),
  ('fuel', 'Nhiên liệu'),
  ('wages', 'Nhân công'),
  ('maintenance', 'Sửa chữa, bảo trì'),
  ('delivery', 'Vận chuyển'),
  ('supplies', 'Vật tư'),
  ('other', 'Chi phí khác');

create table public.expenses (
  id uuid primary key default extensions.gen_random_uuid(),
  operating_day date not null references public.operating_days(day) on delete restrict,
  category_id uuid not null references public.expense_categories(id) on delete restrict,
  amount_vnd bigint not null check (amount_vnd between 1 and 10000000000),
  payee text not null check (length(trim(payee)) between 1 and 200),
  note text check (note is null or length(note) <= 1000),
  status public.expense_status not null default 'pending',
  review_reason text check (review_reason is null or length(trim(review_reason)) between 1 and 1000),
  reviewed_by uuid references public.profiles(id) on delete restrict,
  reviewed_at timestamptz,
  idempotency_key uuid not null unique,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'pending' and reviewed_by is null and reviewed_at is null and review_reason is null)
    or (status = 'approved' and reviewed_by is not null and reviewed_at is not null)
    or (status = 'rejected' and reviewed_by is not null and reviewed_at is not null and review_reason is not null)
  )
);

create index expenses_operating_day_created_at_idx
on public.expenses (operating_day, created_at desc);
create index expenses_category_id_idx on public.expenses (category_id);
create index expenses_created_by_idx on public.expenses (created_by);
create index expenses_reviewed_by_idx on public.expenses (reviewed_by)
where reviewed_by is not null;
create index expenses_pending_review_idx on public.expenses (created_at)
where status = 'pending';

alter table public.expense_categories enable row level security;
alter table public.expenses enable row level security;

create policy expense_categories_read_by_active_user on public.expense_categories
for select to authenticated
using ((select private.is_active_user()));

create policy expenses_read_by_active_user on public.expenses
for select to authenticated
using ((select private.is_active_user()));

revoke all on public.expense_categories from public, anon, authenticated;
revoke all on public.expenses from public, anon, authenticated;
grant select on public.expense_categories, public.expenses to authenticated;
grant select, insert, update on public.expense_categories, public.expenses to service_role;

create function public.create_expense(p_input jsonb, p_idempotency_key uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_claim public.idempotency_keys;
  v_day date;
  v_category_id uuid;
  v_amount_vnd bigint;
  v_payee text;
  v_note text;
  v_expense public.expenses;
  v_response jsonb;
begin
  if p_input is null or jsonb_typeof(p_input) <> 'object' then
    raise exception 'INVALID_EXPENSE_INPUT' using errcode = '22023';
  end if;
  if (select private.is_active_user()) is distinct from true then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  begin
    v_day := (p_input->>'operatingDay')::date;
    v_category_id := (p_input->>'categoryId')::uuid;
    v_amount_vnd := (p_input->>'amountVnd')::bigint;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'INVALID_EXPENSE_INPUT' using errcode = '22023';
  end;

  v_payee := trim(p_input->>'payee');
  v_note := nullif(trim(p_input->>'note'), '');
  if v_amount_vnd < 1 or v_amount_vnd > 10000000000
    or v_payee is null or length(v_payee) not between 1 and 200
    or (v_note is not null and length(v_note) > 1000) then
    raise exception 'INVALID_EXPENSE_INPUT' using errcode = '22023';
  end if;

  perform private.require_open_day(v_day);
  if not exists (
    select 1 from public.expense_categories
    where id = v_category_id and is_active
  ) then
    raise exception 'ACTIVE_EXPENSE_CATEGORY_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_claim := private.claim_idempotency_key(p_idempotency_key, 'create_expense', v_actor_id);
  if v_claim.status = 'completed' then return v_claim.response; end if;

  insert into public.expenses (
    operating_day, category_id, amount_vnd, payee, note,
    idempotency_key, created_by
  ) values (
    v_day, v_category_id, v_amount_vnd, v_payee, v_note,
    p_idempotency_key, v_actor_id
  ) returning * into v_expense;

  perform private.write_audit(
    'expense.created', 'expense', v_expense.id, null, null, to_jsonb(v_expense)
  );

  v_response := jsonb_build_object('expenseId', v_expense.id);
  update public.idempotency_keys
  set status = 'completed', entity_id = v_expense.id, response = v_response,
      completed_at = now()
  where key = p_idempotency_key
    and actor_id = v_actor_id
    and operation = 'create_expense';
  if not found then
    raise exception 'IDEMPOTENCY_COMPLETION_FAILED' using errcode = 'P0001';
  end if;

  return v_response;
end;
$$;

create function public.review_expense(
  p_expense_id uuid,
  p_decision text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_expense public.expenses;
  v_before jsonb;
  v_reason text := nullif(trim(p_reason), '');
begin
  if (select private.is_manager()) is distinct from true then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'INVALID_DECISION' using errcode = '22023';
  end if;
  if p_decision = 'rejected' and v_reason is null then
    raise exception 'REJECTION_REASON_REQUIRED' using errcode = '22023';
  end if;
  if v_reason is not null and length(v_reason) > 1000 then
    raise exception 'INVALID_REVIEW_REASON' using errcode = '22023';
  end if;

  select * into v_expense
  from public.expenses
  where id = p_expense_id
  for update;
  if not found then raise exception 'EXPENSE_NOT_FOUND' using errcode = 'P0002'; end if;
  perform private.require_open_day(v_expense.operating_day);
  if v_expense.status <> 'pending' then
    raise exception 'INVALID_STATE' using errcode = '55000';
  end if;

  v_before := to_jsonb(v_expense);
  update public.expenses
  set status = p_decision::public.expense_status,
      review_reason = v_reason,
      reviewed_by = v_actor_id,
      reviewed_at = now(),
      updated_at = now()
  where id = p_expense_id
  returning * into v_expense;

  perform private.write_audit(
    'expense.' || p_decision, 'expense', v_expense.id, v_reason,
    v_before, to_jsonb(v_expense)
  );

  return jsonb_build_object('expenseId', v_expense.id, 'status', v_expense.status);
end;
$$;

revoke all on function public.create_expense(jsonb, uuid)
from public, anon, authenticated, service_role;
revoke all on function public.review_expense(uuid, text, text)
from public, anon, authenticated, service_role;
grant execute on function public.create_expense(jsonb, uuid)
to authenticated, service_role;
grant execute on function public.review_expense(uuid, text, text)
to authenticated, service_role;
