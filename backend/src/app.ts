import { OpenAPIHono } from "@hono/zod-openapi"
import { cors } from "hono/cors"
import { HTTPException } from "hono/http-exception"
import { bodyLimit } from "hono/body-limit"
import { secureHeaders } from "hono/secure-headers"
import { env } from "./env"
import { isNulByteError } from "./lib/errors"
import { logger } from "./lib/logger"
import { prisma } from "./lib/prisma"
import { createApiRouter } from "./routes"
import type { UserRole } from "@rendez/schema"

interface AppVariables {
  requestId: string

  userId: string

  userRole?: UserRole

  cacheHit?: boolean
}

export type AppEnv = {
  Variables: AppVariables

  Bindings: { remoteAddress?: string }
}

export function createApp() {
  const app = new OpenAPIHono<AppEnv>({
    defaultHook: (result, c) => {
      if (!result.success) {
        const message = result.error.issues[0]?.message ?? "Dữ liệu không hợp lệ"
        return c.json({ message }, 400)
      }
    },
  })

  // Request id: sinh sớm để mọi log/lỗi đều có mã đối chiếu.
  app.use("*", async (c, next) => {
    const requestId = crypto.randomUUID()
    c.set("requestId", requestId)
    c.header("X-Request-Id", requestId)
    await next()
  })

  if (env.corsOrigins.length > 0) {
    app.use(
      "*",
      cors({
        origin: env.corsOrigins,
        credentials: true,
        allowHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
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

  // Structured log một dòng/request: không log query string (có thể chứa từ khoá).
  app.use("*", async (c, next) => {
    const startedAt = performance.now()
    await next()
    const durationMs = Math.round(performance.now() - startedAt)
    const status = c.res.status
    const payload = {
      requestId: c.get("requestId"),
      method: c.req.method,
      path: c.req.path,
      status,
      durationMs,
    }
    if (status >= 500) logger.error(payload, "request")
    else if (status >= 400 || durationMs > 1000) logger.warn(payload, "request")
    else logger.info(payload, "request")
  })

  app.get("/healthz", (c) => c.json({ status: "ok" }))

  app.get("/readyz", async (c) => {
    try {
      await prisma.$queryRaw`SELECT 1`
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
