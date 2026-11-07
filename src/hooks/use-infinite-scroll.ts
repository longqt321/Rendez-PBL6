import { useEffect, useRef } from "react"

interface UseInfiniteScrollOptions {
  /** Còn dữ liệu để tải hay không */
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
  /** Khoảng cách (px) trước khi chạm đáy thì bắt đầu tải */
  rootMargin?: string
}

/**
 * Tự động gọi `fetchNextPage` khi phần tử sentinel lọt vào viewport.
 * Dùng IntersectionObserver — không cần thư viện ngoài.
 */
export function useInfiniteScroll<T extends HTMLElement = HTMLDivElement>({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  rootMargin = "400px",
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<T | null>(null)

  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return
    if (!hasNextPage || isFetchingNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          fetchNextPage()
        }
      },
      { rootMargin },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, rootMargin])

  return sentinelRef
}
