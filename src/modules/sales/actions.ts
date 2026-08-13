'use server'

import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/result'
import { requireUser } from '@/modules/auth/service'
import type { CreateSaleInput } from './schema'
import { createSaleWithClient } from './service'
import type { CreateSaleResult } from './types'

export async function createSale(
  input: CreateSaleInput,
): Promise<ActionResult<CreateSaleResult>> {
  await requireUser()
  const result = await createSaleWithClient(input)

  if (result.ok) {
    revalidatePath('/sales')
    revalidatePath('/')
  }

  return result
}
