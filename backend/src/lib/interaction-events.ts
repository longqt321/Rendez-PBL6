import type { Context } from "hono"
import type { Prisma } from "../../generated/prisma/client"
import type { AppEnv } from "../app"
import { weightForEvent } from "./interaction-weights"
import { logger } from "./logger"
import { prisma } from "./prisma"
import { getViewer } from "./session"

export interface RecordEventInput {
  eventType: string
  userId?: string | null
  anonId?: string | null
  placeId?: string | null
  postId?: string | null
  query?: string | null
  context?: Record<string, unknown>
  sessionId?: string | null
}

function normalizeEvent(input: RecordEventInput): Prisma.InteractionEventCreateManyInput | null {
  const weight = weightForEvent(input.eventType)
  if (weight === null) {
    logger.debug({ eventType: input.eventType }, "event không thuộc taxonomy — bỏ qua")
    return null
  }
  if (!input.userId && !input.anonId) return null
  return {
    userId: input.userId ?? null,
    anonId: input.anonId ?? null,
    eventType: input.eventType,
    placeId: input.placeId ?? null,
    postId: input.postId ?? null,
    query: input.query ?? null,
    weight,
    context: (input.context ?? {}) as Prisma.InputJsonValue,
    sessionId: input.sessionId ?? null,
  }
}

export async function recordEvent(input: RecordEventInput): Promise<boolean> {
  return (await recordEventsBatch([input])) === 1
}

/**
 * Bulk INSERT nhiều `interaction_events` trong 1 round-trip PostgreSQL bằng Prisma `createMany`.
 */
export async function recordEventsBatch(inputs: RecordEventInput[]): Promise<number> {
  const rows = inputs
    .map(normalizeEvent)
    .filter((row): row is Prisma.InteractionEventCreateManyInput => row !== null)
  if (rows.length === 0) return 0

  try {
    const result = await prisma.interactionEvent.createMany({ data: rows })
    return result.count
  } catch (error) {
    logger.warn({ err: error, count: rows.length }, "không ghi được interaction_events batch")
    return 0
  }
}

export async function recordEventForRequest(
  c: Context<AppEnv>,
  eventType: string,
  data: Omit<RecordEventInput, "eventType" | "userId" | "anonId">,
): Promise<void> {
  const viewer = await getViewer(c)
  await recordEvent({
    ...data,
    eventType,
    userId: viewer?.id ?? null,
    anonId: viewer ? null : (c.req.header("x-anon-id") ?? null),
  })
}
