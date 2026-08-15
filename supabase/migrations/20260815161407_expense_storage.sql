insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'expense-receipts',
  'expense-receipts',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table public.expense_attachments (
  id uuid primary key default extensions.gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete restrict,
  bucket_id text not null default 'expense-receipts' check (bucket_id = 'expense-receipts'),
  object_path text not null unique check (length(object_path) between 1 and 1000),
  original_name text not null check (length(trim(original_name)) between 1 and 255),
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'application/pdf')),
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index expense_attachments_expense_id_idx
on public.expense_attachments (expense_id, created_at);
create index expense_attachments_uploaded_by_idx
on public.expense_attachments (uploaded_by);

alter table public.expense_attachments enable row level security;
create policy expense_attachments_read_by_active_user on public.expense_attachments
for select to authenticated
using ((select private.is_active_user()));

revoke all on public.expense_attachments from public, anon, authenticated;
grant select on public.expense_attachments to authenticated;
grant select, insert on public.expense_attachments to service_role;

create policy expense_receipts_read_by_active_user on storage.objects
for select to authenticated
using (
  bucket_id = 'expense-receipts'
  and (select private.is_active_user())
);

create policy expense_receipts_upload_for_own_expense on storage.objects
for insert to authenticated
with check (
  bucket_id = 'expense-receipts'
  and (select private.is_active_user())
  and exists (
    select 1 from public.expenses
    where expenses.id::text = (storage.foldername(name))[2]
      and expenses.created_by = (select auth.uid())
      and expenses.operating_day::text = (storage.foldername(name))[1]
      and expenses.status = 'pending'
  )
);

create function public.finalize_expense_attachment(
  p_expense_id uuid,
  p_object_path text,
  p_original_name text,
  p_content_type text,
  p_size_bytes bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_expense public.expenses;
  v_object storage.objects;
  v_attachment public.expense_attachments;
begin
  if (select private.is_active_user()) is distinct from true then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_content_type not in ('image/jpeg', 'image/png', 'application/pdf')
    or p_size_bytes < 1 or p_size_bytes > 10485760
    or length(trim(p_original_name)) not between 1 and 255 then
    raise exception 'INVALID_ATTACHMENT_METADATA' using errcode = '22023';
  end if;

  select * into v_expense from public.expenses where id = p_expense_id;
  if not found then raise exception 'EXPENSE_NOT_FOUND' using errcode = 'P0002'; end if;
  perform private.require_open_day(v_expense.operating_day);
  if v_expense.created_by <> v_actor_id and (select private.is_manager()) is distinct from true then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_object_path !~ ('^' || v_expense.operating_day::text || '/' || v_expense.id::text || '/[0-9a-f-]+\.[a-z0-9]+$') then
    raise exception 'INVALID_ATTACHMENT_PATH' using errcode = '22023';
  end if;

  select * into v_object
  from storage.objects
  where bucket_id = 'expense-receipts' and name = p_object_path;
  if not found then raise exception 'ATTACHMENT_UPLOAD_NOT_FOUND' using errcode = 'P0002'; end if;
  if coalesce((v_object.metadata->>'size')::bigint, -1) <> p_size_bytes
    or coalesce(v_object.metadata->>'mimetype', '') <> p_content_type then
    raise exception 'ATTACHMENT_METADATA_MISMATCH' using errcode = '22023';
  end if;

  insert into public.expense_attachments (
    expense_id, object_path, original_name, content_type, size_bytes, uploaded_by
  ) values (
    p_expense_id, p_object_path, trim(p_original_name), p_content_type, p_size_bytes, v_actor_id
  ) returning * into v_attachment;

  perform private.write_audit(
    'expense.attachment_added', 'expense_attachment', v_attachment.id,
    null, null, to_jsonb(v_attachment)
  );

  return jsonb_build_object('attachmentId', v_attachment.id);
end;
$$;

revoke all on function public.finalize_expense_attachment(uuid, text, text, text, bigint)
from public, anon, authenticated, service_role;
grant execute on function public.finalize_expense_attachment(uuid, text, text, text, bigint)
to authenticated, service_role;
