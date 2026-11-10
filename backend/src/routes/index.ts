import { OpenAPIHono } from "@hono/zod-openapi"
import type { AppEnv } from "../app"
import { auth } from "../lib/auth"
import { createAuthRouter } from "./auth"
import { createPlacesRouter } from "./places"
import { createUsersRouter } from "./users"

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

  /**
   * better-auth tự quản toàn bộ `/auth/*` (đăng ký, đăng nhập, phiên, cookie).
   * Handler nhận `Request` thô — trả thẳng response của nó, không qua
   * `c.json` để giữ nguyên Set-Cookie. `all` để bắt cả OPTIONS (CORS).
   */
  api.all("/auth/*", (c) => auth.handler(c.req.raw))

  // Hồ sơ + phiên (Phase 1) — `/me`, `/session`, `/register`.
  api.route("/", createAuthRouter())

  // Địa điểm (Phase 2) — `/places`, `/places/map`, `/places/:id`.
  api.route("/", createPlacesRouter())

  // Người dùng (Phase 2) — `/users`.
  api.route("/", createUsersRouter())

  return api
}
