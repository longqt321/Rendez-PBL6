import { useEffect, useRef, useState } from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router"
import { useDebouncedValue } from "@/hooks/use-debounced-value"

/**
 * Đồng bộ ô tìm kiếm duy nhất ở topbar với `?q=` của `/search`.
 *
 * - Ở `/search`: gõ → ghi `?q=` sau 300 ms (`replace`) để kết quả cập nhật liền,
 *   không làm rối lịch sử.
 * - Ở trang khác: không tự ghi URL; chỉ điều hướng khi bấm Enter.
 * - Xoá hết từ khoá khi đang ở `/search` → về `/discover`, vì trang tìm kiếm
 *   không còn gì để hiển thị.
 *
 * `lastWritten` giữ giá trị cuối cùng hook này tự ghi vào URL, nhờ đó phân biệt
 * "URL đổi vì mình vừa ghi" (bỏ qua) với "URL đổi từ bên ngoài" (nạp lại ô nhập).
 */
export function useSearchQuerySync() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()

  const isSearchPage = location.pathname === "/search"
  const urlQuery = isSearchPage ? (params.get("q") ?? "") : ""

  const [draft, setDraft] = useState(urlQuery)
  const debouncedDraft = useDebouncedValue(draft, 300)
  const lastWritten = useRef(urlQuery)

  // URL đổi từ bên ngoài (back/forward, link chia sẻ) → nạp lại vào ô nhập.
  useEffect(() => {
    if (urlQuery === lastWritten.current) return
    lastWritten.current = urlQuery
    setDraft(urlQuery)
  }, [urlQuery])

  // Ngừng gõ 300 ms → ghi từ khoá vào URL. Bỏ qua khi debounce chưa ổn định
  // (`debouncedDraft !== draft`) để không ghi giá trị cũ.
  useEffect(() => {
    if (!isSearchPage) return
    if (debouncedDraft !== draft) return

    const trimmed = draft.trim()
    if (trimmed === urlQuery) return

    lastWritten.current = trimmed
    if (trimmed.length === 0) {
      navigate("/discover", { replace: true })
      return
    }

    setParams({ q: trimmed }, { replace: true })
  }, [debouncedDraft, draft, isSearchPage, urlQuery, navigate, setParams])

  const submit = () => {
    const trimmed = draft.trim()
    navigate(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/discover")
  }

  return { draft, setDraft, submit }
}
