import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { secureHeaders } from "hono/secure-headers";
import { ZodError } from "zod";
import { env } from "./env";
import { logger } from "./lib/logger";

/** Biến gắn theo request — middleware đặt, handler/onError đọc. */
interface AppVariables {
  requestId: string;
}

export type AppEnv = { Variables: AppVariables };

/**
 * App factory — tách khỏi `server.ts` để test gọi `app.request()` trực tiếp
 * (không mở cổng, không cần Postgres cho `/healthz`).
 *
 * Phase 0 chỉ có health check + hạ tầng lỗi/log. Không có route nghiệp vụ.
 */
export function createApp() {
  const app = new OpenAPIHono<AppEnv>({
    /**
     * Lỗi validate của `@hono/zod-openapi` không đi qua `onError` — hook này
     * đổi shape về `{ message }` cho khớp `toApiError` của FE (D6).
     */
    defaultHook: (result, c) => {
      if (!result.success) {
        const message =
          result.error.issues[0]?.message ?? "Dữ liệu không hợp lệ";
        return c.json({ message }, 400);
      }
    },
  });

  // Request id: sinh sớm để mọi log/lỗi đều có mã đối chiếu.
  app.use("*", async (c, next) => {
    const requestId = crypto.randomUUID();
    c.set("requestId", requestId);
    c.header("X-Request-Id", requestId);
    await next();
  });

  if (env.corsOrigins.length > 0) {
    app.use(
      "*",
      cors({
        origin: env.corsOrigins,
        credentials: true,
        allowHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
      }),
    );
  }

  // Header bảo mật mặc định của Hono (HSTS bật sẵn; CSP tắt — API không trả HTML).
  app.use("*", secureHeaders());

  // Structured log một dòng/request: không log query string (có thể chứa từ khoá).
  app.use("*", async (c, next) => {
    const startedAt = performance.now();
    await next();
    const durationMs = Math.round(performance.now() - startedAt);
    const status = c.res.status;
    const payload = {
      requestId: c.get("requestId"),
      method: c.req.method,
      path: c.req.path,
      status,
      durationMs,
    };
    if (status >= 500) logger.error(payload, "request");
    else if (status >= 400 || durationMs > 1000)
      logger.warn(payload, "request");
    else logger.info(payload, "request");
  });

  /** Liveness — không chạm DB, dùng cho load balancer/rolling deploy (G4). */
  app.get("/healthz", (c) => c.json({ status: "ok" }));

  app.notFound((c) => c.json({ message: "Không tìm thấy" }, 404));

  app.onError((err, c) => {
    const requestId = c.get("requestId");

    if (err instanceof HTTPException) {
      const response = err.getResponse();
      // `getResponse()` không biết Context → phải tự gắn lại X-Request-Id.
      const headers = new Headers(response.headers);
      if (requestId) headers.set("X-Request-Id", requestId);
      return new Response(response.body, { status: response.status, headers });
    }

    if (err instanceof ZodError) {
      const message = err.issues[0]?.message ?? "Dữ liệu không hợp lệ";
      return c.json({ message }, 400);
    }

    logger.error(
      {
        err,
        requestId,
        method: c.req.method,
        path: c.req.path,
      },
      "unhandled error",
    );
    // Không trả stack/SQL ra ngoài (G1).
    return c.json(
      { message: "Máy chủ trả lỗi — thử lại sau.", code: "INTERNAL" },
      500,
      requestId ? { "X-Request-Id": requestId } : undefined,
    );
  });

  return app;
}

export type App = ReturnType<typeof createApp>;
