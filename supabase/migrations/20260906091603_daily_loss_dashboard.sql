-- Supabase Dev migration version: 20260906091603
drop view public.daily_dashboard;

create view public.daily_dashboard
with (security_invoker = true)
as
select
  operating_day.day,
  operating_day.status,
  coalesce(sales.wholesale_revenue_vnd, 0)::bigint as wholesale_revenue_vnd,
  coalesce(sales.retail_revenue_vnd, 0)::bigint as retail_revenue_vnd,
  (loss_source.snapshot->>'soldBags')::bigint as sold_bags,
  (loss_source.snapshot->>'producedBags')::bigint as production_bags,
  coalesce(receipt_totals.collected_vnd, 0)::bigint as collected_vnd,
  coalesce(debt.new_debt_vnd, 0)::bigint as new_debt_vnd,
  coalesce(debt.total_debt_vnd, 0)::bigint as total_debt_vnd,
  loss_report.opening_bags,
  case
    when loss_report.id is null then null
    else loss_report.opening_bags + loss_report.produced_bags - loss_report.sold_bags
  end as expected_closing_bags,
  loss_report.closing_bags,
  loss_report.difference_bags,
  loss_report.difference_pct,
  loss_report.classification as loss_classification,
  coalesce(loss_report.requires_review, false) as loss_requires_review,
  loss_report.id is not null
    and loss_report.source_snapshot is distinct from loss_source.snapshot
    as loss_report_stale,
  loss_report.id is not null as loss_report_exists,
  settings.loss_warning_pct,
  (loss_source.snapshot->>'pendingHarvestCount')::integer as pending_harvest_count,
  coalesce(expense.approved_expense_vnd, 0)::bigint as approved_expense_vnd,
  coalesce(expense.pending_expense_vnd, 0)::bigint as pending_expense_vnd,
  coalesce(expense.pending_expense_count, 0)::integer as pending_expense_count,
  coalesce(debt.overdue_debt_vnd, 0)::bigint as overdue_debt_vnd,
  coalesce(previous_day.status = 'open', false) as previous_day_unlocked
from public.operating_days as operating_day
cross join public.settings as settings
cross join lateral (
  select private.daily_loss_source_snapshot(operating_day.day) as snapshot
) as loss_source
left join public.daily_loss_reports as loss_report
  on loss_report.operating_day = operating_day.day
left join lateral (
  select
    sum(sale.total_vnd) filter (where sale.kind = 'wholesale') as wholesale_revenue_vnd,
    sum(sale.total_vnd) filter (where sale.kind = 'retail') as retail_revenue_vnd
  from public.sales as sale
  where sale.operating_day = operating_day.day and sale.status = 'active'
) as sales on true
left join lateral (
  select sum(receipt.amount_vnd) as collected_vnd
  from public.receipts as receipt
  where receipt.operating_day = operating_day.day and receipt.status = 'active'
) as receipt_totals on true
left join lateral (
  select
    sum(receivable.original_amount_vnd) filter (
      where receivable.operating_day = operating_day.day and receivable.status <> 'cancelled'
    ) as new_debt_vnd,
    sum(receivable.outstanding_amount_vnd) filter (
      where receivable.status = 'open'
    ) as total_debt_vnd,
    sum(receivable.outstanding_amount_vnd) filter (
      where receivable.status = 'open' and receivable.due_date < operating_day.day
    ) as overdue_debt_vnd
  from public.receivables as receivable
) as debt on true
left join lateral (
  select
    sum(item.amount_vnd) filter (where item.status = 'approved') as approved_expense_vnd,
    sum(item.amount_vnd) filter (where item.status = 'pending') as pending_expense_vnd,
    count(*) filter (where item.status = 'pending') as pending_expense_count
  from public.expenses as item
  where item.operating_day = operating_day.day
) as expense on true
left join lateral (
  select earlier.status
  from public.operating_days as earlier
  where earlier.day < operating_day.day
  order by earlier.day desc
  limit 1
) as previous_day on true;

revoke all on public.daily_dashboard from public, anon, authenticated;
grant select on public.daily_dashboard to authenticated, service_role;
grant execute on function private.daily_loss_source_snapshot(date)
  to authenticated, service_role;
