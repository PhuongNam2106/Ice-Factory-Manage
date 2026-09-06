'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/modules/auth/service'
import {
  correctDocumentOccurredAtWithClient,
  type CorrectOccurredAtInput,
} from './document-time'

export async function correctDocumentOccurredAt(input: CorrectOccurredAtInput) {
  await requireUser()
  const result = await correctDocumentOccurredAtWithClient(input)
  if (result.ok) {
    for (const path of ['/', '/sales', '/receivables', '/expenses', '/loss', '/closing', '/alerts', '/admin/audit']) {
      revalidatePath(path)
    }
  }
  return result
}
