import { describe, expect, it, vi } from 'vitest'
import {
  confirmDailyLossWarningRecord,
  getDailyLossReportRecord,
  saveDailyLossRecord,
} from './repository'
import * as lossRepository from './repository'

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

  it('lists unfinished operating days from the configured cutover through today', async () => {
    const settingsRequest = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { operating_day_cutover_at: '2026-09-05T13:00:00.000Z' },
        error: null,
      }),
    }
    const daysRequest = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            day: '2026-09-05',
            status: 'open',
            loss_report_exists: false,
            loss_report_stale: false,
            loss_requires_review: false,
            pending_harvest_count: 0,
          },
          {
            day: '2026-09-06',
            status: 'open',
            loss_report_exists: true,
            loss_report_stale: true,
            loss_requires_review: false,
            pending_harvest_count: 2,
          },
        ],
        error: null,
      }),
    }
    const from = vi.fn((table: string) => table === 'settings' ? settingsRequest : daysRequest)
    const listIncompleteLossDays = (
      lossRepository as typeof lossRepository & {
        listIncompleteLossDays?: (client: never, currentDay: string) => Promise<unknown>
      }
    ).listIncompleteLossDays

    expect(listIncompleteLossDays).toBeTypeOf('function')
    if (!listIncompleteLossDays) return

    await expect(listIncompleteLossDays({ from } as never, '2026-09-06')).resolves.toEqual({
      firstOperatingDay: '2026-09-05',
      days: [
        {
          operatingDay: '2026-09-05',
          hasReport: false,
          isStale: false,
          requiresReview: false,
          pendingHarvestCount: 0,
        },
        {
          operatingDay: '2026-09-06',
          hasReport: true,
          isStale: true,
          requiresReview: false,
          pendingHarvestCount: 2,
        },
      ],
    })
  })

  it('adds a missing current day and excludes days that are already locked', async () => {
    const settingsRequest = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { operating_day_cutover_at: '2026-09-05T13:00:00.000Z' },
        error: null,
      }),
    }
    const daysRequest = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [{
          day: '2026-09-05',
          status: 'locked',
          loss_report_exists: true,
          loss_report_stale: false,
          loss_requires_review: false,
          pending_harvest_count: 0,
        }],
        error: null,
      }),
    }
    const from = vi.fn((table: string) => table === 'settings' ? settingsRequest : daysRequest)

    await expect(lossRepository.listIncompleteLossDays({ from } as never, '2026-09-06')).resolves.toEqual({
      firstOperatingDay: '2026-09-05',
      days: [{
        operatingDay: '2026-09-06',
        hasReport: false,
        isStale: false,
        requiresReview: false,
        pendingHarvestCount: 0,
      }],
    })
  })
})
