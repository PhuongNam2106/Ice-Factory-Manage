'use server'

import { revalidatePath } from 'next/cache'
import { requireManager, requireUser } from '@/modules/auth/service'
import type {
  ConfirmDailyLossWarningInput,
  DailyLossInput,
} from './schema'
import {
  confirmDailyLossWarning,
  getDailyLossReport,
  saveDailyLoss,
} from './service'

function revalidateLoss(day: string) {
  for (const path of ['/', '/loss', '/closing', '/alerts', `/loss/${day}`, `/closing/${day}`]) {
    revalidatePath(path)
  }
}

export async function refreshDailyLoss(day: string) {
  await requireUser()
  return getDailyLossReport(day)
}

export async function saveDailyLossAction(input: DailyLossInput) {
  await requireUser()
  const result = await saveDailyLoss(input)
  if (result.ok) revalidateLoss(input.operatingDay)
  return result
}

export async function confirmDailyLossWarningAction(input: ConfirmDailyLossWarningInput) {
  await requireManager()
  const result = await confirmDailyLossWarning(input)
  if (result.ok) revalidateLoss(result.data.operatingDay)
  return result
}
