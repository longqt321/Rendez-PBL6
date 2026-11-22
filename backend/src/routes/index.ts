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
import { createTilesRouter } from "./tiles"
import { createOgRouter } from "./og"
import { createSystemRouter } from "./system"
import { createEventsRouter } from "./events"
import { createTelemetryRouter } from "./telemetry"
import { createAdminRouter } from "./admin"
import { createLocationRouter } from "./location"

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

export function createApiRouter() {
  const api = new OpenAPIHono<AppEnv>()

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

  // Upload ảnh presigned R2 + local fallback (Phase 7).
  api.route("/", createMediaRouter())

  // Proxy + Disk Cache + Multi-CDN Fallback cho bản đồ OSM.
  api.route("/", createTilesRouter())

  // HTML meta Open Graph cho bot preview (`/og/place/:id`, `/og/post/:id`).
  api.route("/", createOgRouter())

  // Số liệu vận hành cho demo (`/system/stats`, `/system/reset`).
  api.route("/", createSystemRouter())

  // Thu thập sự kiện tương tác (P0 đo lường) — `/events`.
  api.route("/", createEventsRouter())

  // Thu thập client errors & Core Web Vitals (RUM) — `/telemetry`.
  api.route("/", createTelemetryRouter())

  // Quản trị và nhật ký hoạt động — `/admin/*`.
  api.route("/", createAdminRouter())

  // Mốc vị trí cá nhân, địa danh thành phố & đồng bộ GPS — `/landmarks`, `/me/anchors`, `/me/location`.
  api.route("/", createLocationRouter())

  return api
}
