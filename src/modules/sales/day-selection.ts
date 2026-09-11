const OPERATING_DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

function formatUtcDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10)
}

function parseOperatingDay(value: string) {
  const match = OPERATING_DAY_PATTERN.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  if (formatUtcDate(year, month, day) !== value) return null
  return { year, month, day }
}

export function resolveSalesOperatingDay(
  requestedDay: string | undefined,
  currentDay: string,
) {
  if (!requestedDay || !parseOperatingDay(requestedDay)) return currentDay
  return requestedDay <= currentDay ? requestedDay : currentDay
}

export function shiftSalesOperatingDay(operatingDay: string, amount: number) {
  const parsed = parseOperatingDay(operatingDay)
  if (!parsed) throw new Error('Ngày vận hành không hợp lệ')

  return formatUtcDate(parsed.year, parsed.month, parsed.day + amount)
}
