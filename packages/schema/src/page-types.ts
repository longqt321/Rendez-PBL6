
export interface PageMeta {

  tookMs: number

  cacheHit: boolean

  totalResults: number

  didYouMean?: string | null
}

export interface Page<T> {
  items: T[]
  next: string | null

  meta?: PageMeta
}
