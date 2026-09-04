export type ProductionDayStatus = 'open' | 'locked'
export type ProductionActionType = 'start' | 'harvest' | 'stop'

export type MachineRunState = { id: string; productionDate: string; startedAt: string; startedBy: string }
export type PendingHarvestState = { id: string; runId: string; harvestedAt: string; harvestedBy: string }

export type MachineLogItem = {
  id: string
  type: ProductionActionType
  occurredAt: string
  actorName: string
  runId: string
  harvestId?: string
  bagQuantity?: number | null
  quantityUpdatedAt?: string | null
  quantityUpdatedBy?: string | null
}

export type MachineProductionState = {
  id: string
  name: string
  code: string
  openRun: MachineRunState | null
  pendingHarvest: PendingHarvestState | null
  totalBags: number
  harvestCount: number
  logs: MachineLogItem[]
}

export type ProductionBoardSnapshot = {
  productionDate: string
  startsAt: string
  endsAt: string
  status: ProductionDayStatus
  reminderMinutes: number
  machines: MachineProductionState[]
}

export type MachineProductivitySummary = {
  machineId: string
  machineName: string
  machineCode: string
  totalBags: number
  harvestCount: number
  pendingHarvestCount: number
  averageBagsPerHarvest: number | null
  runtimeSeconds: number
  downtimeSeconds: number
  averageHarvestIntervalSeconds: number | null
  latestHarvestAt: string | null
  isRunning: boolean
}

export type MachineActionResult = {
  machineId: string
  runId?: string
  harvestId?: string
  productionDate?: string
  startedAt?: string
  harvestedAt?: string
  stoppedAt?: string
  quantity?: number
  quantityUpdatedAt?: string
}

export type ProductionDayResult = { productionDate: string; status: ProductionDayStatus }
