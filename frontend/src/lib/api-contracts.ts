import {
  collectionSummarySchema,
  collectionSchema,
} from "@/features/collections/types/collection.schema"
import { notificationSchema } from "@/features/notification/types/notification.schema"
import { placeReportSchema } from "@/features/places/types/place-report.schema"
import { placeSchema, placeSuggestionSchema } from "@/features/places/types/place.schema"
import { reviewSchema } from "@/features/places/types/review.schema"
import { userProfileSchema } from "@/features/profile/types/profile.schema"
import { commentSchema } from "@/features/social/types/comment.schema"
import { postSchema } from "@/features/social/types/post.schema"
import { appliedProposalSchema, joinRoomResponseSchema, roomSchema } from "@rendez/schema"
import { z } from "zod"
import { pageSchema } from "@/types/api-schema"

/**
 * Hợp đồng response API — dùng cho contract test khi mock bật.
 *
 * Mỗi mục ghép một pattern path với schema zod tương ứng; `method` bỏ trống
 * nghĩa là áp dụng cho mọi method. Không throw: interceptor chỉ `console.error`
 * để lệch hợp đồng lộ ra khi dev mà không làm vỡ UI.
 */
export interface ApiContract {
  pattern: RegExp
  method?: string
  schema: z.ZodType
}

const suggestionsResponseSchema = z.object({
  suggestions: z.array(placeSuggestionSchema),
})

/** `POST /media` — URL PUT đã ký + `publicUrl` để gắn vào bài đăng. */
const mediaTicketSchema = z.object({
  uploadUrl: z.string(),
  publicUrl: z.string(),
  key: z.string(),
  expiresAt: z.string(),
  headers: z.record(z.string(), z.string()),
})

/** Bảng route theo đúng các endpoint của mock server. */
export const API_CONTRACTS: ApiContract[] = [
  // Địa điểm — mục cụ thể phải đứng trước `:id`.
  { pattern: /^\/places\/suggestions$/, method: "GET", schema: suggestionsResponseSchema },
  { pattern: /^\/places\/[^/]+\/reviews$/, method: "GET", schema: pageSchema(reviewSchema) },
  { pattern: /^\/places\/[^/]+\/reviews$/, method: "POST", schema: reviewSchema },
  { pattern: /^\/places\/[^/]+\/reports$/, method: "POST", schema: placeReportSchema },
  { pattern: /^\/places\/[^/]+\/posts$/, method: "GET", schema: pageSchema(postSchema) },
  { pattern: /^\/places\/[^/]+$/, method: "GET", schema: placeSchema },
  { pattern: /^\/places$/, method: "GET", schema: pageSchema(placeSchema) },

  // Bài đăng, bình luận.
  { pattern: /^\/posts\/[^/]+\/comments$/, method: "GET", schema: pageSchema(commentSchema) },
  { pattern: /^\/posts\/[^/]+\/comments$/, method: "POST", schema: commentSchema },
  { pattern: /^\/posts\/[^/]+\/(place|like|save)$/, method: "PATCH", schema: postSchema },
  { pattern: /^\/posts\/[^/]+$/, method: "GET", schema: postSchema },
  { pattern: /^\/posts$/, method: "GET", schema: pageSchema(postSchema) },
  { pattern: /^\/posts$/, method: "POST", schema: postSchema },
  { pattern: /^\/comments\/[^/]+\/like$/, method: "PATCH", schema: commentSchema },

  // Upload ảnh.
  { pattern: /^\/media$/, method: "POST", schema: mediaTicketSchema },

  // Thông báo.
  { pattern: /^\/notifications\/[^/]+$/, method: "PATCH", schema: notificationSchema },
  { pattern: /^\/notifications$/, method: "GET", schema: pageSchema(notificationSchema) },
  { pattern: /^\/notifications$/, method: "PATCH", schema: z.array(notificationSchema) },

  // Hồ sơ người dùng.
  { pattern: /^\/users\/[^/]+\/posts$/, method: "GET", schema: pageSchema(postSchema) },
  {
    pattern: /^\/users\/[^/]+\/collections$/,
    method: "GET",
    schema: pageSchema(collectionSummarySchema),
  },
  { pattern: /^\/users\/[^/]+\/follow$/, method: "POST", schema: userProfileSchema },
  { pattern: /^\/users\/[^/]+\/follow$/, method: "DELETE", schema: userProfileSchema },
  { pattern: /^\/users\/[^/]+$/, method: "GET", schema: userProfileSchema },
  { pattern: /^\/me$/, method: "GET", schema: userProfileSchema },

  // Bộ sưu tập.
  { pattern: /^\/collections\/[^/]+\/places$/, method: "PATCH", schema: collectionSchema },
  { pattern: /^\/collections\/[^/]+\/like$/, method: "POST", schema: collectionSchema },
  { pattern: /^\/collections\/[^/]+\/like$/, method: "DELETE", schema: collectionSchema },
  { pattern: /^\/collections\/[^/]+$/, method: "GET", schema: collectionSchema },
  { pattern: /^\/collections\/[^/]+$/, method: "PATCH", schema: collectionSchema },
  { pattern: /^\/collections$/, method: "GET", schema: pageSchema(collectionSummarySchema) },
  { pattern: /^\/collections$/, method: "POST", schema: collectionSchema },

  // Phòng lọc nhóm — mục cụ thể phải đứng trước `:code`.
  {
    pattern: /^\/rooms\/[^/]+\/proposals\/[^/]+\/apply$/,
    method: "POST",
    schema: appliedProposalSchema,
  },
  {
    pattern: /^\/rooms\/[^/]+\/proposals\/[^/]+\/dismiss$/,
    method: "POST",
    schema: roomSchema,
  },
  { pattern: /^\/rooms\/[^/]+\/join$/, method: "POST", schema: joinRoomResponseSchema },
  { pattern: /^\/rooms\/[^/]+\/proposals$/, method: "POST", schema: roomSchema },
  { pattern: /^\/rooms\/[^/]+\/members\/[^/]+$/, method: "DELETE", schema: roomSchema },
  { pattern: /^\/rooms\/[^/]+$/, method: "GET", schema: roomSchema },
  { pattern: /^\/rooms$/, method: "POST", schema: roomSchema },
]

/** Tìm hợp đồng khớp path (bỏ query) và method; `undefined` nếu không có. */
export function findContract(method: string, url: string): ApiContract | undefined {
  const path = url.split("?")[0]
  const upperMethod = method.toUpperCase()
  return API_CONTRACTS.find(
    (contract) =>
      contract.pattern.test(path) && (!contract.method || contract.method === upperMethod),
  )
}

/** Trả về thông điệp lỗi hợp đồng đầu tiên, hoặc `null` nếu hợp lệ/không áp dụng. */
export function checkApiContract(method: string, url: string, data: unknown): string | null {
  const contract = findContract(method, url)
  if (!contract) return null
  const result = contract.schema.safeParse(data)
  if (result.success) return null
  return result.error.issues[0]?.message ?? "dữ liệu không khớp schema"
}
