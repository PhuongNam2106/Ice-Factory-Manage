create function private.link_legacy_production_reversal()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.kind = 'reversal'
    and new.reversal_of_id is null
    and new.source_type = 'production_reversal' then
    new.reversal_of_id := new.source_id;
  end if;

  return new;
end;
$$;

create trigger inventory_ledger_link_legacy_production_reversal
before insert on public.inventory_ledger
for each row execute function private.link_legacy_production_reversal();

revoke all on function private.link_legacy_production_reversal()
from public, anon, authenticated, service_role;
