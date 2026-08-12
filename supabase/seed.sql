insert into public.settings (id) values (true)
on conflict (id) do nothing;

-- Local-only E2E accounts. Their six-digit PIN is not stored as plaintext.
-- Both accounts authenticate with the PIN used in tests/e2e/auth.spec.ts.
insert into auth.users (
  instance_id, id, aud, role, phone, encrypted_password, phone_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', '+84912345678', '$2b$10$nXk5wK5Zhywq./deigg.KOZpKZlERYv7E296EfR0AVoWhXrhVrCim', now(), '{"provider":"phone","providers":["phone"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', '+84912345679', '$2b$10$nXk5wK5Zhywq./deigg.KOZpKZlERYv7E296EfR0AVoWhXrhVrCim', now(), '{"provider":"phone","providers":["phone"]}', '{}', now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, phone, full_name, role, is_active) values
  ('11111111-1111-1111-1111-111111111111', '+84912345678', 'Nhân viên E2E', 'employee', true),
  ('22222222-2222-2222-2222-222222222222', '+84912345679', 'Quản lý E2E', 'manager', true)
on conflict (id) do nothing;
