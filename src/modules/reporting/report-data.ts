import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import type { DailyReportInput } from './excel/daily-report'
import type { DetailCell, DetailColumn } from './excel/detail-reports'
import type { MonthlyReportDay } from './excel/monthly-report'

export type ReportClient = SupabaseClient<Database>
export type ReportKind = 'sales' | 'production' | 'expenses' | 'receivables' | 'inventory' | 'audit'
export type ReportDataset = {
  title: string
  sheetName: string
  columns: DetailColumn[]
  rows: Array<Record<string, DetailCell>>
  reconciliation?: { key: string; expected: number; label: string }
}

function asDate(value: string) {
  return new Date(value.includes('T') ? value : `${value}T12:00:00+07:00`)
}

function fail(error: { message: string } | null, label: string) {
  if (error) throw new Error(`Không thể tải ${label}: ${error.message}`)
}

export async function getLockStatus(client: ReportClient, from: string, to: string) {
  const { data, error } = await client.from('operating_days').select('status').gte('day', from).lte('day', to)
  fail(error, 'trạng thái khóa sổ')
  const rows = data ?? []
  if (!rows.length) return 'open'
  const statuses = new Set(rows.map((row) => row.status))
  return statuses.size === 1 ? rows[0].status : 'mixed'
}

export async function getDailyReportInput(client: ReportClient, day: string): Promise<DailyReportInput['summary']> {
  const { data, error } = await client.from('daily_dashboard').select('*').eq('day', day).maybeSingle()
  fail(error, 'báo cáo ngày')
  return {
    wholesaleVnd: Number(data?.wholesale_revenue_vnd ?? 0),
    retailVnd: Number(data?.retail_revenue_vnd ?? 0),
    approvedExpenseVnd: Number(data?.approved_expense_vnd ?? 0),
    productionBags: Number(data?.production_bags ?? 0),
    soldBags: Number(data?.sold_bags ?? 0),
    collectedVnd: Number(data?.collected_vnd ?? 0),
  }
}

export async function getMonthlyReportDays(client: ReportClient, from: string, to: string): Promise<MonthlyReportDay[]> {
  const { data, error } = await client.from('daily_dashboard').select('*').gte('day', from).lte('day', to).order('day')
  fail(error, 'báo cáo tháng')
  return (data ?? []).map((row) => ({
    day: row.day!, status: row.status!,
    wholesaleVnd: Number(row.wholesale_revenue_vnd ?? 0), retailVnd: Number(row.retail_revenue_vnd ?? 0),
    approvedExpenseVnd: Number(row.approved_expense_vnd ?? 0), productionBags: Number(row.production_bags ?? 0),
    soldBags: Number(row.sold_bags ?? 0),
  }))
}

