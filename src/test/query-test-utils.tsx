import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor, type RenderHookResult } from "@testing-library/react"
import type { ReactNode } from "react"

/**
 * Helper dùng chung cho test hook dữ liệu.
 *
 * Mọi test hook bọc `QueryClientProvider` với `QueryClient` mới (retry: false
 * để lỗi hiện ngay thay vì thử lại). Không mock module `@/lib/axios` — test
 * gọi axios thật qua `mockAdapter` của `src/mocks/server.ts` (adapter tự nạp
 * khi `import.meta.env.DEV`, vitest chạy ở dev mode nên luôn kích hoạt).
 */

/** QueryClient mỗi test một instance — tránh chia sẻ cache giữa các test. */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

/** Render một hook bên trong QueryClientProvider. */
export function renderWithQuery<TResult>(callback: () => TResult): RenderHookResult<TResult, void> {
  const client = createTestQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return renderHook(callback, { wrapper })
}

/**
 * Chờ query kết thúc. Timeout lớn hơn mặc định vì mock server cố tình trễ
 * `RESPONSE_DELAY_MS` (320ms) mỗi request — phân trang cần nhiều request.
 */
export function waitForQuery<T>(callback: () => T): Promise<T> {
  return waitFor(callback, { timeout: 5_000 })
}
