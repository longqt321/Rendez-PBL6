import type { Page } from "@/types/api"
import { z } from "zod"

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
  })
}
