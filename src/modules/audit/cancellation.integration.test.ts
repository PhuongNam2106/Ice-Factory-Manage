import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/lib/supabase/database.types'
import { usernameToAuthEmail } from '@/modules/auth/schema'

function isLocalUrl(url?: string) {
  if (!url) return false
  try { return ['127.0.0.1', 'localhost', '0.0.0.0'].includes(new URL(url).hostname) } catch { return false }
}

const canRun = Boolean(
  process.env.RUN_SUPABASE_INTEGRATION === 'true' &&
  isLocalUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.SUPABASE_TEST_EMPLOYEE_PASSWORD,
)

describe('safe cancellation integration', () => {
  if (!canRun) {
    it.skip('requires an isolated local Supabase reset', () => {})
    return
  }

  it('reverses sale, receipt and expense effects with version and ownership checks', async () => {
    const { adminClient } = await import('@/lib/supabase/admin')
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    const password = process.env.SUPABASE_TEST_EMPLOYEE_PASSWORD!
    const employee = createClient<Database>(url, key, { auth: { persistSession: false } })
    const manager = createClient<Database>(url, key, { auth: { persistSession: false } })
    const day = `2193-${String((Date.now() % 12) + 1).padStart(2, '0')}-${String((Date.now() % 27) + 1).padStart(2, '0')}`
    const employeeId = '11111111-1111-1111-1111-111111111111'
    let customerId: string | null = null

    expect((await employee.auth.signInWithPassword({ email: usernameToAuthEmail('nhanvien'), password })).error).toBeNull()
    expect((await manager.auth.signInWithPassword({ email: usernameToAuthEmail('quanly'), password })).error).toBeNull()

    try {
      await adminClient.from('operating_days').upsert({ day }, { onConflict: 'day' })
      const customer = await adminClient.from('customers').insert({ name: `Khách hủy ${day}`, created_by: employeeId }).select('id').single()
      expect(customer.error).toBeNull(); customerId = customer.data!.id
      await adminClient.from('inventory_ledger').insert({ operating_day: day, kind: 'opening', quantity_delta_bags: 100, source_type: 'cancellation_fixture', source_id: crypto.randomUUID(), created_by: employeeId })

      const sale = await employee.rpc('create_sale', { p_input: {
        kind: 'wholesale', operatingDay: day, customerId,
        lines: [{ quantityBags: 10, unitPriceVnd: 10_000 }], paidNowVnd: 0, paymentMethod: 'cash',
      }, p_idempotency_key: crypto.randomUUID() })
      expect(sale.error).toBeNull()
      const saleId = (sale.data as { saleId: string }).saleId

      const stale = await employee.rpc('cancel_document', { p_entity_type: 'sale', p_entity_id: saleId, p_expected_version: 2, p_reason: 'Kiểm tra version cũ' })
      expect(stale.error?.message).toContain('VERSION_CONFLICT')
      const cancelledSale = await employee.rpc('cancel_document', { p_entity_type: 'sale', p_entity_id: saleId, p_expected_version: 1, p_reason: 'Khách hủy đơn giao đá' })
      expect(cancelledSale.error).toBeNull()

      const [saleRow, debt, movements, saleAudit] = await Promise.all([
        adminClient.from('sales').select('status, version').eq('id', saleId).single(),
        adminClient.from('receivables').select('status, outstanding_amount_vnd').eq('sale_id', saleId).single(),
        adminClient.from('inventory_ledger').select('quantity_delta_bags').eq('source_id', saleId),
        adminClient.from('audit_log').select('id').eq('entity_id', saleId).eq('action', 'sale.cancelled'),
      ])
      expect(saleRow.data).toMatchObject({ status: 'cancelled', version: 2 })
      expect(debt.data).toMatchObject({ status: 'cancelled', outstanding_amount_vnd: 0 })
      expect(movements.data?.reduce((sum, row) => sum + Number(row.quantity_delta_bags), 0)).toBe(0)
      expect(saleAudit.data).toHaveLength(1)

      const secondSale = await employee.rpc('create_sale', { p_input: {
        kind: 'wholesale', operatingDay: day, customerId,
        lines: [{ quantityBags: 5, unitPriceVnd: 10_000 }], paidNowVnd: 0, paymentMethod: 'cash',
      }, p_idempotency_key: crypto.randomUUID() })
      const secondSaleId = (secondSale.data as { saleId: string }).saleId
      const secondDebt = await adminClient.from('receivables').select('id').eq('sale_id', secondSaleId).single()
      const receipt = await employee.rpc('record_receipt', { p_input: {
        customerId, operatingDay: day, amountVnd: 20_000, paymentMethod: 'cash',
        allocations: [{ receivableId: secondDebt.data!.id, amountVnd: 20_000 }],
      }, p_idempotency_key: crypto.randomUUID() })
      const receiptId = (receipt.data as { receiptId: string }).receiptId
      const blockedSale = await employee.rpc('cancel_document', { p_entity_type: 'sale', p_entity_id: secondSaleId, p_expected_version: 1, p_reason: 'Thử hủy khi đã thu nợ' })
      expect(blockedSale.error?.message).toContain('INVALID_STATE')
      expect((await employee.rpc('cancel_document', { p_entity_type: 'receipt', p_entity_id: receiptId, p_expected_version: 1, p_reason: 'Ghi nhận nhầm khoản thu' })).error).toBeNull()
      expect((await adminClient.from('receivables').select('outstanding_amount_vnd').eq('id', secondDebt.data!.id).single()).data?.outstanding_amount_vnd).toBe(50_000)

      const category = await adminClient.from('expense_categories').select('id').eq('code', 'electricity').single()
      const expense = await manager.rpc('create_expense', { p_input: { operatingDay: day, categoryId: category.data!.id, amountVnd: 250_000, payee: 'Điện lực' }, p_idempotency_key: crypto.randomUUID() })
      const expenseId = (expense.data as { expenseId: string }).expenseId
      expect((await manager.rpc('review_expense', { p_expense_id: expenseId, p_decision: 'approved' })).error).toBeNull()
      const forbidden = await employee.rpc('cancel_document', { p_entity_type: 'expense', p_entity_id: expenseId, p_expected_version: 2, p_reason: 'Nhân viên thử hủy chi quản lý' })
      expect(forbidden.error?.message).toContain('FORBIDDEN')
      const nullType = await manager.rpc('cancel_document', {
        p_entity_type: null, p_entity_id: expenseId, p_expected_version: 2, p_reason: 'Dữ liệu loại chứng từ bị thiếu',
      } as never)
      expect(nullType.error).toBeNull()
      expect(nullType.data).toBeNull()
      expect((await adminClient.from('expenses').select('status').eq('id', expenseId).single()).data?.status).toBe('approved')
      expect((await manager.rpc('cancel_document', { p_entity_type: 'expense', p_entity_id: expenseId, p_expected_version: 2, p_reason: 'Hóa đơn chi bị lập trùng' })).error).toBeNull()
      const dashboard = await adminClient.from('daily_dashboard').select('approved_expense_vnd').eq('day', day).single()
      expect(Number(dashboard.data?.approved_expense_vnd)).toBe(0)
    } finally {
      await employee.auth.signOut(); await manager.auth.signOut()
      await adminClient.from('expense_attachments').delete().in('expense_id', (await adminClient.from('expenses').select('id').eq('operating_day', day)).data?.map((row) => row.id) ?? [])
      await adminClient.from('expenses').delete().eq('operating_day', day)
      await adminClient.from('receipt_allocations').delete().in('receipt_id', (await adminClient.from('receipts').select('id').eq('operating_day', day)).data?.map((row) => row.id) ?? [])
      await adminClient.from('receipts').delete().eq('operating_day', day)
      await adminClient.from('receivables').delete().eq('operating_day', day)
      await adminClient.from('sale_lines').delete().in('sale_id', (await adminClient.from('sales').select('id').eq('operating_day', day)).data?.map((row) => row.id) ?? [])
      await adminClient.from('sales').delete().eq('operating_day', day)
      await adminClient.from('inventory_ledger').delete().eq('operating_day', day)
      if (customerId) await adminClient.from('customers').delete().eq('id', customerId)
      await adminClient.from('operating_days').delete().eq('day', day)
    }
  }, 45_000)
})
