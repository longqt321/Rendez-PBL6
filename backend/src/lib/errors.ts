import { HTTPException } from "hono/http-exception"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import { Prisma } from "../../generated/prisma/client"

export class ApiError extends HTTPException {
  constructor(status: ContentfulStatusCode, message: string, code?: string) {
    super(status, {
      res: new Response(JSON.stringify({ message, ...(code && { code }) }), {
        status,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      }),
    })
  }
}

export function isNulByteError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false
  const meta = (error as { meta?: unknown }).meta
  if (typeof meta !== "object" || meta === null) return false
  const adapter = (meta as { driverAdapterError?: unknown }).driverAdapterError
  if (typeof adapter !== "object" || adapter === null) return false
  const cause = (adapter as { cause?: unknown }).cause
  if (typeof cause !== "object" || cause === null) return false
  return (cause as { originalCode?: unknown }).originalCode === "22021"
}

/**
 * Vi phạm unique constraint (P2002) — dùng class chính thức của Prisma thay vì
 * tự kiểm `"code" in error` kiểu duck-typing (trước đây rooms.ts và
 * suggestions-job.ts mỗi nơi viết một bản, dễ lệch nhau).
 */
export function isUniqueViolation(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
}
