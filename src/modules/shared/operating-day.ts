const bangkokDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Bangkok',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function getOperatingDay(now: Date): string {
  if (Number.isNaN(now.getTime())) {
    throw new Error('Thời điểm không hợp lệ')
  }

  const parts = Object.fromEntries(
    bangkokDateFormatter
      .formatToParts(now)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )

  return `${parts.year}-${parts.month}-${parts.day}`
}
