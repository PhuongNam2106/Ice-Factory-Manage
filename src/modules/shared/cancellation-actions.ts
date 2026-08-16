'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/modules/auth/service'
import { cancelDocumentWithClient } from './cancellation'
import type { CancelDocumentInput } from './version-conflict'

export async function cancelDocument(input: CancelDocumentInput) {
  await requireUser()
  const result = await cancelDocumentWithClient(input)
  if (result.ok) {
    for (const path of ['/', '/sales', '/production', '/expenses', '/receivables', '/reports', '/admin/audit']) revalidatePath(path)
  }
  return result
}
