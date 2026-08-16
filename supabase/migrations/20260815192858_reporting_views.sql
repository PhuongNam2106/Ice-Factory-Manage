create view public.daily_dashboard
with (security_invoker = true)
as
select
  od.day,
  od.status,
  coalesce(s.wholesale_revenue_vnd, 0)::bigint as wholesale_revenue_vnd,
  coalesce(s.retail_revenue_vnd, 0)::bigint as retail_revenue_vnd,
  coalesce(s.sold_bags, 0)::bigint as sold_bags,
  coalesce(p.production_bags, 0)::bigint as production_bags,
  coalesce(r.collected_vnd, 0)::bigint as collected_vnd,
  coalesce(d.new_debt_vnd, 0)::bigint as new_debt_vnd,
  coalesce(d.total_debt_vnd, 0)::bigint as total_debt_vnd,
  coalesce(i.opening_stock_bags, 0)::bigint as opening_stock_bags,
  coalesce(i.stock_balance_bags, 0)::bigint as stock_balance_bags,
  sc.expected_bags as stock_expected_bags,
  sc.actual_bags as stock_actual_bags,
  sc.variance_bags as stock_variance_bags,
  sc.variance_pct as stock_variance_pct,
  settings.stock_variance_warning_pct as stock_warning_pct,
  coalesce(e.approved_expense_vnd, 0)::bigint as approved_expense_vnd,
  coalesce(e.pending_expense_vnd, 0)::bigint as pending_expense_vnd,
  coalesce(e.pending_expense_count, 0)::integer as pending_expense_count,
  coalesce(d.overdue_debt_vnd, 0)::bigint as overdue_debt_vnd,
  coalesce(p.production_mismatch_count, 0)::integer as production_mismatch_count,
  coalesce(previous_day.status = 'open', false) as previous_day_unlocked
from public.operating_days od
cross join public.settings settings
left join lateral (
  select
    (select sum(sale.total_vnd) from public.sales sale
      where sale.operating_day = od.day and sale.status = 'active' and sale.kind = 'wholesale') as wholesale_revenue_vnd,
    (select sum(sale.total_vnd) from public.sales sale
      where sale.operating_day = od.day and sale.status = 'active' and sale.kind = 'retail') as retail_revenue_vnd,
    (select sum(lines.quantity_bags) from public.sale_lines lines
      join public.sales sale on sale.id = lines.sale_id
      where sale.operating_day = od.day and sale.status = 'active') as sold_bags
) s on true
left join lateral (
  select
    sum(selection.official_quantity_bags) as production_bags,
    count(*) filter (where not selection.is_confirmed) as production_mismatch_count
  from public.production_source_selections selection
  where selection.operating_day = od.day
) p on true
left join lateral (
  select sum(receipt.amount_vnd) as collected_vnd
  from public.receipts receipt
  where receipt.operating_day = od.day and receipt.status = 'active'
) r on true
left join lateral (
  select
    sum(receivable.original_amount_vnd) filter (where receivable.operating_day = od.day and receivable.status <> 'cancelled') as new_debt_vnd,
    sum(receivable.outstanding_amount_vnd) filter (where receivable.status = 'open') as total_debt_vnd,
    sum(receivable.outstanding_amount_vnd) filter (where receivable.status = 'open' and receivable.due_date < od.day) as overdue_debt_vnd
  from public.receivables receivable
) d on true
left join lateral (
  select
    sum(ledger.quantity_delta_bags) filter (where ledger.operating_day < od.day) as opening_stock_bags,
    sum(ledger.quantity_delta_bags) filter (where ledger.operating_day <= od.day) as stock_balance_bags
  from public.inventory_ledger ledger
) i on true
left join lateral (
  select count.expected_bags, count.actual_bags, count.variance_bags, count.variance_pct
  from public.stock_counts count
  where count.operating_day = od.day
  order by count.created_at desc
  limit 1
) sc on true
left join lateral (
  select
    sum(expense.amount_vnd) filter (where expense.status = 'approved') as approved_expense_vnd,
    sum(expense.amount_vnd) filter (where expense.status = 'pending') as pending_expense_vnd,
    count(*) filter (where expense.status = 'pending') as pending_expense_count
  from public.expenses expense
  where expense.operating_day = od.day
) e on true
left join lateral (
  select earlier.status
  from public.operating_days earlier
  where earlier.day < od.day
  order by earlier.day desc
  limit 1
) previous_day on true;

revoke all on public.daily_dashboard from public, anon, authenticated;
grant select on public.daily_dashboard to authenticated, service_role;
