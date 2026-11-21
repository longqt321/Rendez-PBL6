import { Prisma } from "../../generated/prisma/client"
import { logger } from "./logger"
import { prisma } from "./prisma"

export interface RecordAuditLogInput {
  actorId?: string | null
  action: string
  entity: string
  entityId?: string | null
  meta?: Record<string, unknown>
  ip?: string | null
}

export async function recordAuditLog(
  input: RecordAuditLogInput,
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  await client.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      meta: (input.meta ?? {}) as Prisma.InputJsonValue,
      ip: input.ip ?? null,
    },
  })
}

export async function recordAuditLogSafe(input: RecordAuditLogInput): Promise<void> {
  try {
    await recordAuditLog(input)
  } catch (error) {
    logger.warn({ err: error, action: input.action }, "Ghi audit log thất bại")
  }
}
