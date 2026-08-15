'use server'

import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/result'
import { requireUser } from '@/modules/auth/service'
import type { StockCountInput } from './schema'
import { recordStockCountWithClient } from './service'
import type { StockCountResult } from './types'

export async function recordStockCount(
  input: StockCountInput,
): Promise<ActionResult<StockCountResult>> {
  await requireUser()
  const result = await recordStockCountWithClient(input)
  if (result.ok) {
    revalidatePath('/inventory')
    revalidatePath('/')
  }
  return result
}
