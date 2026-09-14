import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { actionSuccess } from '@/lib/result'
import { saveCustomer } from '@/modules/admin/catalog-actions'
import type { CustomerRecord } from '@/modules/admin/catalog-service'
import { CustomerForm } from './customer-form'

vi.mock('@/modules/admin/catalog-actions', () => ({
  saveCustomer: vi.fn(),
  setCustomerActive: vi.fn(),
}))

const saveCustomerMock = vi.mocked(saveCustomer)

afterEach(cleanup)

beforeEach(() => {
  saveCustomerMock.mockReset()
  saveCustomerMock.mockResolvedValue(actionSuccess({
    id: '11111111-1111-4111-8111-111111111111',
  }))
})

describe('CustomerForm', () => {
  it('submits the required wholesale price when creating a customer', async () => {
    const user = userEvent.setup()
    render(<CustomerForm />)

    await user.type(screen.getByLabelText('Tên khách hàng'), 'Đầu mối A')
    await user.type(screen.getByLabelText('Giá sỉ mỗi bao (VNĐ)'), '7000')
    await user.click(screen.getByRole('button', { name: 'Thêm khách hàng' }))

    await waitFor(() => expect(saveCustomerMock).toHaveBeenCalledWith({
      id: undefined,
      name: 'Đầu mối A',
      phone: '',
      address: '',
      paymentTermDays: '0',
      wholesaleUnitPriceVnd: '7000',
    }))
  })

  it('shows an existing price and explains that changes are prospective', () => {
    const customer: CustomerRecord = {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Đầu mối A',
      phone: null,
      address: null,
      paymentTermDays: 7,
      wholesaleUnitPriceVnd: 7000,
      canCreateWholesaleSale: true,
      isActive: true,
    }

    render(<CustomerForm customer={customer} />)

    expect(screen.getByLabelText('Giá sỉ mỗi bao (VNĐ)')).toHaveValue(7000)
    expect(screen.getByText('7.000 VNĐ/bao')).toBeVisible()
    expect(screen.getByText(
      'Giá mới chỉ áp dụng cho các đơn tạo sau khi lưu.',
    )).toBeVisible()
  })

  it('labels a migrated customer that has no wholesale price', () => {
    const customer: CustomerRecord = {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Đầu mối cũ',
      phone: null,
      address: null,
      paymentTermDays: 0,
      wholesaleUnitPriceVnd: null,
      canCreateWholesaleSale: false,
      isActive: true,
    }

    render(<CustomerForm customer={customer} />)

    expect(screen.getByText('Chưa thiết lập giá sỉ')).toBeVisible()
    expect(screen.getByLabelText('Giá sỉ mỗi bao (VNĐ)')).toHaveValue(null)
  })
})
