import { useCallback, useEffect, useRef, useState } from "react"
import { parseAsString, useQueryState } from "nuqs"
import { useLocation, useNavigate } from "react-router"
import { useDebounce } from "@uidotdev/usehooks"
import { FILTER_SHARED_PATHS } from "@/components/layout/nav-items"

export function useSearchQuerySync() {
  const navigate = useNavigate()
  const location = useLocation()
  const [qParam, setQParam] = useQueryState(
    "q",
    parseAsString.withDefault("").withOptions({ history: "replace", shallow: false }),
  )

  const isSearchPage = location.pathname === "/search"
  const isFilterPage = FILTER_SHARED_PATHS.includes(location.pathname)
  const urlQuery = isSearchPage || isFilterPage ? qParam : ""

  const [draft, setDraft] = useState(urlQuery)
  const debouncedDraft = useDebounce(draft, 280)
  const lastWritten = useRef(urlQuery)
  const urlQueryRef = useRef(urlQuery)

  useEffect(() => {
    urlQueryRef.current = urlQuery
    if (urlQuery === lastWritten.current) return
    if (draft.trim() !== lastWritten.current) return
    lastWritten.current = urlQuery
    setDraft(urlQuery)
  }, [urlQuery, draft])

  useEffect(() => {
    if (!isSearchPage && !isFilterPage) return
    if (debouncedDraft !== draft) return

    const trimmed = debouncedDraft.trim()
    if (trimmed === urlQueryRef.current) {
      lastWritten.current = trimmed
      return
    }

    lastWritten.current = trimmed
    if (isFilterPage) {
      void setQParam(trimmed || null)
      return
    }

    if (trimmed.length === 0) {
      void navigate("/discover", { replace: true })
      return
    }

    void setQParam(trimmed)
  }, [debouncedDraft, draft, isSearchPage, isFilterPage, navigate, setQParam])

  const submit = useCallback(() => {
    const trimmed = draft.trim()
    lastWritten.current = trimmed
    if (isFilterPage) {
      void setQParam(trimmed || null)
      return
    }
    void navigate(trimmed ? `/discover?q=${encodeURIComponent(trimmed)}` : "/discover")
  }, [draft, isFilterPage, navigate, setQParam])

  const clear = useCallback(() => {
    lastWritten.current = ""
    setDraft("")
    if (isFilterPage) {
      void setQParam(null)
    } else if (isSearchPage) {
      void navigate("/discover", { replace: true })
    }
  }, [isFilterPage, isSearchPage, navigate, setQParam])

  return { draft, setDraft, submit, clear, isFilterPage }
}
