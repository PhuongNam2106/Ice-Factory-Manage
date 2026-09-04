create index machine_harvests_run_machine_idx
on public.machine_harvests (machine_run_id, machine_id);

create index production_days_locked_by_idx
on public.production_days (locked_by)
where locked_by is not null;

create index production_days_reopened_by_idx
on public.production_days (reopened_by)
where reopened_by is not null;
