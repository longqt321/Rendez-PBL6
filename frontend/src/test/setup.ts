import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"

afterEach(() => {
  cleanup()
})

if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

// jsdom chưa có ResizeObserver — base-ui dùng cho popover/tooltip.
if (typeof window !== "undefined" && !("ResizeObserver" in window)) {
  class ResizeObserverMock {
    private readonly elements = new Set<Element>()

    observe(target: Element) {
      this.elements.add(target)
    }

    unobserve(target: Element) {
      this.elements.delete(target)
    }

    disconnect() {
      this.elements.clear()
    }
  }
  Object.defineProperty(window, "ResizeObserver", {
    writable: true,
    value: ResizeObserverMock,
  })
}
