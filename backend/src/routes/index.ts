import { OpenAPIHono } from "@hono/zod-openapi"
import type { AppEnv } from "../app"

/**
 * Router API v1 — mọi route nghiệp vụ mount dưới `/api/v1` (K1).
 *
 * Tách khỏi `app.ts` để app factory chỉ lo hạ tầng (middleware, error, docs) và
 * router chỉ lo route. Phase 1 trở đi thêm route vào đây theo feature.
 */
export function createApiRouter() {
  const api = new OpenAPIHono<AppEnv>()

  /** Liveness của API — không chạm DB (G4). */
  api.get("/healthz", (c) => c.json({ status: "ok" }))

  return api
}
