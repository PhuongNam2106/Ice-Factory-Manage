export type IdempotencyStatus = 'processing' | 'completed'

export type IdempotencyClaim = {
  key: string
  operation: string
  actorId: string
  status: IdempotencyStatus
  entityId: string | null
  response: unknown
}

export function createIdempotencyKey(): string {
  return crypto.randomUUID()
}
