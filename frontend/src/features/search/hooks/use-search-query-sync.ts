import { useCallback, useEffect, useRef, useState } from "react"
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
  const debouncedDraft = useDebouncedValue(draft, 280)
  const lastWritten = useRef(urlQuery)

  useEffect(() => {
    if (urlQuery === lastWritten.current) return
    lastWritten.current = urlQuery
    setDraft(urlQuery)
  }, [urlQuery])

  const patchFilterQuery = useCallback(
    (trimmed: string) => {
      setParams(
        (prev) => {
          const updated = new URLSearchParams(prev)
          if (trimmed) updated.set("q", trimmed)
          else updated.delete("q")
          return updated
        },
        { replace: true },
      )
    },
    [setParams],
  )

  useEffect(() => {
    if (!isSearchPage && !isFilterPage) return
    if (debouncedDraft !== draft) return

    const trimmed = draft.trim()
    if (trimmed === urlQuery) return

    lastWritten.current = trimmed
    if (isFilterPage) {
      patchFilterQuery(trimmed)
      return
    }

    if (trimmed.length === 0) {
      void navigate("/discover", { replace: true })
      return
    }

    void setParams({ q: trimmed }, { replace: true })
  }, [
    debouncedDraft,
    draft,
    isSearchPage,
    isFilterPage,
    urlQuery,
    navigate,
    setParams,
    patchFilterQuery,
  ])

  const submit = useCallback(() => {
    const trimmed = draft.trim()
    lastWritten.current = trimmed
    if (isFilterPage) {
      patchFilterQuery(trimmed)
      return
    }
    void navigate(trimmed ? `/discover?q=${encodeURIComponent(trimmed)}` : "/discover")
  }, [draft, isFilterPage, navigate, patchFilterQuery])

  const clear = useCallback(() => {
    lastWritten.current = ""
    setDraft("")
    if (isFilterPage) {
      patchFilterQuery("")
    } else if (isSearchPage) {
      void navigate("/discover", { replace: true })
    }
  }, [isFilterPage, isSearchPage, navigate, patchFilterQuery])

  return { draft, setDraft, submit, clear, isFilterPage }
}
