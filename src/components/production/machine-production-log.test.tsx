import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MachineProductionState } from '@/modules/production/types'
import { addHistoricalMachineRun, correctProductionAction, deleteProductionAction } from '@/modules/production/actions'
import { MachineProductionLog } from './machine-production-log'

vi.mock('@/modules/production/actions', () => ({
  deleteProductionAction: vi.fn(),
  setHarvestQuantity: vi.fn(),
  correctProductionAction: vi.fn(),
  addHistoricalMachineRun: vi.fn(),
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
    render(<MachineProductionLog isManager={false} locked={false} machine={machine} productionDate="2026-09-05" writable />)

    expect(screen.getByText('Bắt đầu chạy')).toHaveClass('text-emerald-700')
    expect(screen.getByText('Xả đá · 24 bao')).toHaveClass('text-sky-700')
    expect(screen.getByText('Tắt máy')).toHaveClass('text-rose-700')
  })

  it('lets a manager delete only the latest action first', () => {
    render(<MachineProductionLog isManager locked={false} machine={machine} productionDate="2026-09-05" writable />)

    expect(screen.getByRole('button', { name: 'Xóa tắt máy lúc 22:00' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Xóa xả đá lúc 21:30' })).toBeDisabled()
    expect(screen.getByText('24 bao / 1 lần xả')).toBeInTheDocument()
  })

  it('confirms the machine and action time before deleting', async () => {
    vi.mocked(deleteProductionAction).mockResolvedValue({ ok: true, data: { machineId: machine.id } })
    render(<MachineProductionLog isManager locked={false} machine={machine} productionDate="2026-09-05" writable />)

    fireEvent.click(screen.getByRole('button', { name: 'Xóa tắt máy lúc 22:00' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Máy 1')
    expect(screen.getByRole('dialog')).toHaveTextContent('22:00 · 05/09/2026')
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận xóa' }))

    await waitFor(() => expect(screen.getByText('Đã xóa thời điểm tắt máy.')).toBeInTheDocument())
  })

  it('does not show delete controls to an employee', () => {
    render(<MachineProductionLog allowBackfill isManager={false} locked={false} machine={machine} productionDate="2026-09-05" writable />)
    expect(screen.queryByRole('button', { name: /^Xóa/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Nhập bù từ sổ tay' })).not.toBeInTheDocument()
  })

  it('lets a manager add a missing historical harvest with its actual time and bag quantity', async () => {
    vi.mocked(correctProductionAction).mockResolvedValue({
      ok: true,
      data: {
        machineId: machine.id,
        harvestId: '44444444-4444-4444-8444-444444444444',
      },
    })
    render(
      <MachineProductionLog
        allowBackfill
        isManager
        locked={false}
        machine={machine}
        productionDate="2026-09-05"
        writable
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Thêm xả đá' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Nhập bù xả đá · Máy 1 · Ngày 2026-09-05')
    fireEvent.change(screen.getByLabelText('Thời gian (giờ Việt Nam)'), {
      target: { value: '2026-09-05T21:30' },
    })
    fireEvent.change(screen.getByLabelText('Số bao (có thể để trống)'), {
      target: { value: '30' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu chỉnh sửa' }))

    await waitFor(() => expect(correctProductionAction).toHaveBeenCalledWith(expect.objectContaining({
      actionType: 'add_harvest',
      machineId: machine.id,
      occurredAt: '2026-09-05T21:30:00+07:00',
      bagQuantity: '30',
    })))
  })

  it('creates a historical machine run with its start and stop time in one action', async () => {
    vi.mocked(addHistoricalMachineRun).mockResolvedValue({
      ok: true,
      data: {
        machineId: machine.id,
        runId: '55555555-5555-4555-8555-555555555555',
        productionDate: '2026-09-05',
      },
    })
    render(
      <MachineProductionLog
        allowBackfill
        isManager
        locked={false}
        machine={machine}
        productionDate="2026-09-05"
        writable
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Thêm phiên chạy cũ' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Thêm phiên chạy cũ · Máy 1 · Ngày 2026-09-05')
    fireEvent.change(screen.getByLabelText('Giờ bắt đầu (giờ Việt Nam)'), {
      target: { value: '2026-09-05T23:00' },
    })
    fireEvent.change(screen.getByLabelText('Giờ tắt máy (giờ Việt Nam)'), {
      target: { value: '2026-09-05T23:30' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu phiên chạy' }))

    await waitFor(() => expect(addHistoricalMachineRun).toHaveBeenCalledWith({
      machineId: machine.id,
      productionDate: '2026-09-05',
      startedAt: '2026-09-05T23:00:00+07:00',
      stoppedAt: '2026-09-05T23:30:00+07:00',
      idempotencyKey: expect.any(String),
    }))
  })
})
