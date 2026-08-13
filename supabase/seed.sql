insert into public.settings (id) values (true)
on conflict (id) do nothing;

-- Local-only E2E accounts. Their six-digit password is not stored as plaintext.
-- Both accounts authenticate with password 123456 used in tests/e2e/auth.spec.ts.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'nhanvien@account.icefactory.invalid', '$2b$10$nXk5wK5Zhywq./deigg.KOZpKZlERYv7E296EfR0AVoWhXrhVrCim', now(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'quanly@account.icefactory.invalid', '$2b$10$nXk5wK5Zhywq./deigg.KOZpKZlERYv7E296EfR0AVoWhXrhVrCim', now(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{}', now(), now())
on conflict (id) do nothing;

insert into auth.identities (
  provider_id, user_id, identity_data, provider, created_at, updated_at
) values
  ('nhanvien@account.icefactory.invalid', '11111111-1111-1111-1111-111111111111', '{"sub":"11111111-1111-1111-1111-111111111111","email":"nhanvien@account.icefactory.invalid","email_verified":true,"phone_verified":false}', 'email', now(), now()),
  ('quanly@account.icefactory.invalid', '22222222-2222-2222-2222-222222222222', '{"sub":"22222222-2222-2222-2222-222222222222","email":"quanly@account.icefactory.invalid","email_verified":true,"phone_verified":false}', 'email', now(), now())
on conflict (provider_id, provider) do nothing;

insert into public.profiles (id, username, phone, full_name, role, is_active) values
  ('11111111-1111-1111-1111-111111111111', 'nhanvien', '+84912345678', 'Nhân viên E2E', 'employee', true),
  ('22222222-2222-2222-2222-222222222222', 'quanly', '+84912345679', 'Quản lý E2E', 'manager', true)
on conflict (id) do nothing;

insert into public.customers (
  id, name, phone, address, payment_term_days, created_by
) values (
  '33333333-3333-4333-8333-333333333333',
  'Đầu mối E2E',
  '0912345680',
  'Dữ liệu thử cục bộ',
  7,
  '22222222-2222-2222-2222-222222222222'
) on conflict (id) do nothing;

insert into public.operating_days (day, status)
values (((now() at time zone 'Asia/Bangkok')::date), 'open')
on conflict (day) do nothing;

insert into public.inventory_ledger (
  operating_day, kind, quantity_delta_bags, source_type, source_id, note, created_by
) values (
  ((now() at time zone 'Asia/Bangkok')::date),
  'opening',
  10000,
  'local_seed',
  '44444444-4444-4444-8444-444444444444',
  'Tồn đầu phục vụ E2E cục bộ',
  '22222222-2222-2222-2222-222222222222'
) on conflict (kind, source_type, source_id) do nothing;
