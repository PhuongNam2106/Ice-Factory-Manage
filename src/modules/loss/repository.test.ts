import { describe, expect, it, vi } from 'vitest'
import {
  confirmDailyLossWarningRecord,
  getDailyLossReportRecord,
  saveDailyLossRecord,
} from './repository'

describe('loss repository', () => {
  it('calls the read RPC with the selected operating day', () => {
    const rpc = vi.fn().mockReturnValue('request')
    expect(getDailyLossReportRecord({ rpc } as never, '2026-09-05')).toBe('request')
    expect(rpc).toHaveBeenCalledWith('get_daily_loss_report', { p_day: '2026-09-05' })
  })

  it('does not send the idempotency key inside the report payload', () => {
    const rpc = vi.fn().mockReturnValue('request')
    saveDailyLossRecord({ rpc } as never, {
      operatingDay: '2026-09-05',
      openingBags: 100,
      closingBags: 140,
      note: null,
      expectedVersion: 2,
      idempotencyKey: '10d47ba2-a319-48be-804f-fae39f892bbb',
    })
    expect(rpc).toHaveBeenCalledWith('save_daily_loss_report', {
      p_input: {
        operatingDay: '2026-09-05',
        openingBags: 100,
        closingBags: 140,
        note: null,
        expectedVersion: 2,
      },
      p_idempotency_key: '10d47ba2-a319-48be-804f-fae39f892bbb',
    })
  })

  it('calls the manager confirmation RPC with optimistic versioning', () => {
    const rpc = vi.fn().mockReturnValue('request')
    confirmDailyLossWarningRecord({ rpc } as never, {
      reportId: '2aa6210c-fdb6-4ec4-a9e7-df9a63f41381',
      expectedVersion: 3,
    })
    expect(rpc).toHaveBeenCalledWith('confirm_daily_loss_warning', {
      p_report_id: '2aa6210c-fdb6-4ec4-a9e7-df9a63f41381',
      p_expected_version: 3,
    })
  })
})
