import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  client: { from: vi.fn(), rpc: vi.fn() },
  ensureOperatingDay: vi.fn(),
  listSalesByDay: vi.fn(),
  requireUser: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue(mocks.client),
}))
vi.mock('@/modules/auth/service', () => ({ requireUser: mocks.requireUser }))
vi.mock('@/modules/closing/ensure-day', () => ({
  ensureOperatingDay: mocks.ensureOperatingDay,
}))
vi.mock('@/modules/sales/repository', () => ({
  listSalesByDay: mocks.listSalesByDay,
}))
vi.mock('@/modules/shared/operating-day', () => ({
  getOperatingDay: vi.fn().mockReturnValue('2026-09-11'),
}))

import SalesPage from './page'

afterEach(cleanup)

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireUser.mockResolvedValue({
    id: '11111111-1111-4111-8111-111111111111',
    role: 'employee',
  })
  mocks.ensureOperatingDay.mockResolvedValue(undefined)
  mocks.listSalesByDay.mockResolvedValue([])
})

describe('SalesPage', () => {
  it('loads a selected historical operating day without showing create actions', async () => {
    const page = await SalesPage({
      searchParams: Promise.resolve({ day: '2026-09-01' }),
    })
    render(page)

    expect(mocks.listSalesByDay).toHaveBeenCalledWith(
      mocks.client,
      '2026-09-01',
    )
    expect(screen.getByRole('heading', { name: 'Giao dịch ngày 01/09/2026' })).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Nhập Bán Sỉ' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Nhập Bán Lẻ' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Về hôm nay để nhập' })).toHaveAttribute(
      'href',
      '/sales',
    )
  })

  it('keeps create actions on the current operating day', async () => {
    const page = await SalesPage({ searchParams: Promise.resolve({}) })
    render(page)

    expect(mocks.ensureOperatingDay).toHaveBeenCalledWith(
      '2026-09-11',
      mocks.client,
    )
    expect(screen.getAllByRole('link', { name: 'Nhập Bán Sỉ' })[0]).toBeVisible()
    expect(screen.getAllByRole('link', { name: 'Nhập Bán Lẻ' })[0]).toBeVisible()
  })
})
