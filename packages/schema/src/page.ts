import type { Page } from "./page-types"
import { z } from "zod"

/**
 * Schema zod cho metadata vận hành của một trang — khớp `PageMeta`.
 * `didYouMean` optional: chỉ endpoint tìm kiếm mới gắn.
 */
export const pageMetaSchema = z.object({
  tookMs: z.number().int().min(0),
  cacheHit: z.boolean(),
  totalResults: z.number().int().min(0),
  didYouMean: z.string().nullable().optional(),
})

/**
 * Schema zod cho hợp đồng phân trang cursor dùng chung (`Page<T>`).
 *
 * zod không hỗ trợ generic trực tiếp nên dùng hàm factory: truyền schema của
 * phần tử, nhận lại schema của cả trang. Dùng cho contract test response API.
 */
export function pageSchema<T>(itemSchema: z.ZodType<T>): z.ZodType<Page<T>> {
  return z.object({
    items: z.array(itemSchema),
    next: z.string().nullable(),
    meta: pageMetaSchema.optional(),
  })
}