export async function getDetailReport(client: ReportClient, kind: ReportKind, from: string, to: string): Promise<ReportDataset> {
  if (kind === 'sales') {
    const { data, error } = await client.from('sales').select('id, operating_day, kind, shift_code, total_vnd, paid_now_vnd, payment_method, status, created_at, customers(name), sale_lines(quantity_bags, unit_price_vnd)').gte('operating_day', from).lte('operating_day', to).order('created_at')
    fail(error, 'chi tiết bán hàng')
    const rows = (data ?? []).map((sale) => ({
      day: asDate(sale.operating_day), code: sale.id, kind: sale.kind,
      customer: sale.customers?.name ?? 'Bán lẻ', shift: sale.shift_code,
      quantity: sale.sale_lines.reduce((sum, line) => sum + Number(line.quantity_bags), 0),
      unitPrices: sale.sale_lines.map((line) => Number(line.unit_price_vnd).toLocaleString('vi-VN')).join('; '),
      total: Number(sale.total_vnd), paid: Number(sale.paid_now_vnd), method: sale.payment_method, status: sale.status,
    }))
    return { title: 'CHI TIẾT BÁN HÀNG', sheetName: 'Bán hàng', columns: [
      { key: 'day', label: 'Ngày', kind: 'date' }, { key: 'code', label: 'Mã chứng từ' }, { key: 'kind', label: 'Loại' },
      { key: 'customer', label: 'Khách hàng' }, { key: 'shift', label: 'Ca' }, { key: 'quantity', label: 'Số bao', kind: 'quantity' },
      { key: 'unitPrices', label: 'Đơn giá' }, { key: 'total', label: 'Thành tiền', kind: 'currency' },
      { key: 'paid', label: 'Đã thu', kind: 'currency' }, { key: 'method', label: 'Thanh toán' }, { key: 'status', label: 'Trạng thái' },
    ], rows, reconciliation: { key: 'total', expected: rows.reduce((sum, row) => sum + row.total, 0), label: 'Doanh thu bán hàng' } }
  }

  if (kind === 'production') {
    const [batches, shifts] = await Promise.all([
      client.from('production_batches').select('id, operating_day, shift_code, start_time, end_time, good_bags, rejected_bags, status, machines(name)').gte('operating_day', from).lte('operating_day', to).order('operating_day'),
      client.from('production_shift_totals').select('id, operating_day, shift_code, good_bags, rejected_bags, status, machines(name)').gte('operating_day', from).lte('operating_day', to).order('operating_day'),
    ])
    fail(batches.error, 'mẻ sản xuất'); fail(shifts.error, 'tổng ca sản xuất')
    const rows = [
      ...(batches.data ?? []).map((row) => ({ day: asDate(row.operating_day), source: 'Mẻ', code: row.id, machine: row.machines?.name ?? '', shift: row.shift_code, start: row.start_time, end: row.end_time, good: Number(row.good_bags), rejected: Number(row.rejected_bags), status: row.status })),
      ...(shifts.data ?? []).map((row) => ({ day: asDate(row.operating_day), source: 'Tổng ca', code: row.id, machine: row.machines?.name ?? '', shift: row.shift_code, start: null, end: null, good: Number(row.good_bags), rejected: Number(row.rejected_bags), status: row.status })),
    ]
    return { title: 'SẢN XUẤT THEO NGÀY · MÁY · CA', sheetName: 'Sản xuất', columns: [
      { key: 'day', label: 'Ngày', kind: 'date' }, { key: 'source', label: 'Nguồn' }, { key: 'code', label: 'Mã' },
      { key: 'machine', label: 'Máy' }, { key: 'shift', label: 'Ca' }, { key: 'start', label: 'Bắt đầu' }, { key: 'end', label: 'Kết thúc' },
      { key: 'good', label: 'Bao đạt', kind: 'quantity' }, { key: 'rejected', label: 'Bao hỏng', kind: 'quantity' }, { key: 'status', label: 'Trạng thái' },
    ], rows }
  }

  if (kind === 'expenses') {
    const { data, error } = await client.from('expenses').select('id, operating_day, amount_vnd, payee, note, status, review_reason, expense_categories(name)').gte('operating_day', from).lte('operating_day', to).order('operating_day')
    fail(error, 'chi phí')
    const rows = (data ?? []).map((row) => ({ day: asDate(row.operating_day), code: row.id, category: row.expense_categories?.name ?? '', payee: row.payee, amount: Number(row.amount_vnd), status: row.status, note: row.note, reviewReason: row.review_reason }))
    return { title: 'CHI PHÍ THEO DANH MỤC VÀ TRẠNG THÁI', sheetName: 'Chi phí', columns: [
      { key: 'day', label: 'Ngày', kind: 'date' }, { key: 'code', label: 'Mã' }, { key: 'category', label: 'Danh mục' },
      { key: 'payee', label: 'Người nhận' }, { key: 'amount', label: 'Số tiền', kind: 'currency' }, { key: 'status', label: 'Trạng thái' },
      { key: 'note', label: 'Ghi chú' }, { key: 'reviewReason', label: 'Lý do duyệt/từ chối' },
    ], rows }
  }

  if (kind === 'receivables') {
    const [debts, receipts] = await Promise.all([
      client.from('receivables').select('id, operating_day, due_date, original_amount_vnd, outstanding_amount_vnd, status, customers(name)').gte('operating_day', from).lte('operating_day', to).order('due_date'),
      client.from('receipts').select('id, operating_day, amount_vnd, payment_method, status, customers(name)').gte('operating_day', from).lte('operating_day', to).order('operating_day'),
    ])
    fail(debts.error, 'công nợ'); fail(receipts.error, 'lịch sử thanh toán')
    const debtRows = (debts.data ?? []).map((row) => ({ day: asDate(row.operating_day), type: 'Khoản nợ', code: row.id, customer: row.customers?.name ?? '', due: asDate(row.due_date), original: Number(row.original_amount_vnd), outstanding: Number(row.outstanding_amount_vnd), paid: null, method: null, status: row.status }))
    const receiptRows = (receipts.data ?? []).map((row) => ({ day: asDate(row.operating_day), type: 'Thanh toán', code: row.id, customer: row.customers?.name ?? '', due: null, original: null, outstanding: null, paid: Number(row.amount_vnd), method: row.payment_method, status: row.status }))
    return { title: 'TUỔI NỢ VÀ LỊCH SỬ THANH TOÁN', sheetName: 'Công nợ', columns: [
      { key: 'day', label: 'Ngày', kind: 'date' }, { key: 'type', label: 'Loại dòng' }, { key: 'code', label: 'Mã' }, { key: 'customer', label: 'Khách hàng' },
      { key: 'due', label: 'Hạn trả', kind: 'date' }, { key: 'original', label: 'Nợ gốc', kind: 'currency' },
      { key: 'outstanding', label: 'Còn nợ', kind: 'currency' }, { key: 'paid', label: 'Đã trả', kind: 'currency' },
      { key: 'method', label: 'Phương thức' }, { key: 'status', label: 'Trạng thái' },
    ], rows: [...debtRows, ...receiptRows] }
  }

  if (kind === 'inventory') {
    const { data, error } = await client.from('inventory_ledger').select('id, operating_day, kind, quantity_delta_bags, source_type, source_id, reversal_of_id, note, created_at').gte('operating_day', from).lte('operating_day', to).order('created_at')
    fail(error, 'sổ kho')
    return { title: 'SỔ KHO THÀNH PHẨM', sheetName: 'Sổ kho', columns: [
      { key: 'day', label: 'Ngày', kind: 'date' }, { key: 'created', label: 'Thời điểm', kind: 'date' }, { key: 'code', label: 'Mã dòng' },
      { key: 'kind', label: 'Loại' }, { key: 'quantity', label: 'Biến động bao', kind: 'quantity' }, { key: 'sourceType', label: 'Nguồn' },
      { key: 'sourceId', label: 'Mã nguồn' }, { key: 'reversal', label: 'Đảo của dòng' }, { key: 'note', label: 'Ghi chú' },
    ], rows: (data ?? []).map((row) => ({ day: asDate(row.operating_day), created: asDate(row.created_at), code: row.id, kind: row.kind, quantity: Number(row.quantity_delta_bags), sourceType: row.source_type, sourceId: row.source_id, reversal: row.reversal_of_id, note: row.note })) }
  }

  const { data, error } = await client.from('audit_log').select('id, created_at, actor_id, entity_type, entity_id, action, reason, before_data, after_data').gte('created_at', `${from}T00:00:00+07:00`).lte('created_at', `${to}T23:59:59.999+07:00`).order('created_at')
  fail(error, 'nhật ký kiểm toán')
  return { title: 'NHẬT KÝ KIỂM TOÁN', sheetName: 'Audit', columns: [
    { key: 'created', label: 'Thời điểm', kind: 'date' }, { key: 'code', label: 'Mã log' }, { key: 'actor', label: 'Người thực hiện' },
    { key: 'entityType', label: 'Loại dữ liệu' }, { key: 'entityId', label: 'Mã dữ liệu' }, { key: 'action', label: 'Hành động' },
    { key: 'reason', label: 'Lý do' }, { key: 'before', label: 'Trước' }, { key: 'after', label: 'Sau' },
  ], rows: (data ?? []).map((row) => ({ created: asDate(row.created_at), code: row.id, actor: row.actor_id, entityType: row.entity_type, entityId: row.entity_id, action: row.action, reason: row.reason, before: JSON.stringify(row.before_data), after: JSON.stringify(row.after_data) })) }
}

const backupTables = ['profiles', 'customers', 'machines', 'settings', 'operating_days', 'sales', 'sale_lines', 'receivables', 'receipts', 'receipt_allocations', 'production_batches', 'production_shift_totals', 'production_source_selections', 'inventory_ledger', 'stock_counts', 'expense_categories', 'expenses', 'expense_attachments', 'audit_log'] as const

export async function getBackupTables(client: ReportClient) {
  const tables = []
  for (const name of backupTables) {
    const rows: Array<Record<string, unknown>> = []
    for (let start = 0; ; start += 1000) {
      const { data, error } = await client.from(name).select('*').range(start, start + 999)
      fail(error, `bảng ${name}`)
      const page = data ?? []
      rows.push(...page.map((row) => ({ ...row })))
      if (page.length < 1000) break
    }
    tables.push({ name, rows })
  }
  return tables
}
