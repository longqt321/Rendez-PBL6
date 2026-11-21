import {
  collectionSummarySchema,
  collectionSchema,
} from "@/features/collections/types/collection.schema"
import { notificationSchema } from "@/features/notification/types/notification.schema"
import { placeReportSchema } from "@/features/places/types/place-report.schema"
import { placeSchema, placeSuggestionSchema } from "@/features/places/types/place.schema"
import { reviewSchema } from "@/features/places/types/review.schema"
import { userSuggestionsSchema, userProfileSchema } from "@/features/profile/types/profile.schema"
import { commentSchema } from "@/features/social/types/comment.schema"
import { postSchema } from "@/features/social/types/post.schema"
import {
  adminOverviewSchema,
  adminPlaceSchema,
  adminReportSchema,
  adminUserSchema,
  appliedProposalSchema,
  auditLogSchema,
  createRoomResponseSchema,
  dailyPicksSchema,
  joinRoomResponseSchema,
  roomSchema,
} from "@rendez/schema"
import { z } from "zod"
import { pageSchema } from "@/types/api-schema"

export interface ApiContract {
  pattern: RegExp
  method?: string
  schema: z.ZodType
}

const suggestionsResponseSchema = z.object({
  suggestions: z.array(placeSuggestionSchema),
})

const mapPlacesResponseSchema = z.object({
  items: z.array(placeSchema),
  total: z.number(),
})

const mediaTicketSchema = z.object({
  uploadUrl: z.string(),
  publicUrl: z.string(),
  key: z.string(),
  expiresAt: z.string(),
  headers: z.record(z.string(), z.string()),
})

export const API_CONTRACTS: ApiContract[] = [
  // Địa điểm — mục cụ thể phải đứng trước `:id`.
  { pattern: /^\/places\/suggestions$/, method: "GET", schema: suggestionsResponseSchema },
  // Các route cố định dưới đây phải đứng TRƯỚC `/places/:id`, nếu không pattern
  // `:id` sẽ nuốt "daily-picks" / "recommended" / "map" / "saved" và validate sai shape.
  { pattern: /^\/places\/daily-picks$/, method: "GET", schema: dailyPicksSchema },
  { pattern: /^\/places\/recommended$/, method: "GET", schema: pageSchema(placeSchema) },
  { pattern: /^\/places\/map$/, method: "GET", schema: mapPlacesResponseSchema },
  { pattern: /^\/places\/saved$/, method: "GET", schema: pageSchema(placeSchema) },
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
  { pattern: /^\/users$/, method: "GET", schema: pageSchema(userProfileSchema) },
  // Gợi ý người theo dõi — phải đứng trước `/users/:handle` (pattern nuốt handle).
  { pattern: /^\/users\/suggestions$/, method: "GET", schema: userSuggestionsSchema },
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
  { pattern: /^\/rooms$/, method: "POST", schema: createRoomResponseSchema },

  // Quản trị và nhật ký hoạt động.
  { pattern: /^\/admin\/overview$/, method: "GET", schema: adminOverviewSchema },
  { pattern: /^\/admin\/reports$/, method: "GET", schema: pageSchema(adminReportSchema) },
  { pattern: /^\/admin\/reports\/[^/]+$/, method: "PATCH", schema: adminReportSchema },
  { pattern: /^\/admin\/places$/, method: "GET", schema: pageSchema(adminPlaceSchema) },
  { pattern: /^\/admin\/places\/[^/]+$/, method: "PATCH", schema: adminPlaceSchema },
  { pattern: /^\/admin\/users$/, method: "GET", schema: pageSchema(adminUserSchema) },
  { pattern: /^\/admin\/users\/[^/]+$/, method: "PATCH", schema: adminUserSchema },
  { pattern: /^\/admin\/audit-logs$/, method: "GET", schema: pageSchema(auditLogSchema) },
]

export function findContract(method: string, url: string): ApiContract | undefined {
  const path = url.split("?")[0]
  const upperMethod = method.toUpperCase()
  return API_CONTRACTS.find(
    (contract) =>
      contract.pattern.test(path) && (!contract.method || contract.method === upperMethod),
  )
}

export function checkApiContract(method: string, url: string, data: unknown): string | null {
  const contract = findContract(method, url)
  if (!contract) return null
  const result = contract.schema.safeParse(data)
  if (result.success) return null
  return result.error.issues[0]?.message ?? "dữ liệu không khớp schema"
}
