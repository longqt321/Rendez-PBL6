import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../../generated/prisma/client"
import { env } from "../env"
import { logger } from "./logger"
import { recordDbTiming } from "./request-context"

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  options: "-c statement_timeout=15000",
})

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
