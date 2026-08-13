'use server'

import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/result'
import { requireUser } from '@/modules/auth/service'
import type { RecordReceiptInput } from './schema'
import { recordReceiptWithClient } from './service'
import type { RecordReceiptResult } from './types'

export async function recordReceipt(
  input: RecordReceiptInput,
): Promise<ActionResult<RecordReceiptResult>> {
  await requireUser()
  const result = await recordReceiptWithClient(input)

  if (result.ok) {
    revalidatePath('/receivables')
    revalidatePath('/sales')
    revalidatePath('/')
  }

  return result
}
