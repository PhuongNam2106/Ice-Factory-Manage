import type { ZodError } from 'zod'

export function getFieldErrors(error: ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {}

  for (const issue of error.issues) {
    const field = issue.path.join('.') || '_form'
    fieldErrors[field] ??= []
    fieldErrors[field].push(issue.message)
  }

  return fieldErrors
}
