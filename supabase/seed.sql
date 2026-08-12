insert into public.settings (id) values (true)
on conflict (id) do nothing;
