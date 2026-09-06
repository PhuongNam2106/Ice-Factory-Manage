import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { DailyLossReport } from '@/modules/loss/types'
import { LossSummary } from './loss-summary'

afterEach(cleanup)

const baseReport: DailyLossReport = {
  id: '11111111-1111-4111-8111-111111111111',
  operatingDay: '2026-09-05',
  openingBags: 100,
  producedBags: 500,
  soldBags: 200,
  expectedClosingBags: 400,
  closingBags: 390,
  differenceBags: 10,
  differencePct: '2.000',
  classification: 'loss',
  warningPct: '5.000',
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

describe('LossSummary', () => {
  it('shows an explicit loss result and percentage', () => {
    render(<LossSummary report={baseReport} />)
    expect(screen.getByText('Hao hụt 10 bao')).toBeInTheDocument()
    expect(screen.getByText('Tỷ lệ 2%')).toBeInTheDocument()
  })

  it('shows surplus independently from color', () => {
    render(<LossSummary report={{ ...baseReport, differenceBags: -5, differencePct: '1.000', classification: 'surplus' }} />)
    expect(screen.getByText('Dư kho 5 bao')).toBeInTheDocument()
  })

  it('explains when a percentage cannot be calculated', () => {
    render(<LossSummary report={{ ...baseReport, producedBags: 0, differencePct: null, classification: 'no_production' }} />)
    expect(screen.getByText('Không thể tính tỷ lệ vì chưa có sản lượng')).toBeInTheDocument()
  })

  it('warns when source data changed', () => {
    render(<LossSummary report={{ ...baseReport, isStale: true }} />)
    expect(screen.getByText('Số liệu đã thay đổi')).toBeInTheDocument()
  })
})
