import type { Page } from "./page-types"
import { z } from "zod"

export const pageMetaSchema = z.object({
  tookMs: z.number().int().min(0),
  cacheHit: z.boolean(),
  totalResults: z.number().int().min(0),
  didYouMean: z.string().nullable().optional(),
})

export function pageSchema<T>(itemSchema: z.ZodType<T>): z.ZodType<Page<T>> {
  return z.object({
    items: z.array(itemSchema),
    next: z.string().nullable(),
    meta: pageMetaSchema.optional(),
  })
}
