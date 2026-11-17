import { useEffect, useRef } from "react"
import { useIntersectionObserver } from "@uidotdev/usehooks"

interface UseInfiniteScrollOptions {
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => unknown

  rootMargin?: string
}

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
