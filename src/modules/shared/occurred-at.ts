const BANGKOK_DATETIME_LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/

export function parseBangkokOccurredAt(value: FormDataEntryValue | null): string | null {
  if (value === null || value === '') return null
  if (typeof value !== 'string') throw new Error('Thời gian phát sinh không hợp lệ')

  const match = BANGKOK_DATETIME_LOCAL_PATTERN.exec(value)
  if (!match) throw new Error('Thời gian phát sinh không hợp lệ')

  const [, yearText, monthText, dayText, hourText, minuteText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const hour = Number(hourText)
  const minute = Number(minuteText)
  const normalizedDate = new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10)

  if (normalizedDate !== `${yearText}-${monthText}-${dayText}` || hour > 23 || minute > 59) {
    throw new Error('Thời gian phát sinh không hợp lệ')
  }

  return new Date(`${value}:00+07:00`).toISOString()
}
