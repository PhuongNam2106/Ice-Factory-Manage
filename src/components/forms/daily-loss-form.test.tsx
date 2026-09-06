import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DailyLossReport } from '@/modules/loss/types'
import { DailyLossForm } from './daily-loss-form'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@/modules/loss/actions', () => ({ saveDailyLossAction: vi.fn() }))

afterEach(cleanup)

const report: DailyLossReport = {
  id: null,
  operatingDay: '2026-09-05',
  openingBags: null,
  producedBags: 500,
  soldBags: 200,
  expectedClosingBags: null,
  closingBags: null,
  differenceBags: null,
  differencePct: null,
  classification: null,
  warningPct: '5.000',
  requiresReview: false,
  warningConfirmedAt: null,
  version: null,
  isStale: false,
  pendingHarvestCount: 0,
  previousDayReady: true,
  canFinalize: true,
  status: 'open',
  note: null,
}

describe('DailyLossForm', () => {
  it('asks for opening stock only on the first configured day', () => {
    render(<DailyLossForm report={report} />)
    expect(screen.getByLabelText('Tồn đầu ngày')).toBeRequired()
    expect(screen.getByLabelText('Tồn cuối thực tế')).toBeRequired()
  })

  it('disables submission and explains a locked day', () => {
    render(<DailyLossForm report={{ ...report, status: 'locked' }} />)
    expect(screen.getByRole('button', { name: 'Ngày đã khóa' })).toBeDisabled()
    expect(screen.getByText('Ngày vận hành đã khóa nên không thể chỉnh sửa.')).toBeInTheDocument()
  })

  it('does not allow saving while harvest quantities are missing', () => {
    render(<DailyLossForm report={{ ...report, openingBags: 100, pendingHarvestCount: 2, canFinalize: false }} />)
    expect(screen.getByRole('button', { name: 'Chưa thể lưu đối soát' })).toBeDisabled()
    expect(screen.getByText('Còn 2 lần xả đá chưa nhập số bao.')).toBeInTheDocument()
  })
})
