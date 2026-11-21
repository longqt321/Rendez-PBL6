
import type { ParsedFilterChip } from "./natural-query"

export interface PageMeta {
  tookMs: number

  cacheHit: boolean

  totalResults: number

  didYouMean?: string | null

  parsedFilters?: ParsedFilterChip[]

  relaxedFilters?: boolean
}

export interface Page<T> {
  items: T[]
  next: string | null

  meta?: PageMeta
}
