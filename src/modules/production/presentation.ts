export type RunOvertimeLevel = 'none' | 'warning' | 'critical'

function assertValidDate(value: Date) {
  if (Number.isNaN(value.getTime())) throw new Error('Thời điểm không hợp lệ')
}

export function isHarvestReminderDue(
  harvestedAt: Date,
  now: Date,
  reminderMinutes: number,
): boolean {
  assertValidDate(harvestedAt)
  assertValidDate(now)
  if (!Number.isInteger(reminderMinutes) || reminderMinutes < 1) {
    throw new Error('Ngưỡng nhắc không hợp lệ')
  }

  return now.getTime() - harvestedAt.getTime() >= reminderMinutes * 60_000
}

export function getRunOvertimeLevel(now: Date, productionEndsAt: Date): RunOvertimeLevel {
  assertValidDate(now)
  assertValidDate(productionEndsAt)

  if (now.getTime() < productionEndsAt.getTime()) return 'none'
  if (now.getTime() < productionEndsAt.getTime() + 2 * 60 * 60_000) return 'warning'
  return 'critical'
}
