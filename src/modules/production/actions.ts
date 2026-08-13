'use server'

import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/result'
import { requireManager, requireUser } from '@/modules/auth/service'
import type { ProductionBatchInput, ProductionShiftTotalInput, SelectProductionSourceInput } from './schema'
import { createProductionBatchWithClient, createProductionShiftTotalWithClient, selectOfficialProductionSourceWithClient } from './service'
import type { ProductionBatchResult, ProductionShiftTotalResult, ProductionSourceSelectionResult } from './types'

function refreshProduction() {
  revalidatePath('/production')
  revalidatePath('/')
}

export async function createProductionBatch(input: ProductionBatchInput): Promise<ActionResult<ProductionBatchResult>> {
  await requireUser()
  const result = await createProductionBatchWithClient(input)
  if (result.ok) refreshProduction()
  return result
}

export async function createProductionShiftTotal(input: ProductionShiftTotalInput): Promise<ActionResult<ProductionShiftTotalResult>> {
  await requireUser()
  const result = await createProductionShiftTotalWithClient(input)
  if (result.ok) refreshProduction()
  return result
}

export async function selectOfficialProductionSource(input: SelectProductionSourceInput): Promise<ActionResult<ProductionSourceSelectionResult>> {
  await requireManager()
  const result = await selectOfficialProductionSourceWithClient(input)
  if (result.ok) refreshProduction()
  return result
}
