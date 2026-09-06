import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/lib/supabase/database.types'
import { usernameToAuthEmail } from '@/modules/auth/schema'

function isLocalUrl(url?: string) {
  if (!url) return false
  try {
    return ['127.0.0.1', 'localhost', '0.0.0.0'].includes(new URL(url).hostname)
  } catch {
    return false
  }
}

const canRun = Boolean(
  process.env.RUN_SUPABASE_INTEGRATION === 'true' &&
    isLocalUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_TEST_EMPLOYEE_PASSWORD,
)

describe('expense workflow integration', () => {
  if (!canRun) {
    it.skip('requires an isolated local Supabase reset', () => {})
    return
  }

  it('creates idempotently, keeps receipts private, and allows one manager review', async () => {
    const { adminClient } = await import('@/lib/supabase/admin')
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    const password = process.env.SUPABASE_TEST_EMPLOYEE_PASSWORD!
    const clientOptions = {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    }
    const employee = createClient<Database>(url, publishableKey, clientOptions)
    const manager = createClient<Database>(url, publishableKey, clientOptions)
    const anonymous = createClient<Database>(url, publishableKey, clientOptions)
    const day = `2195-${String((Date.now() % 12) + 1).padStart(2, '0')}-${String((Date.now() % 27) + 1).padStart(2, '0')}`
    const idempotencyKey = crypto.randomUUID()

    expect((await employee.auth.signInWithPassword({
      email: usernameToAuthEmail('nhanvien'),
      password,
    })).error).toBeNull()
    expect((await manager.auth.signInWithPassword({
      email: usernameToAuthEmail('quanly'),
      password,
    })).error).toBeNull()

    try {
      await adminClient.from('settings').update({
        operating_day_cutover_at: '2026-09-05T13:00:00.000Z',
      }).eq('id', true)
      await adminClient.from('operating_days').upsert({ day }, { onConflict: 'day' })
      const { data: category, error: categoryError } = await adminClient
        .from('expense_categories')
        .select('id')
        .eq('code', 'electricity')
        .single()
      expect(categoryError).toBeNull()

      const input = {
        occurredAt: `${day}T13:00:00.000Z`,
        categoryId: category!.id,
        amountVnd: 250_000,
        payee: 'Điện lực',
        note: 'Chi phí integration',
      }
      const first = await employee.rpc('create_expense', {
        p_input: input,
        p_idempotency_key: idempotencyKey,
      })
      const repeated = await employee.rpc('create_expense', {
        p_input: input,
        p_idempotency_key: idempotencyKey,
      })
      expect(first.error).toBeNull()
      expect(repeated.data).toEqual(first.data)
      const expenseId = (first.data as { expenseId: string }).expenseId

      const objectPath = `${day}/${expenseId}/${crypto.randomUUID()}.png`
      const signedUpload = await employee.storage
        .from('expense-receipts')
        .createSignedUploadUrl(objectPath)
      expect(signedUpload.error).toBeNull()
      const file = new Uint8Array([137, 80, 78, 71]).buffer
      const uploaded = await employee.storage
        .from('expense-receipts')
        .uploadToSignedUrl(objectPath, signedUpload.data!.token, file, { contentType: 'image/png' })
      expect(uploaded.error).toBeNull()
      const finalized = await employee.rpc('finalize_expense_attachment', {
        p_expense_id: expenseId,
        p_object_path: objectPath,
        p_original_name: 'hoa-don.png',
        p_content_type: 'image/png',
        p_size_bytes: file.byteLength,
      })
      expect(finalized.error).toBeNull()
      expect((await employee.storage.from('expense-receipts').createSignedUrl(objectPath, 300)).error).toBeNull()
      expect((await anonymous.storage.from('expense-receipts').download(objectPath)).error).not.toBeNull()

      const forbidden = await employee.rpc('review_expense', {
        p_expense_id: expenseId,
        p_decision: 'approved',
      })
      expect(forbidden.error?.message).toContain('FORBIDDEN')

      const approved = await manager.rpc('review_expense', {
        p_expense_id: expenseId,
        p_decision: 'approved',
      })
      expect(approved.error).toBeNull()
      const { data: afterFirstReview } = await adminClient
        .from('expenses')
        .select('status, reviewed_by, reviewed_at')
        .eq('id', expenseId)
        .single()
      expect(afterFirstReview?.status).toBe('approved')

      const duplicateReview = await manager.rpc('review_expense', {
        p_expense_id: expenseId,
        p_decision: 'rejected',
        p_reason: 'Không được ghi đè',
      })
      expect(duplicateReview.error?.message).toContain('INVALID_STATE')
      const { data: afterSecondReview } = await adminClient
        .from('expenses')
        .select('status, reviewed_by, reviewed_at')
        .eq('id', expenseId)
        .single()
      expect(afterSecondReview).toEqual(afterFirstReview)
    } finally {
      await Promise.all([employee.auth.signOut(), manager.auth.signOut()])
      await adminClient.from('settings').update({ operating_day_cutover_at: null }).eq('id', true)
    }
  }, 45_000)
})
