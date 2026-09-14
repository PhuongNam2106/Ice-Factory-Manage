import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { SalesDayNavigator } from './sales-day-navigator'

afterEach(cleanup)

describe('SalesDayNavigator', () => {
  it('resets an edited date when navigation selects another operating day', () => {
    const { rerender } = render(
      <SalesDayNavigator currentDay="2026-09-11" selectedDay="2026-09-05" />,
    )
    fireEvent.change(screen.getByLabelText('Chọn ngày vận hành'), {
      target: { value: '2026-09-01' },
    })
    rerender(
      <SalesDayNavigator currentDay="2026-09-11" selectedDay="2026-09-04" />,
    )
    expect(screen.getByLabelText('Chọn ngày vận hành')).toHaveValue('2026-09-04')
  })

  it('links to adjacent operating days and preserves the selected date', () => {
    render(
      <SalesDayNavigator
        currentDay="2026-09-11"
        selectedDay="2026-09-01"
      />,
    )

    expect(screen.getByRole('link', { name: 'Ngày trước' })).toHaveAttribute(
      'href',
      '/sales?day=2026-08-31',
    )
    expect(screen.getByRole('link', { name: 'Ngày sau' })).toHaveAttribute(
      'href',
      '/sales?day=2026-09-02',
    )
    expect(screen.getByLabelText('Chọn ngày vận hành')).toHaveValue('2026-09-01')
    expect(screen.getByLabelText('Chọn ngày vận hành')).toHaveAttribute(
      'max',
      '2026-09-11',
    )
    expect(screen.getByRole('link', { name: 'Về hôm nay' })).toHaveAttribute(
      'href',
      '/sales',
    )
  })

  it('disables moving into the future from the current operating day', () => {
    render(
      <SalesDayNavigator
        currentDay="2026-09-11"
        selectedDay="2026-09-11"
      />,
    )

    expect(screen.queryByRole('link', { name: 'Ngày sau' })).not.toBeInTheDocument()
    expect(screen.getByText('Ngày sau')).toHaveAttribute('aria-disabled', 'true')
    expect(screen.queryByRole('link', { name: 'Về hôm nay' })).not.toBeInTheDocument()
  })
})
