import type { AxiosAdapter } from "axios"
import {
  LIST_ROUTES,
  RESPONSE_DELAY_MS,
  created,
  networkError,
  notFound,
  ok,
  recordMockMetric,
  scenario,
  serverError,
  serviceUnavailable,
  unauthorized,
  wait,
  type Route,
} from "./server/context"
import { adminMockRoutes } from "./server/routes-admin"
import { placeMockRoutes } from "./server/routes-places"
import { roomMockRoutes } from "./server/routes-rooms"
import { socialAuthMockRoutes } from "./server/routes-social-auth"

const routes: Route[] = [
  ...placeMockRoutes,
  ...socialAuthMockRoutes,
  ...roomMockRoutes,
  ...adminMockRoutes,
]

export const mockAdapter: AxiosAdapter = async (config) => {
  // Delay gồm cả kịch bản `slow` — giữ nguyên cơ chế cancel signal của `wait`.
  await wait(RESPONSE_DELAY_MS + scenario.delayMs, config)

  const method = (config.method ?? "get").toLowerCase()
  const path = (config.url ?? "").split("?")[0].replace(/\/$/, "") || "/"
  recordMockMetric(method, path)

  // Kịch bản `offline`: mọi method đều lỗi mạng (status 0, không response).
  if (scenario.offline) networkError(config, "Không có kết nối mạng (kịch bản offline)")

  // `media-unavailable`: giả lập backend chưa cấu hình R2 → composer ẩn nút upload.
  if (scenario.mediaUnavailable && method === "post" && path === "/media") {
    serviceUnavailable(config, "Tính năng upload ảnh chưa được cấu hình")
  }

  // Các kịch bản còn lại chỉ áp dụng cho GET — mutation vẫn hoạt động bình thường.
  if (method === "get") {
    if (scenario.serverError) serverError(config, "Lỗi máy chủ (kịch bản server-error)")
    if (scenario.unauthorized && path === "/me") unauthorized(config, "Chưa đăng nhập")
    if (scenario.emptyLists && LIST_ROUTES.some((pattern) => pattern.test(path))) {
      return ok(config, { items: [], next: null })
    }
  }

  for (const route of routes) {
    if (route.method !== method) continue
    const match = route.pattern.exec(path)
    if (!match) continue
    const data = route.handler(config, match.slice(1))
    return route.status === 201 ? created(config, data) : ok(config, data)
  }

  notFound(config, `Không có route ${method.toUpperCase()} ${path}`)
}
