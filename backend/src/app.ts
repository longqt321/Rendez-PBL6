import { Hono } from "hono"
import { cors } from "hono/cors"
import { routePath } from "hono/route"
import { HTTPException } from "hono/http-exception"
import { bodyLimit } from "hono/body-limit"
import { secureHeaders } from "hono/secure-headers"
import { env } from "./env"
import { isNulByteError } from "./lib/errors"
import { db, sql } from "./lib/kysely"
import { logger } from "./lib/logger"
import { pushObservabilityEvent } from "./lib/observability-store"
import {
  generateTraceId,
  parseTraceparent,
  runWithRequestContext,
  type RequestContextStore,
} from "./lib/request-context"
import { createApiRouter } from "./routes"
import type { UserRole } from "@rendez/schema"

interface AppVariables {
  requestId: string

  traceId: string

  userId: string

  userRole?: UserRole

  cacheHit?: boolean
}

const SAFE_REQUEST_ID_RE = /^[A-Za-z0-9_-]{8,64}$/

export type AppEnv = {
  Variables: AppVariables

  Bindings: { remoteAddress?: string }
}

export function createApp() {
  const app = new Hono<AppEnv>()

  // Request context + Canonical Log Line: sinh/kế thừa trace_id sớm để mọi log/lỗi đều có mã đối chiếu.
  app.use("*", async (c, next) => {
    const incomingRequestId = c.req.header("x-request-id")?.trim()
    const requestId =
      incomingRequestId && SAFE_REQUEST_ID_RE.test(incomingRequestId)
        ? incomingRequestId
        : crypto.randomUUID()
    const traceId = parseTraceparent(c.req.header("traceparent")) ?? generateTraceId()

    const store: RequestContextStore = {
      requestId,
      traceId,
      dbMs: 0,
      dbCount: 0,
      redisMs: 0,
      embedMs: 0,
      externalMs: 0,
    }

    c.set("requestId", requestId)
    c.set("traceId", traceId)
    c.header("X-Request-Id", requestId)

    const startedAt = performance.now()
    await runWithRequestContext(store, () => next())

    const durationMs = Math.round(performance.now() - startedAt)
    const status = c.res.status
    const matchedRoute = routePath(c)
    const route = matchedRoute && matchedRoute !== "/*" ? matchedRoute : c.req.path
    const dbMs = Math.round(store.dbMs)
    const redisMs = Math.round(store.redisMs)
    const embedMs = Math.round(store.embedMs)
    const externalMs = Math.round(store.externalMs)
    const appMs = Math.max(0, durationMs - dbMs - redisMs - embedMs - externalMs)

    const payload = {
      type: "canonical_request",
      "http.request.method": c.req.method,
      "http.route": route,
      "url.path": c.req.path,
      "http.response.status_code": status,
      duration_ms: durationMs,
      ...(c.get("cacheHit") !== undefined || store.cacheHit !== undefined
        ? { "cache.hit": c.get("cacheHit") ?? store.cacheHit }
        : {}),
      timing: {
        db_ms: dbMs,
        db_count: store.dbCount,
        redis_ms: redisMs,
        embed_ms: embedMs,
        external_ms: externalMs,
        app_ms: appMs,
      },
    }

    const isLowValueProbe =
      status === 200 &&
      (c.req.path === "/healthz" ||
        c.req.path === "/readyz" ||
        c.req.path.startsWith("/api/v1/tiles/"))

    if (status >= 500) logger.error(payload, "request")
    else if (status >= 400 || durationMs > 500) logger.warn(payload, "request")
    else if (isLowValueProbe) logger.debug(payload, "request")
    else logger.info(payload, "request")

    if (status >= 500 || durationMs > 500) {
      pushObservabilityEvent({
        kind: status >= 500 ? "server_error" : "slow_request",
        requestId,
        traceId,
        method: c.req.method,
        route,
        status,
        durationMs,
        timing: {
          dbMs,
          dbCount: store.dbCount,
          redisMs,
          embedMs,
          externalMs,
          appMs,
        },
      })
    }
  })

  if (env.corsOrigins.length > 0) {
    app.use(
      "*",
      cors({
        origin: env.corsOrigins,
        credentials: true,
        allowHeaders: [
          "Content-Type",
          "Authorization",
          "Idempotency-Key",
          "traceparent",
          "X-Request-Id",
          "X-Anon-Id",
        ],
        exposeHeaders: ["X-Request-Id"],
      }),
    )
  }

  // Header bảo mật mặc định của Hono (HSTS bật sẵn). API chỉ trả JSON nên
  // CSP khoá cứng `default-src 'none'`; Permissions-Policy tắt mọi tính năng
  // trình duyệt không cần (nikto 2026-11-11 báo thiếu 2 header này).
  app.use(
    "*",
    secureHeaders({
      crossOriginResourcePolicy: false,
      contentSecurityPolicy: { defaultSrc: ["'none'"] },
      permissionsPolicy: {
        camera: [],
        geolocation: [],
        microphone: [],
        payment: [],
        usb: [],
      },
    }),
  )
  app.use("*", async (c, next) => {
    await next()
    const isPublicMediaOrTile =
      c.req.path.startsWith("/api/v1/media/files/") || c.req.path.startsWith("/api/v1/tiles/")
    c.header("Cross-Origin-Resource-Policy", isPublicMediaOrTile ? "cross-origin" : "same-origin")
  })

  // JSON API 1MB là dư; route fallback upload ảnh local cho phép tối đa 5MB.
  app.use("*", async (c, next) => {
    const isLocalMediaUpload =
      c.req.method === "PUT" && c.req.path.startsWith("/api/v1/media/upload/")
    const maxSize = isLocalMediaUpload ? 5 * 1024 * 1024 : 1024 * 1024
    return bodyLimit({
      maxSize,
      onError: (ctx) => ctx.json({ message: "Nội dung request quá lớn" }, 413),
    })(c, next)
  })

  app.get("/healthz", (c) => c.json({ status: "ok" }))

  app.get("/readyz", async (c) => {
    try {
      await sql`SELECT 1`.execute(db)
      return c.json({ status: "ok" })
    } catch (error) {
      logger.error({ err: error }, "readyz: DB không trả lời")
      return c.json({ status: "unavailable" }, 503)
    }
  })

  // Toàn bộ API nghiệp vụ dưới `/api/v1` (K1). Health có cả ở root (infra) và
  // trong prefix (client/contract test) — cùng một handler, không lặp logic.
  app.route("/api/v1", createApiRouter())

  app.notFound((c) => c.json({ message: "Không tìm thấy" }, 404))

  app.onError((err, c) => {
    const requestId = c.get("requestId")

    if (err instanceof HTTPException) {
      const response = err.getResponse()
      // `getResponse()` không biết Context → phải tự gắn lại X-Request-Id.
      const headers = new Headers(response.headers)
      if (requestId) headers.set("X-Request-Id", requestId)
      return new Response(response.body, { status: response.status, headers })
    }

    // Lưu ý: KHÔNG có nhánh `instanceof ZodError` — `ZodError` của zod 4 không phải
    // `instanceof Error`, và Hono chỉ chuyển lỗi `instanceof Error` cho `onError`
    // (hono/dist/compose.js), nên nhánh đó sẽ là code chết. Mọi validate đều dùng
    // `safeParse`/`defaultHook` và trả 400 trực tiếp, không ném ZodError.

    // Postgres từ chối ký tự NUL trong text — lỗi đầu vào, không phải hệ thống.
    if (isNulByteError(err)) {
      return c.json({ message: "Dữ liệu chứa ký tự không hợp lệ" }, 400)
    }

    logger.error(
      {
        err,
        requestId,
        method: c.req.method,
        path: c.req.path,
      },
      "unhandled error",
    )
    // Không trả stack/SQL ra ngoài (G1).
    return c.json(
      { message: "Có lỗi từ máy chủ, vui lòng thử lại sau.", code: "INTERNAL" },
      500,
      requestId ? { "X-Request-Id": requestId } : undefined,
    )
  })

  return app
}

export type App = ReturnType<typeof createApp>
