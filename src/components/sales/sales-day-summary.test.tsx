import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { SalesDaySummary } from './sales-day-summary'

afterEach(cleanup)

describe('SalesDaySummary', () => {
  it('shows transaction counts and active revenue by sale kind', () => {
    render(
      <SalesDaySummary
        summary={{
          totalTransactions: 3,
          activeTransactions: 2,
          cancelledTransactions: 1,
          wholesaleRevenueVnd: 140_000,
          retailRevenueVnd: 70_000,
          totalRevenueVnd: 210_000,
        }}
      />,
    )

    expect(screen.getByText('3 giao dịch')).toBeVisible()
    expect(screen.getByText(/1 đã hủy/)).toBeVisible()
    expect(screen.getByText('140.000 đ')).toBeVisible()
    expect(screen.getByText('70.000 đ')).toBeVisible()
    expect(screen.getByText('210.000 đ')).toBeVisible()
    expect(screen.getByText('Chỉ tính giao dịch đang hiệu lực')).toBeVisible()
  })
})
