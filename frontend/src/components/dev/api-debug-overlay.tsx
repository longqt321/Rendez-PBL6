import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import type { PageMeta } from "@/types/api"

/**
 * Overlay dev: request list gần nhất + metadata server (`meta`).
 *
 * Bật/tắt bằng Ctrl+Shift+D. Chỉ tồn tại ở dev — bản PROD trả `null` ngay từ
 * component ngoài nên không có listener/hook nào chạy. Dữ liệu đọc thẳng từ
 * react-query cache (không gọi thêm API, không tự đo lại thời gian).
 */
export function ApiDebugOverlay() {
  // `import.meta.env.PROD` được Vite thay bằng hằng số lúc build → nhánh này bị
  // tree-shake khỏi bundle production.
  if (import.meta.env.PROD) return null
  return <ApiDebugOverlayInner />
}

interface LatestRequest {
  label: string
  meta: PageMeta
}

/** Nhãn endpoint từ query key `["places", category, district, query, …]`. */
function describePlacesRequest(key: readonly unknown[]): string {
  const query = typeof key[3] === "string" ? key[3] : ""
  return query ? `GET /api/v1/places?q=${encodeURIComponent(query)}` : "GET /api/v1/places"
}

function ApiDebugOverlayInner() {
  const queryClient = useQueryClient()
  const [visible, setVisible] = useState(false)
  const [latest, setLatest] = useState<LatestRequest | null>(null)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "d") {
        event.preventDefault()
        setVisible((value) => !value)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    const cache = queryClient.getQueryCache()

    function readLatest() {
      // Chỉ quan tâm truy vấn danh sách địa điểm; lấy request cập nhật gần nhất.
      const candidates = cache
        .getAll()
        .filter((query) => query.queryKey[0] === "places" && query.state.data !== undefined)
        .sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt)
      const newest = candidates[0]
      // `useInfiniteQuery` lưu `{ pages, pageParams }` — meta của trang đầu là
      // metadata của lần gọi gần nhất (mọi trang cùng một request gốc).
      const data = newest?.state.data as { pages?: { meta?: PageMeta }[] } | undefined
      const meta = data?.pages?.[0]?.meta
      setLatest(newest && meta ? { label: describePlacesRequest(newest.queryKey), meta } : null)
    }

    readLatest()
    return cache.subscribe(readLatest)
  }, [queryClient])

  if (!visible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-2 bottom-2 z-50 max-w-[calc(100vw-1rem)] rounded-md border border-border bg-background/95 px-2 py-1 font-mono text-xs leading-5 text-muted-foreground shadow-(--shadow-soft) backdrop-blur"
    >
      {latest ? (
        <>
          {latest.label} · {latest.meta.tookMs}ms · cache: {latest.meta.cacheHit ? "HIT" : "MISS"} ·{" "}
          {latest.meta.totalResults} kết quả
          {latest.meta.didYouMean ? ` · didYouMean: ${latest.meta.didYouMean}` : null}
        </>
      ) : (
        "Chưa có request địa điểm nào"
      )}
    </div>
  )
}
