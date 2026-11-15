import { useEffect, useRef, useState } from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { FILTER_SHARED_PATHS } from "@/components/layout/nav-items"

export function useSearchQuerySync() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()

  const isSearchPage = location.pathname === "/search"

  const isFilterPage = FILTER_SHARED_PATHS.includes(location.pathname)
  const urlQuery = isSearchPage || isFilterPage ? (params.get("q") ?? "") : ""

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
      void navigate("/discover", { replace: true })
      return
    }

    void setParams({ q: trimmed }, { replace: true })
  }, [debouncedDraft, draft, isSearchPage, urlQuery, navigate, setParams])

  const submit = () => {
    const trimmed = draft.trim()
    void navigate(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/discover")
  }

  return { draft, setDraft, submit }
}
