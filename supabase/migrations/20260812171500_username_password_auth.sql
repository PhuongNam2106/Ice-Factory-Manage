do $$
declare
  profile_count integer;
  matching_profile_count integer;
  matching_auth_count integer;
  matching_identity_count integer;
begin
  select count(*) into profile_count from public.profiles;

  if profile_count = 0 then
    return;
  end if;

  select count(*) into matching_profile_count
  from public.profiles
  where id = '71000000-0000-4000-8000-000000000001'::uuid
    and phone = '+84912345679'
    and full_name = 'Quản lý dùng thử'
    and role = 'manager'
    and is_active;

  select count(*) into matching_auth_count
  from auth.users
  where id = '71000000-0000-4000-8000-000000000001'::uuid
    and email is null
    and phone = '+84912345679'
    and phone_confirmed_at is not null
    and nullif(encrypted_password, '') is not null;

  select count(*) into matching_identity_count
  from auth.identities
  where user_id = '71000000-0000-4000-8000-000000000001'::uuid
    and provider = 'phone'
    and identity_data ->> 'phone' = '+84912345679';

  if profile_count <> 1
    or matching_profile_count <> 1
    or matching_auth_count <> 1
    or matching_identity_count <> 1
    or (select count(*) from auth.identities
        where user_id = '71000000-0000-4000-8000-000000000001'::uuid) <> 1
  then
    raise exception using
      errcode = 'P0001',
      message = 'username auth migration aborted: unexpected existing account state';
  end if;
end
$$;

alter table public.profiles
add column username text;

update public.profiles
set username = 'quanly'
where id = '71000000-0000-4000-8000-000000000001'::uuid;

alter table public.profiles
alter column username set not null,
alter column phone drop not null;

alter table public.profiles
add constraint profiles_username_format_check
check (username ~ '^[a-z0-9][a-z0-9._-]{2,31}$'),
add constraint profiles_username_key unique (username);

update auth.users
set email = 'quanly@account.icefactory.invalid',
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    phone = null,
    phone_confirmed_at = null,
    raw_app_meta_data = jsonb_build_object(
      'provider', 'email',
      'providers', jsonb_build_array('email')
    ),
    updated_at = now()
where id = '71000000-0000-4000-8000-000000000001'::uuid;

update auth.identities
set provider_id = 'quanly@account.icefactory.invalid',
    provider = 'email',
    identity_data = jsonb_build_object(
      'sub', user_id::text,
      'email', 'quanly@account.icefactory.invalid',
      'email_verified', true,
      'phone_verified', false
    ),
    updated_at = now()
where user_id = '71000000-0000-4000-8000-000000000001'::uuid;
