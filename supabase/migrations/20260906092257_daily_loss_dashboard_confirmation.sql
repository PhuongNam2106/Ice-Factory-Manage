-- Keep the dashboard review state aligned with manager confirmation.
alter view public.daily_dashboard set schema private;
alter view private.daily_dashboard rename to daily_dashboard_source;

create view public.daily_dashboard
with (security_invoker = true)
as
select
  source.day,
  source.status,
  source.wholesale_revenue_vnd,
  source.retail_revenue_vnd,
  source.sold_bags,
  source.production_bags,
  source.collected_vnd,
  source.new_debt_vnd,
  source.total_debt_vnd,
  source.opening_bags,
  source.expected_closing_bags,
  source.closing_bags,
  source.difference_bags,
  source.difference_pct,
  source.loss_classification,
  coalesce(source.loss_requires_review and report.warning_confirmed_at is null, false)
    as loss_requires_review,
  source.loss_report_stale,
  source.loss_report_exists,
  source.loss_warning_pct,
  source.pending_harvest_count,
  source.approved_expense_vnd,
  source.pending_expense_vnd,
  source.pending_expense_count,
  source.overdue_debt_vnd,
  source.previous_day_unlocked
from private.daily_dashboard_source as source
left join public.daily_loss_reports as report on report.operating_day = source.day;

revoke all on private.daily_dashboard_source from public, anon, authenticated;
grant select on private.daily_dashboard_source to authenticated, service_role;
revoke all on public.daily_dashboard from public, anon, authenticated;
grant select on public.daily_dashboard to authenticated, service_role;
