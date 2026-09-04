import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MachineProductionState } from '@/modules/production/types'
import { MachineProductionCard } from './machine-production-card'

vi.mock('@/modules/production/actions', () => ({
  startMachine: vi.fn(), recordHarvest: vi.fn(), stopMachine: vi.fn(), setHarvestQuantity: vi.fn(), correctProductionAction: vi.fn(),
}))
afterEach(cleanup)

const stopped: MachineProductionState = {
  id: '11111111-1111-4111-8111-111111111111', name: 'Máy 1', code: 'M01', openRun: null,
  pendingHarvest: null, totalBags: 0, harvestCount: 0, logs: [],
}

describe('MachineProductionCard', () => {
  it('only enables start while a machine is stopped', () => {
    render(<MachineProductionCard isManager={false} locked={false} machine={stopped} managerWritable now={new Date('2026-09-05T14:00:00Z')} productionEndsAt="2026-09-06T11:00:00Z" reminderMinutes={30} writable />)
    expect(screen.getByRole('button', { name: 'Bắt đầu chạy' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Xả đá' })).toBeDisabled()
    expect(screen.getByText('Phải bắt đầu máy trước khi xả đá.')).toBeInTheDocument()
  })

  it('shows a zero-bag harvest and explains pending harvest blocking', () => {
    const machine: MachineProductionState = {
      ...stopped,
      openRun: { id: stopped.id, productionDate: '2026-09-05', startedAt: '2026-09-05T13:00:00Z', startedBy: 'An' },
      pendingHarvest: { id: '22222222-2222-4222-8222-222222222222', runId: stopped.id, harvestedAt: '2026-09-05T13:30:00Z', harvestedBy: 'An' },
      logs: [{ id: 'log', type: 'harvest', occurredAt: '2026-09-05T13:30:00Z', actorName: 'An', runId: stopped.id, harvestId: '33333333-3333-4333-8333-333333333333', bagQuantity: 0 }],
    }
    render(<MachineProductionCard isManager={false} locked={false} machine={machine} managerWritable now={new Date('2026-09-05T14:01:00Z')} productionEndsAt="2026-09-06T11:00:00Z" reminderMinutes={30} writable />)
    expect(screen.getByRole('button', { name: 'Xả đá' })).toBeDisabled()
    expect(screen.getByText(/Lần xả gần nhất chưa có số bao/)).toBeInTheDocument()
    expect(screen.getByText('Xả đá · 0 bao')).toBeInTheDocument()
    expect(screen.getByText(/Đã hơn 30 phút/)).toBeInTheDocument()
  })
})
