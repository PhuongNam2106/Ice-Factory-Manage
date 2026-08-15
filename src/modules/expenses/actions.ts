'use server'

import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/result'
import { requireManager, requireUser } from '@/modules/auth/service'
import type { AttachmentMetadataInput, CreateExpenseInput } from './schema'
import {
  createAttachmentUploadWithClient,
  createExpenseWithClient,
  finalizeAttachmentWithClient,
  getAttachmentUrlWithClient,
  reviewExpenseWithClient,
} from './service'
import type {
  CreateAttachmentUploadResult,
  CreateExpenseResult,
  FinalizeAttachmentResult,
  ReviewExpenseResult,
} from './types'

export async function createExpense(input: CreateExpenseInput): Promise<ActionResult<CreateExpenseResult>> {
  await requireUser()
  const result = await createExpenseWithClient(input)
  if (result.ok) revalidatePath('/expenses')
  return result
}

export async function approveExpense(expenseId: string): Promise<ActionResult<ReviewExpenseResult>> {
  await requireManager()
  const result = await reviewExpenseWithClient({ expenseId, decision: 'approved', reason: null })
  if (result.ok) revalidatePath('/expenses')
  return result
}

export async function rejectExpense(expenseId: string, reason: string): Promise<ActionResult<ReviewExpenseResult>> {
  await requireManager()
  const result = await reviewExpenseWithClient({ expenseId, decision: 'rejected', reason })
  if (result.ok) revalidatePath('/expenses')
  return result
}

export async function createExpenseAttachmentUpload(
  input: AttachmentMetadataInput,
): Promise<ActionResult<CreateAttachmentUploadResult>> {
  await requireUser()
  return createAttachmentUploadWithClient(input)
}

export async function finalizeExpenseAttachment(
  input: AttachmentMetadataInput & { objectPath: string },
): Promise<ActionResult<FinalizeAttachmentResult>> {
  await requireUser()
  return finalizeAttachmentWithClient(input)
}

export async function getExpenseAttachmentUrl(
  attachmentId: string,
): Promise<ActionResult<{ signedUrl: string }>> {
  await requireUser()
  return getAttachmentUrlWithClient(attachmentId)
}
