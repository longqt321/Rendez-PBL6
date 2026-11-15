const FIELD_PATTERNS: ReadonlyArray<{ field: string; pattern: RegExp }> = [
  { field: "email", pattern: /email/i },
  { field: "handle", pattern: /handle/i },
  { field: "password", pattern: /mật khẩu|password/i },
  { field: "name", pattern: /\btên\b|\bname\b/i },
]

export function serverErrorField<K extends string>(
  message: string,
  fields: ReadonlyArray<K>,
): K | undefined {
  const matched = new Set(
    FIELD_PATTERNS.filter(({ pattern }) => pattern.test(message)).map(({ field }) => field),
  )
  const hits = fields.filter((field) => matched.has(field))
  return hits.length === 1 ? hits[0] : undefined
}
