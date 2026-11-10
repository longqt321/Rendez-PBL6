import pino from "pino"
import { env } from "../env"

/**
 * Logger structured JSON — một dòng/request (G3).
 *
 * Dev đọc bằng mắt vẫn được vì pino in JSON ra stdout; production để
 * Fly/Railway gom log. Không log body, cookie, token hay email đầy đủ.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: "rendez-api" },
})
