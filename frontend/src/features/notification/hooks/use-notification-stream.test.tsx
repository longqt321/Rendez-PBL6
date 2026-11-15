import { cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { createTestQueryClient } from "@/test/query-test-utils"
import { useNotificationStream } from "./use-notification-stream"

const state = vi.hoisted((): { me: { id: string } | undefined } => ({ me: { id: "u-me" } }))

vi.mock("@/features/profile/hooks/use-me", () => ({
  useMe: () => ({ data: state.me }),
}))

vi.mock("@/lib/env", () => ({
  env: { enableMocks: false, apiBaseUrl: "/api/v1" },
}))

const sources: { url: string; closed: boolean }[] = []

class FakeEventSource {
  url: string
  closed = false

  constructor(url: string) {
    this.url = url
    sources.push(this)
  }

  addEventListener(): void {}

  close(): void {
    this.closed = true
  }
}

beforeEach(() => {
  sources.length = 0
  vi.stubGlobal("EventSource", FakeEventSource)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderStream() {
  const client = createTestQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return renderHook(() => useNotificationStream(), { wrapper })
}

describe("useNotificationStream", () => {
  it("guest chưa đăng nhập không mở EventSource", () => {
    state.me = undefined
    renderStream()

    expect(sources).toHaveLength(0)
  })

  it("đã đăng nhập thì mở stream GET /notifications/events", () => {
    state.me = { id: "u-me" }
    renderStream()

    expect(sources).toHaveLength(1)
    expect(sources[0].url).toBe("/api/v1/notifications/events")
  })

  it("unmount thì đóng stream", () => {
    state.me = { id: "u-me" }
    const { unmount } = renderStream()
    unmount()

    expect(sources[0].closed).toBe(true)
  })

  it("đăng xuất (me về undefined) thì đóng stream", () => {
    state.me = { id: "u-me" }
    const { rerender } = renderStream()
    expect(sources).toHaveLength(1)

    state.me = undefined
    rerender()

    expect(sources[0].closed).toBe(true)
  })
})
