import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import type { DiscoverSort } from "../api/get-places"
import type { PlaceCategory } from "../types/place"

const VALID_CATEGORIES: PlaceCategory[] = [
  "cafe",
  "restaurant",
  "street-food",
  "bakery",
  "dessert",
  "bar",
]

const VALID_SORTS: DiscoverSort[] = ["newest", "rating", "distance"]

export interface DiscoverFiltersState {
  category: PlaceCategory | "all"

  district: string

  query: string

  draftQuery: string
  setDraftQuery: (value: string) => void

  priceMax: 1 | 2 | 3 | "all"
  setPriceMax: (value: 1 | 2 | 3 | "all") => void

  sort: DiscoverSort
  setSort: (value: DiscoverSort) => void

  setCoords: (coords: { lat: number; lng: number } | null) => void

  isNearbyActive: boolean
  setCategory: (value: PlaceCategory | "all") => void
  setDistrict: (value: string) => void

  setIsNearbyActive: (value: boolean) => void

  resetAll: () => void
  activeFilterCount: number
}

export function useDiscoverFilters(): DiscoverFiltersState {
  const [params, setParams] = useSearchParams()

  const rawCategory = params.get("category") ?? "all"
  const category = VALID_CATEGORIES.includes(rawCategory as PlaceCategory)
    ? (rawCategory as PlaceCategory)
    : "all"
  const district = params.get("district") ?? "all"
  const query = params.get("q") ?? ""

  const rawSort = params.get("sort")
  const sort: DiscoverSort =
    rawSort && VALID_SORTS.includes(rawSort as DiscoverSort) ? (rawSort as DiscoverSort) : "newest"

  const rawPriceMax = Number(params.get("priceMax"))
  const priceMax: 1 | 2 | 3 | "all" = [1, 2, 3].includes(rawPriceMax)
    ? (rawPriceMax as 1 | 2 | 3)
    : "all"

  // Tương thích ngược: `?nearby=1` (link cũ) → `sort=distance`; `sort` thắng
  // khi cả hai cùng xuất hiện. Chuẩn hoá ngay bằng `replace` để URL sạch.
  const hasLegacyNearby = params.get("nearby") === "1"
  useEffect(() => {
    if (!hasLegacyNearby) return
    const updated = new URLSearchParams(params)
    updated.delete("nearby")
    if (!updated.get("sort")) updated.set("sort", "distance")
    setParams(updated, { replace: true })
  }, [hasLegacyNearby, params, setParams])

  const effectiveSort: DiscoverSort = sort === "newest" && hasLegacyNearby ? "distance" : sort
  const isNearbyActive = effectiveSort === "distance"

  const patch = useCallback(
    (next: Record<string, string | null>) => {
      setParams(
        (prev) => {
          const updated = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(next)) {
            if (value === null || value === "" || value === "all") updated.delete(key)
            else updated.set(key, value)
          }
          return updated
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const [draftQuery, setDraftQuery] = useState(query)
  const debouncedDraft = useDebouncedValue(draftQuery, 300)

  const lastWritten = useRef(query)

  // URL đổi từ bên ngoài (back/forward, link chia sẻ) → nạp lại ô nhập.
  useEffect(() => {
    if (query === lastWritten.current) return
    lastWritten.current = query
    setDraftQuery(query)
  }, [query])

  useEffect(() => {
    if (debouncedDraft !== draftQuery) return
    const trimmed = draftQuery.trim()
    if (trimmed === query) return
    lastWritten.current = trimmed
    patch({ q: trimmed })
  }, [debouncedDraft, draftQuery, query, patch])

  const setSort = useCallback(
    (value: DiscoverSort) => patch({ sort: value === "newest" ? null : value, nearby: null }),
    [patch],
  )

  const setCoords = useCallback(
    (coords: { lat: number; lng: number } | null) => {
      const lat = coords ? coords.lat.toFixed(4) : null
      const lng = coords ? coords.lng.toFixed(4) : null
      if ((params.get("lat") ?? null) === lat && (params.get("lng") ?? null) === lng) return
      patch({ lat, lng })
    },
    [patch, params],
  )

  const activeFilterCount = useMemo(
    () =>
      (category === "all" ? 0 : 1) +
      (district === "all" ? 0 : 1) +
      (query.trim() ? 1 : 0) +
      (priceMax === "all" ? 0 : 1) +
      (isNearbyActive ? 1 : 0),
    [category, district, query, priceMax, isNearbyActive],
  )

  return {
    category,
    district,
    query,
    draftQuery,
    setDraftQuery,
    priceMax,
    setPriceMax: (value) => patch({ priceMax: value === "all" ? null : String(value) }),
    sort: effectiveSort,
    setSort,
    setCoords,
    isNearbyActive,
    setCategory: (value) => patch({ category: value }),
    setDistrict: (value) => patch({ district: value }),
    setIsNearbyActive: (value) => setSort(value ? "distance" : "newest"),
    resetAll: () => {
      lastWritten.current = ""
      setDraftQuery("")
      patch({
        category: null,
        district: null,
        q: null,
        priceMax: null,
        sort: null,
        nearby: null,
        lat: null,
        lng: null,
      })
    },
    activeFilterCount,
  }
}
