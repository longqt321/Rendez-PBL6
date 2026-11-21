import pino from "pino"
import { env } from "../env"
import { getRequestContext } from "./request-context"

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: "rendez-api" },
  mixin() {
    const ctx = getRequestContext()
    if (!ctx) return {}
    return ctx.userId
      ? { request_id: ctx.requestId, trace_id: ctx.traceId, user_id: ctx.userId }
      : { request_id: ctx.requestId, trace_id: ctx.traceId }
  },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.token",
      "*.secret",
      "*.accessKeyId",
      "*.secretAccessKey",
    ],
    censor: "[REDACTED]",
  },
})
