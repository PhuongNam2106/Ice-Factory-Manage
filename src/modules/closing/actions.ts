'use server'

import { revalidatePath } from 'next/cache'
import { requireManager, requireUser } from '@/modules/auth/service'
import { getDailyReconciliation, lockOperatingDay, reopenOperatingDay } from './service'

export async function refreshDailyReconciliation(day: string) {
  await requireUser()
  return getDailyReconciliation(day)
}

export async function lockDay(day: string) {
  await requireManager()
  const result = await lockOperatingDay(day)
  if (result.ok) { revalidatePath('/closing'); revalidatePath(`/closing/${day}`) }
  return result
}

export async function reopenDay(day: string, reason: string) {
  await requireManager()
  const result = await reopenOperatingDay(day, reason)
  if (result.ok) { revalidatePath('/closing'); revalidatePath(`/closing/${day}`) }
  return result
}
