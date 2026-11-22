import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import { PrismaClient } from "../../generated/prisma/client"
import { env } from "../env"
import { logger } from "./logger"
import { recordDbTiming } from "./request-context"

const DB_POOL_MAX = 20

export const pgPool = new Pool({
  connectionString: env.DATABASE_URL,
  max: DB_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  options: "-c statement_timeout=15000",
})

export interface DbPoolStats {
  total: number
  idle: number
  waiting: number
  max: number
}

export function getDbPoolStats(): DbPoolStats {
  return {
    total: pgPool.totalCount,
    idle: pgPool.idleCount,
    waiting: pgPool.waitingCount,
    max: DB_POOL_MAX,
  }
}

const adapter = new PrismaPg(pgPool)

export const prisma = new PrismaClient({
  adapter,
  log: [
    { emit: "event", level: "query" },
    { emit: "stdout", level: "warn" },
    { emit: "stdout", level: "error" },
  ],
})

prisma.$on("query", (event) => {
  recordDbTiming(event.duration)
  if (event.duration > 250) {
    logger.warn({ durationMs: event.duration, query: event.query.slice(0, 240) }, "slow-query")
  }
})
