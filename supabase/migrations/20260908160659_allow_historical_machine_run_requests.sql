alter table public.production_action_requests
drop constraint if exists production_action_requests_operation_check;

alter table public.production_action_requests
add constraint production_action_requests_operation_check
check (operation in (
  'start_machine',
  'record_machine_harvest',
  'stop_machine',
  'set_harvest_quantity',
  'correct_production_action',
  'delete_production_action',
  'add_historical_machine_run'
));
