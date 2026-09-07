export const BUSINESS_TIME_ZONE = 'Asia/Bangkok'

const OPERATING_DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

const bangkokPartsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
})

function getBangkokParts(now: Date) {
  if (Number.isNaN(now.getTime())) {
    throw new Error('Thời điểm không hợp lệ')
  }

  const parts = Object.fromEntries(
    bangkokPartsFormatter
      .formatToParts(now)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
  }
}

function formatUtcDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10)
}

function parseOperatingDay(operatingDay: string) {
  const match = OPERATING_DAY_PATTERN.exec(operatingDay)
  if (!match) throw new Error('Ngày vận hành không hợp lệ')

  const [, yearText, monthText, dayText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  if (formatUtcDate(year, month, day) !== operatingDay) {
    throw new Error('Ngày vận hành không hợp lệ')
  }

  return { year, month, day }
}

export function getOperatingDay(now: Date): string {
  const { year, month, day, hour } = getBangkokParts(now)
  return hour >= 20
    ? formatUtcDate(year, month, day)
    : formatUtcDate(year, month, day - 1)
}

export function getOperatingWindow(operatingDay: string) {
  const { year, month, day } = parseOperatingDay(operatingDay)
  return {
    startsAt: new Date(Date.UTC(year, month - 1, day, 13)),
    endsAt: new Date(Date.UTC(year, month - 1, day + 1, 13)),
  }
}
