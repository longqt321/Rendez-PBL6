import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor, type RenderHookResult } from "@testing-library/react"
import type { ReactNode } from "react"

export function createTestQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

export function renderWithQuery<TResult>(
  callback: () => TResult,
  client: QueryClient = createTestQueryClient(),
): RenderHookResult<TResult, void> {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return renderHook(callback, { wrapper })
}

export function waitForQuery<T>(callback: () => T): Promise<T> {
  return waitFor(callback, { timeout: 5_000 })
}
