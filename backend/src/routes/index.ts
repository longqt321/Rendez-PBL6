import { OpenAPIHono } from "@hono/zod-openapi"
import { createMiddleware } from "hono/factory"
import type { AppEnv } from "../app"
import { auth } from "../lib/auth"
import { recordRequest } from "../lib/metrics"
import { createAuthRouter } from "./auth"
import { createPlacesRouter } from "./places"
import { createUsersRouter } from "./users"
import { createPostsRouter } from "./posts"
import { createNotificationsRouter } from "./notifications"
import { createReviewsRouter } from "./reviews"
import { createCollectionsRouter } from "./collections"
import { createRoomsRouter } from "./rooms"
import { createMediaRouter } from "./media"
import { createOgRouter } from "./og"
import { createSystemRouter } from "./system"

/**
 * Đường dẫn request → khoá route cho metrics. Sau `await next()` Hono đã gán
 * `c.req.routePath` của handler khớp (vd `/places/:id`) — dùng nó làm khoá chuẩn
 * (không phụ thuộc hình dạng id). Fallback chuẩn hoá từ path thật khi chưa khớp
 * route nào: thay segment chứa số, uuid, hoặc slug (`banh-xeo-ba-duong`) bằng
 * `:id` để các request cùng route gộp về một khoá thay vì phình theo từng id.
 */
function normalizeRoutePath(path: string): string {
  const stripped = path.replace(/^\/api\/v1/u, "") || "/"
  const segments = stripped
    .split("/")
    .map((segment) =>
      segment.length > 0 &&
      (/\d/u.test(segment) ||
        /^[0-9a-f-]{36}$/iu.test(segment) ||
        /^[a-z0-9]+(?:-[a-z0-9]+)+$/u.test(segment))
        ? ":id"
        : segment,
    )
  return segments.join("/")
}

/**
 * Router API v1 — mọi route nghiệp vụ mount dưới `/api/v1` (K1).
 *
 * Tách khỏi `app.ts` để app factory chỉ lo hạ tầng (middleware, error, docs) và
 * router chỉ lo route. Phase 1 trở đi thêm route vào đây theo feature.
 */
export function createApiRouter() {
  const api = new OpenAPIHono<AppEnv>()

  /**
   * Metrics mọi request `/api/v1/*` — trừ chính `/system/*` (nếu không, route
   * quan sát tự làm phình số liệu nó báo cáo). Route gắn `cacheHit` trong
   * context khi phục vụ từ cache ứng dụng; mặc định false.
   */
  api.use(
    "*",
    createMiddleware<AppEnv>(async (c, next) => {
      const startedAt = performance.now()
      try {
        await next()
      } finally {
        // Bỏ qua chính `/system/*` (route quan sát tự làm phình số liệu nó báo
        // cáo). `finally` để request lỗi (4xx/5xx) vẫn được đếm — lỗi cũng là
        // tín hiệu vận hành cần thấy.
        if (!c.req.path.includes("/system")) {
          // Sau `next()` Hono đã gán routePath của handler khớp; rỗng/"*" khi
          // không route nào khớp (404) → fallback chuẩn hoá từ path thật.
          const matched = c.req.routePath
          const route = `${c.req.method} ${
            matched && matched !== "*" ? matched : normalizeRoutePath(c.req.path)
          }`
          recordRequest(
            route,
            Math.round(performance.now() - startedAt),
            c.get("cacheHit") ?? false,
          )
        }
      }
    }),
  )

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

  // Bài đăng + bình luận (Phase 3).
  api.route("/", createPostsRouter())

  // Thông báo (Phase 4).
  api.route("/", createNotificationsRouter())

  // Đánh giá + báo cáo địa điểm (Phase 4).
  api.route("/", createReviewsRouter())

  // Bộ sưu tập (Phase 5).
  api.route("/", createCollectionsRouter())

  // Phòng lọc nhóm + SSE (Phase 6).
  api.route("/", createRoomsRouter())

  // Upload ảnh presigned R2 (Phase 7).
  api.route("/", createMediaRouter())

  // HTML meta Open Graph cho bot preview (`/og/place/:id`, `/og/post/:id`).
  api.route("/", createOgRouter())

  // Số liệu vận hành cho demo (`/system/stats`, `/system/reset`).
  api.route("/", createSystemRouter())

  return api
}
