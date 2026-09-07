import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { LossDayNavigator } from './loss-day-navigator'

afterEach(cleanup)

describe('LossDayNavigator', () => {
  it('lets users choose a valid day and open unfinished days', () => {
    render(
      <LossDayNavigator
        currentDay="2026-09-06"
        days={[
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
        ]}
        firstOperatingDay="2026-09-05"
        selectedDay="2026-09-06"
      />,
    )

    const picker = screen.getByLabelText('Chọn ngày vận hành')
    expect(picker).toHaveAttribute('min', '2026-09-05')
    expect(picker).toHaveAttribute('max', '2026-09-06')
    expect(picker).toHaveValue('2026-09-06')

    const firstDayLink = screen.getByRole('link', { name: /Mở ngày 2026-09-05/ })
    expect(firstDayLink).toHaveAttribute('href', '/loss?day=2026-09-05')
    expect(within(firstDayLink).getByText('Chưa nhập tồn cuối')).toBeInTheDocument()

    const currentDayLink = screen.getByRole('link', { name: /Mở ngày 2026-09-06/ })
    expect(within(currentDayLink).getByText('Số liệu đã thay đổi')).toBeInTheDocument()
    expect(within(currentDayLink).getByText('2 lần xả chưa nhập số bao')).toBeInTheDocument()
  })
})
