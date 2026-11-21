import type { Page } from "./page-types"
import { z } from "zod"

export const parsedFilterChipSchema = z.object({
  id: z.string(),
  kind: z.enum(["include", "exclude"]),
  field: z.enum(["category", "district", "priceMax", "tag", "nearMe", "alwaysOpen", "keyword"]),
  value: z.string(),
  label: z.string(),
  rawPhrase: z.string(),
})

export const pageMetaSchema = z.object({
  tookMs: z.number().int().min(0),
  cacheHit: z.boolean(),
  totalResults: z.number().int().min(0),
  didYouMean: z.string().nullable().optional(),
  parsedFilters: z.array(parsedFilterChipSchema).optional(),
  relaxedFilters: z.boolean().optional(),
})

export function pageSchema<T>(itemSchema: z.ZodType<T>): z.ZodType<Page<T>> {
  return z.object({
    items: z.array(itemSchema),
    next: z.string().nullable(),
    meta: pageMetaSchema.optional(),
  })
}
