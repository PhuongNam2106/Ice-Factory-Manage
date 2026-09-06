import { describe, expect, it, vi } from 'vitest'
import {
  confirmDailyLossWarning,
  getDailyLossReport,
  saveDailyLoss,
} from './service'

const report = {
  id: '2aa6210c-fdb6-4ec4-a9e7-df9a63f41381',
  operatingDay: '2026-09-05',
  openingBags: 100,
  producedBags: 500,
  soldBags: 450,
  expectedClosingBags: 150,
  closingBags: 140,
  differenceBags: 10,
  differencePct: '2.000',
  classification: 'loss',
  warningPct: '5.00',
  requiresReview: false,
  warningConfirmedAt: null,
  version: 1,
  isStale: false,
  pendingHarvestCount: 0,
  previousDayReady: true,
  canFinalize: true,
  status: 'open',
  note: null,
}

describe('loss service', () => {
  it('rejects invalid bag counts before calling Supabase', async () => {
    const rpc = vi.fn()
    const result = await saveDailyLoss({
      operatingDay: '2026-09-05',
      closingBags: -1,
      idempotencyKey: '10d47ba2-a319-48be-804f-fae39f892bbb',
    }, { rpc } as never)
    expect(result).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } })
    expect(rpc).not.toHaveBeenCalled()
  })

  it.each([
    ['VERSION_CONFLICT', 'vừa được người khác cập nhật'],
    ['DAY_LOCKED', 'đã khóa'],
    ['PREVIOUS_DAY_NOT_READY', 'Ngày trước chưa khóa'],
    ['LOSS_REPORT_STALE', 'đã thay đổi'],
    ['PENDING_HARVEST_QUANTITY', 'chưa nhập số bao'],
    ['FORBIDDEN', 'không có quyền'],
  ])('maps %s to an explanatory Vietnamese message', async (databaseError, expectedText) => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: databaseError } })
    const result = await getDailyLossReport('2026-09-05', { rpc } as never)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.message).toContain(expectedText)
  })

  it('rejects a malformed RPC response', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { operatingDay: 'broken' }, error: null })
    const result = await getDailyLossReport('2026-09-05', { rpc } as never)
    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_SERVER_RESPONSE' } })
  })

  it('parses a successful report response', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: report, error: null })
    const result = await getDailyLossReport('2026-09-05', { rpc } as never)
    expect(result).toMatchObject({ ok: true, data: report })
  })

  it('validates manager warning confirmation input', async () => {
    const rpc = vi.fn()
    const result = await confirmDailyLossWarning({ reportId: 'bad', expectedVersion: 0 }, { rpc } as never)
    expect(result).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } })
    expect(rpc).not.toHaveBeenCalled()
  })
})
