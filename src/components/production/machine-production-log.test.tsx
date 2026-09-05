import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MachineProductionState } from '@/modules/production/types'
import { deleteProductionAction } from '@/modules/production/actions'
import { MachineProductionLog } from './machine-production-log'

vi.mock('@/modules/production/actions', () => ({
  deleteProductionAction: vi.fn(),
  setHarvestQuantity: vi.fn(),
  correctProductionAction: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const machine: MachineProductionState = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Máy 1',
  code: 'M01',
  openRun: null,
  pendingHarvest: null,
  totalBags: 24,
  harvestCount: 1,
  logs: [
    {
      id: '22222222-2222-4222-8222-222222222222:stop',
      type: 'stop',
      occurredAt: '2026-09-05T15:00:00Z',
      actorName: 'An',
      runId: '22222222-2222-4222-8222-222222222222',
    },
    {
      id: '33333333-3333-4333-8333-333333333333:harvest',
      type: 'harvest',
      occurredAt: '2026-09-05T14:30:00Z',
      actorName: 'An',
      runId: '22222222-2222-4222-8222-222222222222',
      harvestId: '33333333-3333-4333-8333-333333333333',
      bagQuantity: 24,
    },
    {
      id: '22222222-2222-4222-8222-222222222222:start',
      type: 'start',
      occurredAt: '2026-09-05T13:00:00Z',
      actorName: 'An',
      runId: '22222222-2222-4222-8222-222222222222',
    },
  ],
}

describe('MachineProductionLog', () => {
  it('uses a distinct readable color for each action type', () => {
    render(<MachineProductionLog isManager={false} locked={false} machine={machine} writable />)

    expect(screen.getByText('Bắt đầu chạy')).toHaveClass('text-emerald-700')
    expect(screen.getByText('Xả đá · 24 bao')).toHaveClass('text-sky-700')
    expect(screen.getByText('Tắt máy')).toHaveClass('text-rose-700')
  })

  it('lets a manager delete only the latest action first', () => {
    render(<MachineProductionLog isManager locked={false} machine={machine} writable />)

    expect(screen.getByRole('button', { name: 'Xóa tắt máy lúc 22:00' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Xóa xả đá lúc 21:30' })).toBeDisabled()
    expect(screen.getByText('24 bao / 1 lần xả')).toBeInTheDocument()
  })

  it('confirms the machine and action time before deleting', async () => {
    vi.mocked(deleteProductionAction).mockResolvedValue({ ok: true, data: { machineId: machine.id } })
    render(<MachineProductionLog isManager locked={false} machine={machine} writable />)

    fireEvent.click(screen.getByRole('button', { name: 'Xóa tắt máy lúc 22:00' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Máy 1')
    expect(screen.getByRole('dialog')).toHaveTextContent('22:00 · 05/09/2026')
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận xóa' }))

    await waitFor(() => expect(screen.getByText('Đã xóa thời điểm tắt máy.')).toBeInTheDocument())
  })

  it('does not show delete controls to an employee', () => {
    render(<MachineProductionLog isManager={false} locked={false} machine={machine} writable />)
    expect(screen.queryByRole('button', { name: /^Xóa/ })).not.toBeInTheDocument()
  })
})
