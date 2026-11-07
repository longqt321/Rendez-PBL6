import { useEffect, useRef } from "react"
import { useIntersectionObserver } from "@uidotdev/usehooks"

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
 *
 * Dùng `useIntersectionObserver` của `@uidotdev/usehooks` (đã cài) thay vì tự
 * dựng `IntersectionObserver` + `useEffect`.
 *
 * Trả về callback ref — gắn vào một `<div>` ở cuối danh sách.
 */
export function useInfiniteScroll({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  rootMargin = "400px",
}: UseInfiniteScrollOptions) {
  const [ref, entry] = useIntersectionObserver({ rootMargin, threshold: 0 })

  // Giữ `fetchNextPage` mới nhất trong ref để callback không bị tạo lại mỗi render.
  const fetchRef = useRef(fetchNextPage)
  useEffect(() => {
    fetchRef.current = fetchNextPage
  }, [fetchNextPage])

  useEffect(() => {
    if (!entry?.isIntersecting) return
    if (!hasNextPage || isFetchingNextPage) return
    fetchRef.current()
  }, [entry, hasNextPage, isFetchingNextPage])

  return ref
}
