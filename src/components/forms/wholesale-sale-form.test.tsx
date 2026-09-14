import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { actionSuccess } from '@/lib/result'
import { createSale } from '@/modules/sales/actions'
import type { CustomerOption } from '@/modules/admin/catalog-service'
import { WholesaleSaleForm } from './wholesale-sale-form'

vi.mock('@/modules/sales/actions', () => ({ createSale: vi.fn() }))

const createSaleMock = vi.mocked(createSale)

const customers: CustomerOption[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Đầu mối A',
    phone: '0912345678',
    paymentTermDays: 7,
    wholesaleUnitPriceVnd: 7000,
    canCreateWholesaleSale: true,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Đầu mối chưa có giá',
    phone: null,
    paymentTermDays: 0,
    wholesaleUnitPriceVnd: null,
    canCreateWholesaleSale: false,
  },
]

const baseProps = {
  customers,
  canEnterHistoricalPrice: false,
  currentOperatingDay: '2026-09-09',
}

afterEach(cleanup)

beforeEach(() => {
  createSaleMock.mockReset()
  createSaleMock.mockResolvedValue(actionSuccess({
    saleId: '33333333-3333-4333-8333-333333333333',
    kind: 'wholesale',
    unitPriceVnd: 7000,
    totalVnd: 70000,
    usedHistoricalPrice: false,
  }))
})

describe('WholesaleSaleForm', () => {
  it('uses the selected customer price for a one-quantity preview', async () => {
    const user = userEvent.setup()
    render(<WholesaleSaleForm {...baseProps} />)

    await user.selectOptions(
      screen.getByLabelText('Khách hàng đầu mối'),
      customers[0].id,
    )
    await user.type(screen.getByLabelText('Số lượng bao'), '10')

    expect(screen.getByText('7.000 VNĐ/bao')).toBeVisible()
    expect(screen.getByText('70.000 VNĐ')).toBeVisible()
    expect(screen.queryByRole('button', { name: /Thêm mức giá/ })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Đơn giá dòng/)).not.toBeInTheDocument()
  })

  it('explains and blocks an active customer without a configured price', async () => {
    const user = userEvent.setup()
    render(<WholesaleSaleForm {...baseProps} />)

    await user.selectOptions(
      screen.getByLabelText('Khách hàng đầu mối'),
      customers[1].id,
    )

    expect(screen.getByText('Khách hàng chưa được thiết lập giá sỉ.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Lưu Đơn Bán Sỉ' })).toBeDisabled()
  })

  it('shows a historical price only to a manager entering a past operating day', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<WholesaleSaleForm {...baseProps} />)

    await user.click(screen.getByLabelText('Dùng giờ hiện tại'))
    await user.type(screen.getByLabelText('Thời gian thực tế'), '2026-09-01T20:00')
    expect(screen.queryByLabelText('Giá sỉ thực tế mỗi bao')).not.toBeInTheDocument()

    rerender(<WholesaleSaleForm {...baseProps} canEnterHistoricalPrice />)
    expect(screen.getByLabelText('Giá sỉ thực tế mỗi bao')).toBeRequired()
  })

  it('submits quantity instead of lines and reports the database price', async () => {
    const user = userEvent.setup()
    createSaleMock.mockResolvedValue(actionSuccess({
      saleId: '33333333-3333-4333-8333-333333333333',
      kind: 'wholesale',
      unitPriceVnd: 7500,
      totalVnd: 75000,
      usedHistoricalPrice: false,
    }))
    render(<WholesaleSaleForm {...baseProps} />)

    await user.selectOptions(
      screen.getByLabelText('Khách hàng đầu mối'),
      customers[0].id,
    )
    await user.type(screen.getByLabelText('Số lượng bao'), '10')
    await user.click(screen.getByRole('button', { name: 'Lưu Đơn Bán Sỉ' }))

    await waitFor(() => expect(createSaleMock).toHaveBeenCalledTimes(1))
    const submitted = createSaleMock.mock.calls[0][0]
    expect(submitted).toMatchObject({
      kind: 'wholesale',
      customerId: customers[0].id,
      quantityBags: '10',
      historicalUnitPriceVnd: null,
    })
    expect(submitted).not.toHaveProperty('lines')
    expect(screen.getByRole('status')).toHaveTextContent(
      'Giá khách hàng vừa thay đổi; đơn đã được tính theo giá mới nhất.',
    )
    expect(screen.getByRole('status')).toHaveTextContent('75.000 VNĐ')
  })
})
