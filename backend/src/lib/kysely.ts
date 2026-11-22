import { Kysely, PostgresDialect, sql } from "kysely"
import type { DB } from "../../generated/kysely/types"
import { logger } from "./logger"
import { pgPool } from "./prisma"
import { recordDbTiming } from "./request-context"

export { sql }

export const db = new Kysely<DB>({
  dialect: new PostgresDialect({ pool: pgPool }),
  log(event) {
    if (event.level === "query") {
      recordDbTiming(event.queryDurationMillis)
      if (event.queryDurationMillis > 250) {
        logger.warn(
          {
            durationMs: Math.round(event.queryDurationMillis),
            query: event.query.sql.slice(0, 240),
          },
          "slow-kysely-query",
        )
      }
    } else if (event.level === "error") {
      logger.error({ err: event.error }, "kysely-query-error")
    }
  },
})
