'use server'

import { revalidatePath } from 'next/cache'
import { requireManager, requireUser } from '@/modules/auth/service'
import type { DeleteProductionActionInput, HarvestQuantityInput, MachineActionInput, ProductionCorrectionInput, ProductionDateInput } from './schema'
import {
  correctProductionActionWithClient, deleteProductionActionWithClient, lockProductionDayWithClient, recordHarvestWithClient,
  reopenProductionDayWithClient, setHarvestQuantityWithClient, startMachineWithClient, stopMachineWithClient,
} from './service'

function refreshProduction() { revalidatePath('/production', 'layout'); revalidatePath('/') }
async function refreshOnSuccess<T extends { ok: boolean }>(operation: Promise<T>) { const result = await operation; if (result.ok) refreshProduction(); return result }

export async function startMachine(input: MachineActionInput) { await requireUser(); return refreshOnSuccess(startMachineWithClient(input)) }
export async function recordHarvest(input: MachineActionInput) { await requireUser(); return refreshOnSuccess(recordHarvestWithClient(input)) }
export async function stopMachine(input: MachineActionInput) { await requireUser(); return refreshOnSuccess(stopMachineWithClient(input)) }
export async function setHarvestQuantity(input: HarvestQuantityInput) { await requireUser(); return refreshOnSuccess(setHarvestQuantityWithClient(input)) }
export async function correctProductionAction(input: ProductionCorrectionInput) { await requireManager(); return refreshOnSuccess(correctProductionActionWithClient(input)) }
export async function deleteProductionAction(input: DeleteProductionActionInput) { await requireManager(); return refreshOnSuccess(deleteProductionActionWithClient(input)) }
export async function lockProductionDay(input: ProductionDateInput) { await requireManager(); return refreshOnSuccess(lockProductionDayWithClient(input)) }
export async function reopenProductionDay(input: ProductionDateInput) { await requireManager(); return refreshOnSuccess(reopenProductionDayWithClient(input)) }
