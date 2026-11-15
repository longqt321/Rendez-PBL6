export function idempotencyHeaders(): Record<string, string> {
  return { "Idempotency-Key": crypto.randomUUID() }
}
