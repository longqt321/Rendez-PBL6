import { Hono } from "hono"
import { z } from "zod"
import type { AppEnv } from "../app"
import { logger } from "../lib/logger"
import { pushObservabilityEvent } from "../lib/observability-store"
import { rateLimit } from "../lib/rate-limit"

const clientErrorSchema = z.object({
  kind: z.literal("error"),
  message: z.string().min(1).max(400),
  stack: z.string().max(1500).optional(),
  route: z.string().max(200).optional(),
  source: z
    .enum(["react-boundary", "window-error", "unhandled-rejection", "api-contract"])
    .optional(),
  apiRequestId: z.string().max(64).optional(),
  status: z.number().int().min(0).max(599).optional(),
})

const webVitalSchema = z.object({
  kind: z.literal("web-vital"),
  name: z.enum(["LCP", "INP", "CLS", "FCP", "TTFB"]),
  value: z.number().min(0).max(120_000),
  rating: z.enum(["good", "needs-improvement", "poor"]).optional(),
  route: z.string().max(200).optional(),
  navigationType: z.string().max(40).optional(),
})

const telemetryBatchSchema = z.object({
  items: z
    .array(z.discriminatedUnion("kind", [clientErrorSchema, webVitalSchema]))
    .min(1)
    .max(15),
})

/**
 * Thu thập lỗi phía client & chỉ số Real User Monitoring (Web Vitals).
 * Xuất ra Pino JSON stdout tách biệt hoàn toàn khỏi `interaction_events`.
 */
export function createTelemetryRouter() {
  const router = new Hono<AppEnv>()

  router.post(
    "/telemetry",
    rateLimit({ scope: "telemetry", limit: 60, windowSeconds: 60 }),
    async (c) => {
      const raw = await c.req.json().catch(() => null)
      const parsed = telemetryBatchSchema.safeParse(raw)
      if (!parsed.success) {
        return c.json({ accepted: 0 }, 400)
      }

      for (const item of parsed.data.items) {
        if (item.kind === "error") {
          logger.warn(
            {
              type: "client_error",
              error_source: item.source ?? "unknown",
              route: item.route ?? null,
              message: item.message,
              stack: item.stack ?? null,
              api_request_id: item.apiRequestId ?? null,
              http_status: item.status ?? null,
            },
            "client_error",
          )
          pushObservabilityEvent({
            kind: "client_error",
            requestId: item.apiRequestId ?? c.get("requestId"),
            traceId: c.get("traceId"),
            route: item.route,
            status: item.status,
            message: item.message,
            source: item.source,
          })
        } else {
          const logFn = item.rating === "poor" ? logger.warn.bind(logger) : logger.info.bind(logger)
          logFn(
            {
              type: "web_vital",
              metric: item.name,
              value: Number(item.value.toFixed(3)),
              rating: item.rating ?? null,
              route: item.route ?? null,
              navigation_type: item.navigationType ?? null,
            },
            "web_vital",
          )
          pushObservabilityEvent({
            kind: "web_vital",
            requestId: c.get("requestId"),
            traceId: c.get("traceId"),
            route: item.route,
            metric: item.name,
            value: Number(item.value.toFixed(3)),
            rating: item.rating,
          })
        }
      }

      return c.json({ accepted: parsed.data.items.length }, 202)
    },
  )

  return router
}
