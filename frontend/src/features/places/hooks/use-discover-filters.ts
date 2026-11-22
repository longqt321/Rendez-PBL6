import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"
import {
  parseNaturalFilterQuery,
  removeChipFromQuery,
  type ParsedFilterChip,
  type ParsedNaturalQuery,
} from "@rendez/schema"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import type { DiscoverSort } from "../api/get-places"
import type { PlaceCategory } from "../types/place"

export type PriceMaxFilter = 1 | 2 | 3 | "all"

const PLACE_CATEGORIES = [
  "cafe",
  "restaurant",
  "street-food",
  "bakery",
  "dessert",
  "bar",
] as const satisfies readonly PlaceCategory[]

const DISCOVER_SORTS = ["newest", "rating", "distance"] as const satisfies readonly DiscoverSort[]

const PRICE_LEVELS = ["1", "2", "3"] as const

const discoverSearchParsers = {
  category: parseAsStringLiteral(PLACE_CATEGORIES),
  district: parseAsString.withDefault("all"),
  q: parseAsString.withDefault(""),
  sort: parseAsStringLiteral(DISCOVER_SORTS).withDefault("newest"),
  priceMax: parseAsStringLiteral(PRICE_LEVELS),
  lat: parseAsString,
  lng: parseAsString,
}

export interface DiscoverFiltersState {
  category: PlaceCategory | "all"
  district: string
  query: string
  draftQuery: string
  setDraftQuery: (value: string) => void
  commitQueryNow: (value?: string) => void
  parsedQuery: ParsedNaturalQuery
  removeParsedChip: (chip: ParsedFilterChip) => void
  priceMax: PriceMaxFilter
  setPriceMax: (value: PriceMaxFilter) => void
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
  const [urlState, setUrlState] = useQueryStates(discoverSearchParsers, {
    history: "replace",
    shallow: false,
  })

  const category: PlaceCategory | "all" = urlState.category ?? "all"
  const district = urlState.district || "all"
  const query = urlState.q
  const sort: DiscoverSort = urlState.sort
  const priceMax: PriceMaxFilter = urlState.priceMax
    ? (Number(urlState.priceMax) as 1 | 2 | 3)
    : "all"
  const isNearbyActive = sort === "distance"

  const [draftQuery, setDraftQuery] = useState(query)
  const debouncedDraft = useDebouncedValue(draftQuery, 280)
  const lastWritten = useRef(query)

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
    void setUrlState({ q: trimmed || null })
  }, [debouncedDraft, draftQuery, query, setUrlState])

  const commitQueryNow = useCallback(
    (nextValue?: string) => {
      const value = (nextValue ?? draftQuery).trim()
      if (nextValue !== undefined) setDraftQuery(nextValue)
      lastWritten.current = value
      void setUrlState({ q: value || null })
    },
    [draftQuery, setUrlState],
  )

  const parsedQuery = useMemo(() => parseNaturalFilterQuery(draftQuery), [draftQuery])

  const removeParsedChip = useCallback(
    (chip: ParsedFilterChip) => {
      const nextQuery = removeChipFromQuery(draftQuery, chip)
      lastWritten.current = nextQuery
      setDraftQuery(nextQuery)
      void setUrlState({
        q: nextQuery || null,
        ...(chip.field === "nearMe" ? { sort: null, lat: null, lng: null } : {}),
      })
    },
    [draftQuery, setUrlState],
  )

  const setSort = useCallback(
    (value: DiscoverSort) => {
      void setUrlState({ sort: value === "newest" ? null : value })
    },
    [setUrlState],
  )

  const setCoords = useCallback(
    (coords: { lat: number; lng: number } | null) => {
      const lat = coords ? coords.lat.toFixed(4) : null
      const lng = coords ? coords.lng.toFixed(4) : null
      if ((urlState.lat ?? null) === lat && (urlState.lng ?? null) === lng) return
      void setUrlState({ lat, lng })
    },
    [setUrlState, urlState.lat, urlState.lng],
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
    commitQueryNow,
    parsedQuery,
    removeParsedChip,
    priceMax,
    setPriceMax: (value) =>
      void setUrlState({ priceMax: value === "all" ? null : (String(value) as "1" | "2" | "3") }),
    sort,
    setSort,
    setCoords,
    isNearbyActive,
    setCategory: (value) => void setUrlState({ category: value === "all" ? null : value }),
    setDistrict: (value) => void setUrlState({ district: value === "all" ? null : value }),
    setIsNearbyActive: (value) => setSort(value ? "distance" : "newest"),
    resetAll: () => {
      lastWritten.current = ""
      setDraftQuery("")
      void setUrlState({
        category: null,
        district: null,
        q: null,
        priceMax: null,
        sort: null,
        lat: null,
        lng: null,
      })
    },
    activeFilterCount,
  }
}
