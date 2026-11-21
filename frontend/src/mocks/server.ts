import { AxiosError, AxiosHeaders, CanceledError } from "axios"
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from "axios"
import type { AppNotification } from "@/features/notification/types/notification"
import type { Place, PlaceCategory, PlaceSuggestion } from "@/features/places/types/place"
import type { PlaceReport, PlaceReportReason } from "@/features/places/types/place-report"
import { PLACE_REPORT_REASONS } from "@/features/places/types/place-report"
import type { Review } from "@/features/places/types/review"
import type { Collection, CollectionSummary } from "@/features/collections/types/collection"
import type { Room, RoomFilter, RoomProposal } from "@/features/rooms/types/room"
import { categoryLabel } from "@/features/places/lib/category-meta"
import { calculateDistanceKm } from "@/features/places/lib/danang-districts"
import { priceLevelLabel } from "@/features/places/lib/price-level"
import type { Post } from "@/features/social/types/post"
import type { Comment, CommentSort } from "@/features/social/types/comment"
import type { Page } from "@/types/api"
import type {
  AdminOverview,
  AdminPlace,
  AdminReport,
  AdminReportStatus,
  AdminUser,
  AuditLogEntry,
  UserRole,
} from "@rendez/schema"
import { MOCK_NOTIFICATIONS } from "./fixtures/notifications"
import { MOCK_PLACES, type MockPlace } from "./fixtures/cold-start-places"
import { MOCK_POSTS } from "./fixtures/posts"
import { MOCK_COMMENTS } from "./fixtures/comments"
import { MOCK_REVIEWS } from "./fixtures/reviews"
import { MOCK_COLLECTIONS } from "./fixtures/collections"
import { CURRENT_USER, ME, MOCK_USERS } from "./fixtures/users"
import { rankPlaceSuggestions } from "./ranking"
import { resolveScenario } from "./scenarios"
import { normalizeText } from "./text"
import { userSuggestionRoutes } from "./users-suggestions"
import { formatInitials } from "@/lib/format"
import { env } from "@/lib/env"
import {
  IMAGE_CONTENT_TYPES,
  MAX_CAPTION_LENGTH,
  MAX_COLLECTION_DESCRIPTION_LENGTH,
  MAX_COLLECTION_NAME_LENGTH,
  MAX_MEMBER_NAME_LENGTH,
  MAX_PROFILE_BIO_LENGTH,
  MAX_PROFILE_LOCATION_LENGTH,
  MAX_PROFILE_NAME_LENGTH,
  MAX_REPORT_DETAIL_LENGTH,
  MAX_REVIEW_CONTENT_LENGTH,
  MAX_ROOM_KEYWORD_LENGTH,
  MAX_ROOM_NAME_LENGTH,
  MIN_CAPTION_LENGTH,
  POST_IMAGE_INVALID_MESSAGE,
  updateAdminPlaceInputSchema,
  updateAdminReportInputSchema,
  updateAdminUserInputSchema,
  validatePostImageUrls,
} from "@rendez/schema"
import type {
  MockCollection,
  MockComment,
  MockPost,
  MockReport,
  MockReview,
  MockRoom,
  MockRoomMember,
} from "./types"

const PLACES_PAGE_SIZE = 9

const DAILY_PICK_REASONS = ["Gợi ý của ngày", "Quán mới", "Nhiều đánh giá"]
const POSTS_PAGE_SIZE = 5
const NOTIFICATIONS_PAGE_SIZE = 20

const MOCK_EMAIL = "me@rendez.test"
const MOCK_PASSWORD = "password123"

interface MockAccount {
  userId: string
  email: string
  password: string
  verified: boolean
}

const VALID_REPORT_REASONS: ReadonlySet<string> = new Set(PLACE_REPORT_REASONS)

const MOCK_IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
}

const MOCK_STORAGE_HOST = "mock-r2.test"

function patchFetchForMockStorage(): void {
  const target = globalThis as { fetch: typeof fetch; __rendezMockFetchPatched?: boolean }
  if (target.__rendezMockFetchPatched) return
  const originalFetch = target.fetch.bind(globalThis)

  target.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let url: string
    if (typeof input === "string") {
      url = input
    } else if (input instanceof URL) {
      url = input.href
    } else {
      url = input.url
    }
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase()
    // `new URL` ném TypeError với URL tương đối (`/api/...`) — resolve theo origin
    // trang; chỉ host tuyệt đối khớp storage giả mới bị chặn.
    if (method === "PUT" && new URL(url, globalThis.location?.href).host === MOCK_STORAGE_HOST) {
      return new Response(null, { status: 200 })
    }
    return originalFetch(input, init)
  }
  target.__rendezMockFetchPatched = true
}

patchFetchForMockStorage()

const db = {
  places: MOCK_PLACES.map((place) => ({ ...place })),
  posts: MOCK_POSTS.map((post) => ({ ...post })),
  notifications: MOCK_NOTIFICATIONS.map((notification) => ({ ...notification })),
  comments: MOCK_COMMENTS.map((comment) => ({ ...comment, deleted: false })),
  reviews: MOCK_REVIEWS.map((review) => ({ ...review })),
  collections: MOCK_COLLECTIONS.map((collection) => ({ ...collection })),
  reports: [] as MockReport[],
  users: { ...MOCK_USERS },

  me: { ...ME },

  accounts: [
    { userId: "u-me", email: MOCK_EMAIL, password: MOCK_PASSWORD, verified: true },
  ] as MockAccount[],

  deletedUserIds: new Set<string>(),

  rooms: [] as MockRoom[],

  roomTokens: {} as Record<string, string>,

  authenticated: env.devBypassAuth,

  userAdminState: {} as Record<
    string,
    { role: UserRole; bannedAt: string | null; banReason: string | null }
  >,

  placeModerationState: {} as Record<
    string,
    { status: string | null; note: string | null; moderatedAt: string | null }
  >,

  auditLogs: [] as AuditLogEntry[],
}

const seedPlace = db.places[0]
if (seedPlace) {
  db.reports.push({
    id: "report-seed-1",
    placeId: seedPlace.id,
    reason: "wrong-info",
    detail: "Giờ mở cửa cuối tuần thay đổi từ 08:00.",
    createdAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
    reporterId: "u-lan",
    status: "pending",
  })
}
db.auditLogs.push({
  id: "audit-seed-1",
  action: "place.publish",
  entity: "place",
  entityId: seedPlace?.id ?? null,
  meta: { name: seedPlace?.name ?? "Địa điểm" },
  ip: "127.0.0.1",
  createdAt: new Date(Date.now() - 3600_000).toISOString(),
  actor: { id: "u-me", name: "Minh Anh", handle: "minhanh.eats", role: "admin" },
})

// Tổng hợp review seed vào rating/reviewCount của place — nếu không, place
// hiện rating=0 dù đã có review, lệch với số review hiển thị trên trang quán.
for (const review of db.reviews) {
  const place = db.places.find((item) => item.id === review.placeId)
  if (!place) continue
  place.rating = (place.rating * place.reviewCount + review.rating) / (place.reviewCount + 1)
  place.reviewCount += 1
}
for (const place of db.places) {
  place.rating = Math.round(place.rating * 10) / 10
}

const notifiedPostIds = new Set<string>()

let postSeq = 0
let notificationSeq = 0
let commentSeq = 0
let reviewSeq = 0
let collectionSeq = 0
let reportSeq = 0
let userSeq = 0
let roomSeq = 0
let roomMemberSeq = 0
let roomProposalSeq = 0
let auditLogSeq = 1

function requireMockRole(config: InternalAxiosRequestConfig, roles: UserRole[]): UserRole {
  if (!db.authenticated) unauthorized(config, "Chưa đăng nhập")
  const role: UserRole = db.userAdminState[db.me.id]?.role ?? db.me.role ?? "user"
  if (!roles.includes(role)) forbidden(config, "Bạn không có quyền truy cập khu vực này")
  return role
}

function appendMockAuditLog(
  action: string,
  entity: string,
  entityId: string | null,
  meta: Record<string, unknown>,
): void {
  const actorRole: UserRole = db.userAdminState[db.me.id]?.role ?? db.me.role ?? "admin"
  db.auditLogs.unshift({
    id: `audit-${++auditLogSeq}`,
    action,
    entity,
    entityId,
    meta,
    ip: "127.0.0.1",
    createdAt: new Date().toISOString(),
    actor: { id: db.me.id, name: db.me.name, handle: db.me.handle, role: actorRole },
  })
}

function toMockAdminReport(report: MockReport): AdminReport {
  const place = findPlace(report.placeId)
  const reporter = db.users[report.reporterId]
  return {
    id: report.id,
    placeId: report.placeId,
    placeName: place?.name ?? report.placeId,
    placePublished: place ? place.publishedAt !== null : false,
    placeStatus: place?.status ?? "unknown",
    reporterName: reporter?.name ?? "Người dùng",
    reporterHandle: reporter?.handle ?? "user",
    reason: report.reason,
    detail: report.detail,
    status: report.status ?? "pending",
    createdAt: report.createdAt,
    updatedAt: report.updatedAt ?? report.createdAt,
  }
}

function toMockAdminPlace(place: MockPlace): AdminPlace {
  const mod = db.placeModerationState[place.id]
  return {
    id: place.id,
    name: place.name,
    address: place.address,
    district: place.district ?? null,
    category: place.category,
    priceLevel: place.priceLevel,
    status: place.status ?? "unknown",
    lat: place.lat ?? null,
    lng: place.lng ?? null,
    publishedAt: place.publishedAt,
    moderationStatus: mod?.status ?? null,
    moderationNote: mod?.note ?? null,
    moderatedAt: mod?.moderatedAt ?? null,
    reviewCount: place.reviewCount,
    reportCount: db.reports.filter((item) => item.placeId === place.id).length,
    createdAt: place.publishedAt ?? "2026-11-10T00:00:00Z",
  }
}

function toMockAdminUser(userId: string): AdminUser {
  const user = db.users[userId]
  const adminMeta = db.userAdminState[userId]
  const account = db.accounts.find((acc) => acc.userId === userId)
  return {
    id: user.id,
    name: user.name,
    handle: user.handle,
    email: account?.email ?? `${user.handle}@rendez.test`,
    emailVerified: account?.verified ?? true,
    role: adminMeta?.role ?? user.role ?? (user.id === "u-me" ? "admin" : "user"),
    bannedAt: adminMeta?.bannedAt ?? null,
    banReason: adminMeta?.banReason ?? null,
    postCount: db.posts.filter((p) => p.author.id === user.id).length,
    reviewCount: db.reviews.filter((r) => r.author.id === user.id).length,
    createdAt: user.joinedAt,
  }
}

// ---------------------------------------------------------------------------
// Serialize: chuyển bản ghi nội bộ thành đúng hợp đồng API
// ---------------------------------------------------------------------------

function toPlaceDto(place: MockPlace): Place {
  return {
    id: place.id,
    name: place.name,
    address: place.address,
    city: place.city,
    district: place.district,
    category: place.category,
    tags: place.tags,
    rating: place.rating,
    reviewCount: place.reviewCount,
    priceLevel: place.priceLevel,
    imageUrl: place.imageUrl,
    imageHeight: place.imageHeight,
    lat: place.lat,
    lng: place.lng,
    status: place.status,
    ...(place.openingHours ? { openingHours: place.openingHours } : {}),
    publishedAt: place.publishedAt,
  }
}

function findPlace(placeId: string): MockPlace | undefined {
  return db.places.find((place) => place.id === placeId)
}

function toPlaceSummary(place: MockPlace) {
  return {
    id: place.id,
    name: place.name,
    address: place.address,
    district: place.district,
    category: place.category,
    imageUrl: place.imageUrl,
    isPublished: place.publishedAt !== null,
    lat: place.lat,
    lng: place.lng,
  }
}

function toPostDto(post: MockPost): Post {
  const place = post.placeId === null ? undefined : findPlace(post.placeId)
  return { ...post, place: place ? toPlaceSummary(place) : null }
}

function toNotificationDto(notification: AppNotification): AppNotification {
  if (notification.kind !== "place-suggestion") return { ...notification }
  const post = db.posts.find((item) => item.id === notification.postId)
  return { ...notification, postPlaceId: post?.placeId ?? null }
}

// ---------------------------------------------------------------------------
// Nghiệp vụ phía server
// ---------------------------------------------------------------------------

function sortPublishedPlaces(items: Place[], sort?: string, lat?: string, lng?: string): Place[] {
  if (sort === "distance") {
    const latN = Number(lat)
    const lngN = Number(lng)
    const valid =
      Number.isFinite(latN) &&
      Number.isFinite(lngN) &&
      latN >= -90 &&
      latN <= 90 &&
      lngN >= -180 &&
      lngN <= 180
    if (!valid) return items
    return items.toSorted((a, b) => {
      const da =
        a.lat !== undefined && a.lng !== undefined
          ? calculateDistanceKm(latN, lngN, a.lat, a.lng)
          : undefined
      const db =
        b.lat !== undefined && b.lng !== undefined
          ? calculateDistanceKm(latN, lngN, b.lat, b.lng)
          : undefined
      if (da === undefined && db === undefined) return 0
      if (da === undefined) return 1
      if (db === undefined) return -1
      return da - db
    })
  }
  if (sort === "rating") {
    return items.toSorted((a, b) => {
      const aHas = a.reviewCount > 0
      const bHas = b.reviewCount > 0
      if (aHas !== bHas) return aHas ? -1 : 1
      if (aHas && a.rating !== b.rating) return b.rating - a.rating
      return 0
    })
  }
  return items
}

function paginate<T>(items: T[], cursor: string | null, pageSize: number): Page<T> {
  const parsed = cursor === null ? 0 : Number.parseInt(cursor, 10)
  const offset = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
  const slice = items.slice(offset, offset + pageSize)
  const nextOffset = offset + slice.length
  return { items: slice, next: nextOffset < items.length ? String(nextOffset) : null }
}

function isPubliclyVisible(place: MockPlace): boolean {
  return place.publishedAt !== null && place.status !== "closed"
}

interface Bbox {
  minLng: number
  minLat: number
  maxLng: number
  maxLat: number
}

function matchesBbox(place: MockPlace, bbox?: Bbox): boolean {
  if (!bbox) return true
  if (place.lat === undefined || place.lng === undefined) return false
  return !(
    place.lng < bbox.minLng ||
    place.lng > bbox.maxLng ||
    place.lat < bbox.minLat ||
    place.lat > bbox.maxLat
  )
}

function matchesKeywords(
  haystack: string,
  includeKeywords: string[],
  excludeKeywords: string[],
  query: string,
): boolean {
  if (
    includeKeywords.length > 0 &&
    !includeKeywords.every((keyword) => haystack.includes(keyword))
  ) {
    return false
  }
  if (excludeKeywords.some((keyword) => haystack.includes(keyword))) return false
  if (!query) return true
  return haystack.includes(query)
}

function listPublishedPlaces(params: {
  category?: string
  district?: string
  q?: string

  bbox?: string

  priceMax?: string

  excludeCategory?: string
  excludeDistrict?: string

  includeKeyword?: string

  excludeKeyword?: string
}): Place[] {
  const published = db.places.filter(isPubliclyVisible)
  const query = normalizeText(params.q ?? "")
  // `category`/`district` nhận một giá trị (discover) hoặc danh sách phân tách
  // dấu phẩy (phòng lọc nhóm có thể chọn nhiều) — "all" nghĩa là không ràng buộc.
  const categories = (params.category ?? "")
    .split(",")
    .filter((value) => value && value !== "all") as PlaceCategory[]
  const districts = (params.district ?? "").split(",").filter((value) => value && value !== "all")
  const priceMaxRaw = Number(params.priceMax)
  // Chỉ nhận 1–3; giá trị lạ (NaN, 0, 9...) coi như không lọc thay vì lọc sai.
  const priceMax =
    params.priceMax && priceMaxRaw >= 1 && priceMaxRaw <= 3 ? (priceMaxRaw as 1 | 2 | 3) : undefined
  const excludedCategories = new Set(
    (params.excludeCategory ?? "").split(",").filter(Boolean) as PlaceCategory[],
  )
  const excludedDistricts = new Set((params.excludeDistrict ?? "").split(",").filter(Boolean))
  const includeKeywords = (params.includeKeyword ?? "")
    .split(",")
    .filter(Boolean)
    .map(normalizeText)
  const excludeKeywords = (params.excludeKeyword ?? "")
    .split(",")
    .filter(Boolean)
    .map(normalizeText)

  // bbox: 4 số hợp lệ mới có hiệu lực; sai định dạng coi như không lọc khung.
  const bboxParts = (params.bbox ?? "").split(",").map(Number)
  const bbox =
    bboxParts.length === 4 && bboxParts.every((n) => Number.isFinite(n))
      ? { minLng: bboxParts[0], minLat: bboxParts[1], maxLng: bboxParts[2], maxLat: bboxParts[3] }
      : undefined

  return published
    .filter((place) => {
      if (!matchesBbox(place, bbox)) return false
      if (categories.length > 0 && !categories.includes(place.category)) {
        return false
      }
      if (districts.length > 0 && !districts.includes(place.district ?? "")) {
        return false
      }
      if (priceMax !== undefined && place.priceLevel > priceMax) return false
      if (excludedCategories.has(place.category)) return false
      if (place.district && excludedDistricts.has(place.district)) return false
      const haystack = normalizeText(
        [place.name, place.address, place.city, place.district ?? "", ...place.tags].join(" "),
      )
      return matchesKeywords(haystack, includeKeywords, excludeKeywords, query)
    })
    .map(toPlaceDto)
}

function suggestPlacesForCaption(caption: string, limit: number): PlaceSuggestion[] {
  if (caption.trim().length < 8) return []
  const candidates = db.places.filter(isPubliclyVisible)
  return rankPlaceSuggestions(caption, candidates, limit).map((item) => ({
    place: toPlaceSummary(item.place),
    reason: item.reason,
  }))
}

function syncPlaceSuggestions(): void {
  const unpublished = db.places.filter((place) => place.publishedAt === null)

  for (const post of db.posts) {
    if (post.placeId !== null) continue
    if (notifiedPostIds.has(post.id)) continue

    const ranked = rankPlaceSuggestions(post.caption, unpublished, 3)
    if (ranked.length === 0) continue

    notificationSeq += 1
    db.notifications.unshift({
      id: `notif-suggest-${notificationSeq}`,
      kind: "place-suggestion",
      postId: post.id,
      postCaption: post.caption,
      postPlaceId: null,
      suggestions: ranked.map((item) => ({
        place: toPlaceSummary(item.place),
        reason: item.reason,
      })),
      createdAt: new Date().toISOString(),
      read: false,
    })
    notifiedPostIds.add(post.id)
  }
}

function attachPlaceToPost(postId: string, placeId: string): Post | undefined {
  const post = db.posts.find((item) => item.id === postId)
  if (!post) return undefined

  const place = findPlace(placeId)
  if (!place) return undefined

  post.placeId = placeId

  // Người dùng xác nhận → server đưa địa điểm lên /discover.
  if (place.publishedAt === null) {
    place.publishedAt = new Date().toISOString()
  }

  // Thông báo đề xuất của bài này coi như đã xử lý.
  for (const notification of db.notifications) {
    if (notification.kind === "place-suggestion" && notification.postId === postId) {
      notification.read = true
    }
  }

  return toPostDto(post)
}

function createPost(config: InternalAxiosRequestConfig) {
  const body = parseBody<{ caption?: string; placeId?: string | null; images?: unknown }>(config)
  const caption = (body.caption ?? "").trim()
  if (caption.length < MIN_CAPTION_LENGTH) {
    badRequest(config, `Nội dung bài đăng cần ít nhất ${MIN_CAPTION_LENGTH} ký tự`)
  }
  if (caption.length > MAX_CAPTION_LENGTH) {
    badRequest(config, `Nội dung bài đăng tối đa ${MAX_CAPTION_LENGTH} ký tự`)
  }

  // Ảnh (G5b): CÙNG logic với backend (`validatePostImageUrls` trong
  // `@rendez/schema`) — mock chỉ thay domain bucket bằng storage giả.
  const rawImages = body.images === undefined ? [] : body.images
  if (!Array.isArray(rawImages) || rawImages.some((url) => typeof url !== "string")) {
    badRequest(config, POST_IMAGE_INVALID_MESSAGE)
  }
  const imageResult = validatePostImageUrls(rawImages as string[], {
    userId: CURRENT_USER.id,
    publicBaseUrl: `https://${MOCK_STORAGE_HOST}`,
  })
  if (!imageResult.ok) badRequest(config, imageResult.message)
  const urls = imageResult.images

  postSeq += 1
  const post: MockPost = {
    id: `post-new-${postSeq}`,
    author: CURRENT_USER,
    caption,
    createdAt: new Date().toISOString(),
    placeId: body.placeId ?? null,
    likeCount: 0,
    commentCount: 0,
    likedByMe: false,
    savedByMe: false,
    images: [...urls],
  }
  db.posts.unshift(post)
  return toPostDto(post)
}

/**
 * `POST /media` — cấp "presigned URL" giả.
 *
 * Mock không có storage thật: `POST /media` trả `uploadUrl` trên host storage giả —
 * `patchFetchForMockStorage()` chặn PUT tới host đó nên client coi như đã tải lên
 * thành công và dùng `publicUrl` trong bài đăng. Mock coi R2 ĐÃ cấu hình — không trả 503.
 */
function createMediaTicket(config: InternalAxiosRequestConfig) {
  const body = parseBody<{ folder?: unknown; contentType?: unknown }>(config)
  const folder = body.folder
  if (folder !== "posts" && folder !== "places" && folder !== "avatars" && folder !== "covers") {
    badRequest(config, "Thư mục không hợp lệ")
  }
  const contentType = typeof body.contentType === "string" ? body.contentType : ""
  const extension = MOCK_IMAGE_EXTENSIONS[contentType]
  if (!extension || !(IMAGE_CONTENT_TYPES as readonly string[]).includes(contentType)) {
    badRequest(config, "Chỉ nhận ảnh JPEG, PNG, WebP hoặc AVIF")
  }

  const id = crypto.randomUUID()
  return {
    uploadUrl: `https://${MOCK_STORAGE_HOST}/upload/${id}`,
    publicUrl: `https://${MOCK_STORAGE_HOST}/${folder}/${CURRENT_USER.id}/${id}.${extension}`,
    key: `${folder}/${CURRENT_USER.id}/${id}.${extension}`,
    expiresAt: new Date(Date.now() + 600_000).toISOString(),
    headers: { "Content-Type": contentType },
  }
}

// ---------------------------------------------------------------------------
// Bình luận — nghiệp vụ phía server
// ---------------------------------------------------------------------------

function toCommentDto(comment: MockComment): Comment {
  // replyTo do server tự suy ra từ bình luận cha — client không tự tra cứu.
  const parent = comment.parentId === null ? undefined : findComment(comment.parentId)
  const parentHandle = parent && !parent.deleted ? parent.author.handle : null

  return {
    id: comment.id,
    postId: comment.postId,
    author: comment.author,
    body: comment.body,
    createdAt: comment.createdAt,
    likeCount: comment.likeCount,
    likedByMe: comment.likedByMe,
    isMine: comment.author.id === CURRENT_USER.id,
    parentId: comment.parentId,
    replyTo:
      comment.parentId === null || parentHandle === null
        ? null
        : { commentId: comment.parentId, handle: parentHandle },
  }
}

function toReviewDto(review: MockReview): Review {
  return {
    id: review.id,
    placeId: review.placeId,
    author: review.author,
    rating: review.rating,
    content: review.content,
    createdAt: review.createdAt,
    isMine: review.author.id === CURRENT_USER.id,
  }
}

/** Đánh giá của một địa điểm, mới nhất trước. */
function listReviews(placeId: string): Review[] {
  return db.reviews
    .filter((review) => review.placeId === placeId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(toReviewDto)
}

function toCollectionDto(collection: MockCollection): Collection {
  return {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    isPrivate: collection.isPrivate,
    owner: collection.owner,
    placeIds: [...collection.placeIds],
    createdAt: collection.createdAt,
    isMine: collection.owner.id === ME.id,
    likeCount: collection.likeCount,
    likedByMe: collection.likedByMe,
  }
}

function toCollectionSummary(
  collection: MockCollection,
  targetPlaceId?: string,
): CollectionSummary {
  return {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    isPrivate: collection.isPrivate,
    placeCount: collection.placeIds.length,
    previewPlaceIds: collection.placeIds.slice(0, 3),
    createdAt: collection.createdAt,
    likeCount: collection.likeCount,
    likedByMe: collection.likedByMe,
    ...(targetPlaceId ? { containsPlace: collection.placeIds.includes(targetPlaceId) } : {}),
  }
}

/** Bộ sưu tập của người dùng hiện tại, mới tạo trước. */
function listMyCollections(targetPlaceId?: string): CollectionSummary[] {
  return db.collections
    .filter((collection) => collection.owner.id === ME.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((c) => toCollectionSummary(c, targetPlaceId))
}

function findComment(commentId: string): MockComment | undefined {
  return db.comments.find((comment) => comment.id === commentId)
}

/** Bình luận gốc (không phải trả lời, chưa xoá) — dùng cho phân trang cấp 1. */
function listTopLevelComments(postId: string): MockComment[] {
  return db.comments.filter(
    (comment) => comment.postId === postId && comment.parentId === null && !comment.deleted,
  )
}

function sortComments(comments: MockComment[], sort: CommentSort): MockComment[] {
  const sorted = [...comments]
  if (sort === "top") {
    sorted.sort((a, b) => b.likeCount - a.likeCount)
  } else {
    sorted.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  }
  return sorted
}

function listComments(postId: string, sort: CommentSort): Page<Comment> {
  const topLevel = sortComments(listTopLevelComments(postId), sort)
  const items: Comment[] = []

  for (const comment of topLevel) {
    items.push(toCommentDto(comment))
    // Reply chưa xoá đi kèm ngay sau cha, theo thứ tự thời gian — client không tự ghép cây.
    const replies = db.comments
      .filter((item) => item.postId === postId && item.parentId === comment.id && !item.deleted)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    for (const reply of replies) {
      items.push(toCommentDto(reply))
    }
  }

  return { items, next: null }
}

function createComment(postId: string, body: { body?: string; parentId?: string | null }): Comment {
  const post = db.posts.find((item) => item.id === postId)
  if (!post) throw new Error("Không tìm thấy bài đăng")

  const text = (body.body ?? "").trim()
  if (text.length === 0) throw new Error("Nội dung bình luận trống")

  const parentId = body.parentId ?? null
  if (parentId !== null) {
    const parent = findComment(parentId)
    if (parent?.postId !== postId) throw new Error("Không tìm thấy bình luận gốc")
    if (parent.parentId !== null) throw new Error("Chỉ hỗ trợ trả lời 1 cấp")
  }

  commentSeq += 1
  const comment: MockComment = {
    id: `c-new-${commentSeq}`,
    postId,
    author: CURRENT_USER,
    body: text,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    likedByMe: false,
    parentId,
    deleted: false,
  }

  db.comments.push(comment)
  post.commentCount += 1
  return toCommentDto(comment)
}

/**
 * Tạo hoặc ghi đè đánh giá của người dùng hiện tại cho một địa điểm.
 *
 * Form đánh giá chỉ nhận text + số sao (không có ảnh/file), nên body chỉ có
 * `rating` và `content` — server cũng từ chối mọi trường đính kèm.
 */
function createPlaceReport(config: InternalAxiosRequestConfig, placeId: string): PlaceReport {
  const place = findPlace(placeId)
  if (!place || place.publishedAt === null) notFound(config, "Không tìm thấy địa điểm")

  const body = parseBody<{ reason?: unknown; detail?: unknown }>(config)
  const reason = body.reason
  if (typeof reason !== "string" || !VALID_REPORT_REASONS.has(reason)) {
    badRequest(config, "Lý do báo cáo không hợp lệ")
  }
  const detail = typeof body.detail === "string" ? body.detail.trim() : ""
  if (reason === "other" && detail.length === 0) {
    badRequest(config, "Lý do khác cần mô tả cụ thể")
  }
  if (detail.length > MAX_REPORT_DETAIL_LENGTH) {
    badRequest(config, `Ghi chú tối đa ${MAX_REPORT_DETAIL_LENGTH} ký tự`)
  }

  // Một người một lý do một lần cho mỗi địa điểm — báo cáo lặp là nhiễu.
  const duplicate = db.reports.some(
    (report) =>
      report.placeId === placeId &&
      report.reason === reason &&
      report.reporterId === CURRENT_USER.id,
  )
  if (duplicate) {
    badRequest(config, "Bạn đã gửi báo cáo với lý do này cho địa điểm này rồi")
  }

  reportSeq += 1
  const report: MockReport = {
    id: `report-new-${reportSeq}`,
    placeId,
    reason: reason as PlaceReportReason,
    detail: detail.length > 0 ? detail : null,
    createdAt: new Date().toISOString(),
    reporterId: CURRENT_USER.id,
  }
  db.reports.push(report)
  // `reporterId` là chi tiết nội bộ — hợp đồng API không có tác giả báo cáo.
  return {
    id: report.id,
    placeId: report.placeId,
    reason: report.reason,
    detail: report.detail,
    createdAt: report.createdAt,
  }
}

function createReview(config: InternalAxiosRequestConfig, placeId: string): Review {
  const place = findPlace(placeId)
  if (!place || place.publishedAt === null) notFound(config, "Không tìm thấy địa điểm")

  const body = parseBody<{ rating?: unknown; content?: unknown }>(config)
  const rating = Number(body.rating)
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    badRequest(config, "Số sao phải là số nguyên từ 1 đến 5")
  }
  const content = typeof body.content === "string" ? body.content.trim() : ""
  if (content.length === 0) badRequest(config, "Nội dung đánh giá trống")
  if (content.length > MAX_REVIEW_CONTENT_LENGTH) {
    badRequest(config, `Nội dung đánh giá tối đa ${MAX_REVIEW_CONTENT_LENGTH} ký tự`)
  }

  const existing = db.reviews.find(
    (review) => review.placeId === placeId && review.author.id === CURRENT_USER.id,
  )
  // Điểm trung bình là aggregate tăng dần (như backend thật với dữ liệu lớn):
  // tạo mới → cộng vào trung bình có trọng số; ghi đè → trừ điểm cũ cộng điểm mới.
  if (existing) {
    place.rating = (place.rating * place.reviewCount - existing.rating + rating) / place.reviewCount
  } else {
    place.rating = (place.rating * place.reviewCount + rating) / (place.reviewCount + 1)
    place.reviewCount += 1
  }
  // Hiển thị 1 chữ số thập phân (khớp `formatRating`).
  place.rating = Math.round(place.rating * 10) / 10
  if (existing) {
    existing.rating = rating
    existing.content = content
    existing.createdAt = new Date().toISOString()
    return toReviewDto(existing)
  }

  reviewSeq += 1
  const review: MockReview = {
    id: `r-new-${reviewSeq}`,
    placeId,
    author: CURRENT_USER,
    rating,
    content,
    createdAt: new Date().toISOString(),
  }
  db.reviews.push(review)
  return toReviewDto(review)
}

function deleteReview(config: InternalAxiosRequestConfig, placeId: string): void {
  const place = findPlace(placeId)
  if (!place || place.publishedAt === null) notFound(config, "Không tìm thấy địa điểm")

  const idx = db.reviews.findIndex(
    (review) => review.placeId === placeId && review.author.id === CURRENT_USER.id,
  )
  if (idx === -1) notFound(config, "Không tìm thấy đánh giá")

  const removed = db.reviews[idx]
  db.reviews.splice(idx, 1)

  if (place.reviewCount > 1) {
    place.rating = (place.rating * place.reviewCount - removed.rating) / (place.reviewCount - 1)
    place.reviewCount -= 1
    place.rating = Math.round(place.rating * 10) / 10
  } else {
    place.rating = 0
    place.reviewCount = 0
  }
}

/**
 * Tạo bộ sưu tập rỗng cho người dùng hiện tại.
 *
 * Tên bắt buộc, mô tả tuỳ chọn. `isPrivate` mặc định công khai nếu không truyền.
 */
function createCollection(config: InternalAxiosRequestConfig): Collection {
  const body = parseBody<{ name?: unknown; description?: unknown; isPrivate?: unknown }>(config)
  const name = typeof body.name === "string" ? body.name.trim() : ""
  if (name.length === 0) badRequest(config, "Tên bộ sưu tập trống")
  if (name.length > MAX_COLLECTION_NAME_LENGTH) {
    badRequest(config, `Tên bộ sưu tập tối đa ${MAX_COLLECTION_NAME_LENGTH} ký tự`)
  }
  const description = typeof body.description === "string" ? body.description.trim() : ""
  if (description.length > MAX_COLLECTION_DESCRIPTION_LENGTH) {
    badRequest(config, `Mô tả tối đa ${MAX_COLLECTION_DESCRIPTION_LENGTH} ký tự`)
  }

  collectionSeq += 1
  const collection: MockCollection = {
    id: `c-new-${collectionSeq}`,
    name,
    description,
    isPrivate: body.isPrivate === true,
    owner: ME,
    placeIds: [],
    createdAt: new Date().toISOString(),
    likeCount: 0,
    likedByMe: false,
  }
  db.collections.push(collection)
  return toCollectionDto(collection)
}

/**
 * Sửa thông tin bộ sưu tập — body có thể chứa một phần `name`, `description`,
 * `isPrivate`. Trường không gửi thì giữ nguyên.
 *
 * Ràng buộc giống lúc tạo: tên không rỗng, tối đa 80 ký tự; mô tả tối đa 400.
 */
function updateCollection(config: InternalAxiosRequestConfig, collectionId: string): Collection {
  const collection = db.collections.find((item) => item.id === collectionId)
  if (!collection) notFound(config, "Không tìm thấy bộ sưu tập")
  if (collection.owner.id !== ME.id) forbidden(config, "Không phải bộ sưu tập của bạn")

  const body = parseBody<{ name?: unknown; description?: unknown; isPrivate?: unknown }>(config)

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (name.length === 0) badRequest(config, "Tên bộ sưu tập trống")
    if (name.length > MAX_COLLECTION_NAME_LENGTH) {
      badRequest(config, `Tên bộ sưu tập tối đa ${MAX_COLLECTION_NAME_LENGTH} ký tự`)
    }
    collection.name = name
  }

  if (body.description !== undefined) {
    const description = typeof body.description === "string" ? body.description.trim() : ""
    if (description.length > MAX_COLLECTION_DESCRIPTION_LENGTH) {
      badRequest(config, `Mô tả tối đa ${MAX_COLLECTION_DESCRIPTION_LENGTH} ký tự`)
    }
    collection.description = description
  }

  if (body.isPrivate !== undefined) {
    collection.isPrivate = body.isPrivate === true
  }

  return toCollectionDto(collection)
}

/** Thả tim / bỏ thả tim — idempotent, không cho tự tim bộ sưu tập của mình. */
function setCollectionLike(
  config: InternalAxiosRequestConfig,
  collectionId: string,
  liked: boolean,
): Collection {
  const collection = db.collections.find((item) => item.id === collectionId)
  if (!collection) notFound(config, "Không tìm thấy bộ sưu tập")
  if (collection.isPrivate && collection.owner.id !== ME.id) {
    notFound(config, "Không tìm thấy bộ sưu tập")
  }
  if (collection.owner.id === ME.id) badRequest(config, "Không thể thả tim bộ sưu tập của mình")

  if (liked !== collection.likedByMe) {
    collection.likedByMe = liked
    collection.likeCount += liked ? 1 : -1
  }
  return toCollectionDto(collection)
}

/**
 * Bộ sưu tập công khai của một người — ẩn hết bộ riêng tư, trừ khi xem chính mình.
 * Mới tạo trước.
 */
function listUserCollections(handle: string): CollectionSummary[] {
  const user = findUserByHandle(handle)
  if (!user) throw new Error("Không tìm thấy người dùng")

  return db.collections
    .filter((collection) => collection.owner.id === user.id)
    .filter((collection) => !collection.isPrivate || user.id === ME.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((collection) => toCollectionSummary(collection))
}

/** Chỉ chủ sở hữu được xoá bộ sưu tập. */
function deleteCollection(config: InternalAxiosRequestConfig, collectionId: string): boolean {
  const index = db.collections.findIndex((item) => item.id === collectionId)
  if (index === -1) notFound(config, "Không tìm thấy bộ sưu tập")
  if (db.collections[index].owner.id !== ME.id) forbidden(config, "Không phải bộ sưu tập của bạn")
  db.collections.splice(index, 1)
  return true
}

/**
 * Thêm/bớt địa điểm khỏi bộ sưu tập của mình — body `{ placeId, member: boolean }`.
 *
 * `member: true` khi địa điểm chưa có thì đẩy xuống cuối danh sách; `false` khi
 * không có trong danh sách là no-op (idempotent, không lỗi).
 */
function setCollectionPlaces(config: InternalAxiosRequestConfig, collectionId: string): Collection {
  const collection = db.collections.find((item) => item.id === collectionId)
  if (!collection) notFound(config, "Không tìm thấy bộ sưu tập")
  if (collection.owner.id !== ME.id) forbidden(config, "Không phải bộ sưu tập của bạn")

  const body = parseBody<{ placeId?: unknown; member?: unknown }>(config)
  const placeId = typeof body.placeId === "string" ? body.placeId : ""
  if (!findPlace(placeId)) notFound(config, "Không tìm thấy địa điểm")
  const member = body.member !== false

  if (member && !collection.placeIds.includes(placeId)) {
    collection.placeIds.push(placeId)
  } else if (!member) {
    collection.placeIds = collection.placeIds.filter((id) => id !== placeId)
  }
  return toCollectionDto(collection)
}

function setCommentLike(commentId: string, liked: boolean): Comment {
  const comment = findComment(commentId)
  if (!comment || comment.deleted) notFoundComment()
  if (liked !== comment.likedByMe) {
    comment.likedByMe = liked
    comment.likeCount += liked ? 1 : -1
  }
  return toCommentDto(comment)
}

function deleteCommentSoft(commentId: string): void {
  const comment = findComment(commentId)
  if (!comment || comment.deleted) notFoundComment()

  // Xoá mềm: giữ bản ghi để reply không mất cha, nhưng ẩn nội dung.
  comment.deleted = true
  for (const reply of db.comments) {
    if (reply.parentId === commentId && !reply.deleted) reply.deleted = true
  }

  const post = db.posts.find((item) => item.id === comment.postId)
  if (post) {
    const removedCount = 1 + db.comments.filter((item) => item.parentId === commentId).length
    post.commentCount = Math.max(0, post.commentCount - removedCount)
  }
}

function notFoundComment(): never {
  throw new Error("Không tìm thấy bình luận")
}

// ---------------------------------------------------------------------------
// Hồ sơ người dùng — nghiệp vụ phía server
// ---------------------------------------------------------------------------

function findUserByHandle(handle: string) {
  return Object.values(db.users).find((user) => user.handle === handle)
}

function listProfilePosts(handle: string, tab: string): Post[] {
  const user = findUserByHandle(handle)
  if (!user) throw new Error("Không tìm thấy người dùng")

  return db.posts
    .filter((post) => {
      if (post.author.id !== user.id) return false
      if (tab === "pinned" || tab === "saved") return post.savedByMe && user.id === ME.id
      return true
    })
    .map(toPostDto)
}

function setFollow(handle: string, followed: boolean) {
  const user = findUserByHandle(handle)
  if (!user) throw new Error("Không tìm thấy người dùng")
  if (user.isMe) throw new Error("Không thể tự theo dõi chính mình")

  if (followed !== user.followedByMe) {
    user.followedByMe = followed
    user.followerCount += followed ? 1 : -1
  }
  return user
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

const RESPONSE_DELAY_MS = 320

/**
 * Kịch bản lỗi đọc MỘT LẦN lúc khởi tạo module (`VITE_MOCK_SCENARIO`).
 * Đổi giá trị cần restart dev server — đủ dùng cho việc thử UI, và tránh phải
 * đọc biến môi trường trên mỗi request.
 */
const scenario = resolveScenario(env.mockScenario)

// Cho phép E2E / dev test ghi đè kịch bản động trên window mà không cần restart server
if (typeof window !== "undefined") {
  ;(window as unknown as { __setMockScenario?: (name: string) => void }).__setMockScenario = (
    name: string,
  ) => {
    Object.assign(scenario, resolveScenario(name))
  }
}

/** Route GET trả danh sách — dùng để áp kịch bản `empty`. */
const LIST_ROUTES: readonly RegExp[] = [
  /^\/places$/,
  /^\/places\/daily-picks$/,
  /^\/places\/recommended$/,
  /^\/posts$/,
  /^\/notifications$/,
  /^\/users$/,
  /^\/users\/[^/]+\/posts$/,
  /^\/users\/[^/]+\/collections$/,
  /^\/collections$/,
  /^\/places\/[^/]+\/reviews$/,
  /^\/places\/[^/]+\/posts$/,
]

function wait(ms: number, config: InternalAxiosRequestConfig): Promise<void> {
  return new Promise((resolve, reject) => {
    const signal = config.signal
    if (signal?.aborted) {
      reject(new CanceledError(undefined, config))
      return
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener?.("abort", onAbort)
      resolve()
    }, ms)

    function onAbort() {
      clearTimeout(timer)
      signal?.removeEventListener?.("abort", onAbort)
      reject(new CanceledError(undefined, config))
    }

    signal?.addEventListener?.("abort", onAbort)
  })
}

function ok<T>(config: InternalAxiosRequestConfig, data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: new AxiosHeaders({ "content-type": "application/json" }),
    config,
  }
}

/** 201 cho `POST /register` — giữ đúng mã trạng thái của backend thật. */
function created<T>(config: InternalAxiosRequestConfig, data: T): AxiosResponse<T> {
  return { ...ok(config, data), status: 201, statusText: "Created" }
}

function notFound(config: InternalAxiosRequestConfig, message: string): never {
  throw new AxiosError(message, "ERR_BAD_REQUEST", config, undefined, {
    data: { detail: message },
    status: 404,
    statusText: "Not Found",
    headers: new AxiosHeaders({ "content-type": "application/json" }),
    config,
  })
}

function badRequest(config: InternalAxiosRequestConfig, message: string): never {
  throw new AxiosError(message, "ERR_BAD_REQUEST", config, undefined, {
    data: { detail: message },
    status: 400,
    statusText: "Bad Request",
    headers: new AxiosHeaders({ "content-type": "application/json" }),
    config,
  })
}

function forbidden(config: InternalAxiosRequestConfig, message: string): never {
  throw new AxiosError(message, "ERR_FORBIDDEN", config, undefined, {
    data: { detail: message },
    status: 403,
    statusText: "Forbidden",
    headers: new AxiosHeaders({ "content-type": "application/json" }),
    config,
  })
}

/** 409 — trùng email/handle khi đăng ký (khớp backend thật). */
function conflict(config: InternalAxiosRequestConfig, message: string): never {
  throw new AxiosError(message, "ERR_BAD_REQUEST", config, undefined, {
    data: { detail: message },
    status: 409,
    statusText: "Conflict",
    headers: new AxiosHeaders({ "content-type": "application/json" }),
    config,
  })
}

function unauthorized(config: InternalAxiosRequestConfig, message: string): never {
  throw new AxiosError(message, "ERR_BAD_REQUEST", config, undefined, {
    data: { detail: message },
    status: 401,
    statusText: "Unauthorized",
    headers: new AxiosHeaders({ "content-type": "application/json" }),
    config,
  })
}

/** Lỗi máy chủ 500 — dùng cho kịch bản `server-error`. */
function serverError(config: InternalAxiosRequestConfig, message: string): never {
  throw new AxiosError(message, "ERR_BAD_RESPONSE", config, undefined, {
    data: { detail: message },
    status: 500,
    statusText: "Internal Server Error",
    headers: new AxiosHeaders({ "content-type": "application/json" }),
    config,
  })
}

/** Lỗi mạng (status 0, không response) — dùng cho kịch bản `offline`. */
function networkError(config: InternalAxiosRequestConfig, message: string): never {
  throw new AxiosError(message, AxiosError.ERR_NETWORK, config)
}

/** 503 — tính năng chưa được cấu hình phía server (kịch bản `media-unavailable`). */
function serviceUnavailable(config: InternalAxiosRequestConfig, message: string): never {
  throw new AxiosError(message, "ERR_BAD_RESPONSE", config, undefined, {
    data: { detail: message },
    status: 503,
    statusText: "Service Unavailable",
    headers: new AxiosHeaders({ "content-type": "application/json" }),
    config,
  })
}

function parseBody<T>(config: InternalAxiosRequestConfig): T {
  const raw: unknown = config.data
  if (typeof raw !== "string" || raw.length === 0) return {} as T
  return JSON.parse(raw) as T
}

function query(config: InternalAxiosRequestConfig): Record<string, string> {
  const params = (config.params ?? {}) as Record<string, unknown>
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") result[key] = value
    else if (typeof value === "number" || typeof value === "boolean") result[key] = String(value)
  }
  return result
}

/**
 * `PATCH /me` — cập nhật hồ sơ.
 *
 * Validate trùng quy tắc của form `/settings` (dùng chung `lib/constants`).
 * Chỉ nhận đúng các trường trong hợp đồng; trường lạ bị bỏ qua để client không
 * thể ghi đè dữ liệu server không cho sửa.
 */
/** Ảnh hồ sơ: `null` = xoá, chuỗi = URL mới, khác = 400 — khớp hợp đồng `PATCH /me`. */
function normalizeProfileImageUrl(
  value: unknown,
  config: InternalAxiosRequestConfig,
): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value === "string" && value.length > 0) return value
  badRequest(config, "URL ảnh không hợp lệ")
}

function updateMe(config: InternalAxiosRequestConfig): typeof db.me {
  const body = parseBody<Record<string, unknown>>(config)
  const name = typeof body.name === "string" ? body.name.trim() : ""
  const bio = typeof body.bio === "string" ? body.bio.trim() : ""
  const location = typeof body.location === "string" ? body.location.trim() : ""
  const privateProfile = body.privateProfile

  if (name.length < 2) badRequest(config, "Tên cần ít nhất 2 ký tự")
  if (name.length > MAX_PROFILE_NAME_LENGTH) {
    badRequest(config, `Tên tối đa ${MAX_PROFILE_NAME_LENGTH} ký tự`)
  }
  if (bio.length > MAX_PROFILE_BIO_LENGTH) {
    badRequest(config, `Giới thiệu tối đa ${MAX_PROFILE_BIO_LENGTH} ký tự`)
  }
  if (location.length > MAX_PROFILE_LOCATION_LENGTH) {
    badRequest(config, `Địa điểm tối đa ${MAX_PROFILE_LOCATION_LENGTH} ký tự`)
  }
  if (typeof privateProfile !== "boolean") {
    badRequest(config, "Trường riêng tư phải là boolean")
  }

  // Ảnh hồ sơ: `null` = xoá, bỏ trống = giữ nguyên. Mock không kiểm prefix R2
  // (không có bucket thật) nhưng vẫn giữ đúng kiểu dữ liệu của hợp đồng.
  const avatarUrl = normalizeProfileImageUrl(body.avatarUrl, config)
  const coverUrl = normalizeProfileImageUrl(body.coverUrl, config)

  db.me = {
    ...db.me,
    name,
    bio,
    location,
    privateProfile,
    ...(avatarUrl !== undefined ? { avatarUrl } : {}),
    ...(coverUrl !== undefined ? { coverUrl } : {}),
  }
  db.users[db.me.id] = { ...db.me }
  return { ...db.me }
}

// ---------------------------------------------------------------------------
// Phòng lọc nhóm — port hành vi backend thật (backend/src/lib/rooms.ts).
// ---------------------------------------------------------------------------

/** Base32 Crockford — bỏ I, L, O, U (khớp backend). */
const ROOM_CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

/** Sinh mã phòng 6 ký tự từ CSPRNG của trình duyệt. */
function generateRoomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  let code = ""
  for (const byte of bytes) code += ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length]
  return code
}

function emptyRoomFilter(): RoomFilter {
  return {
    categories: [],
    excludedCategories: [],
    districts: [],
    excludedDistricts: [],
    includeKeywords: [],
    excludeKeywords: [],
  }
}

/** DTO Room — `isMe` tính từ "cookie" mock (roomTokens) hoặc phiên đăng nhập. */
function toRoomDto(room: MockRoom): Room {
  const tokenMemberId = db.roomTokens[room.code]
  return {
    id: room.id,
    code: room.code,
    name: room.name,
    members: room.members.map((member) => ({
      id: member.id,
      displayName: member.displayName,
      isMe: (db.authenticated && member.userId === CURRENT_USER.id) || member.id === tokenMemberId,
      joinedAt: member.joinedAt,
    })),
    // Bản sao sâu — không trả tham chiếu tới "db" nội bộ, nếu không React state
    // bị mutate tại chỗ (unshift vào proposals) và JSON-compare tưởng không đổi.
    proposals: room.proposals.map((proposal) => ({ ...proposal })),
    filter: {
      categories: [...room.filter.categories],
      excludedCategories: [...room.filter.excludedCategories],
      districts: [...room.filter.districts],
      excludedDistricts: [...room.filter.excludedDistricts],
      includeKeywords: [...room.filter.includeKeywords],
      excludeKeywords: [...room.filter.excludeKeywords],
    },
    createdAt: room.createdAt,
  }
}

/**
 * Actor của một mutation phòng: phiên đăng nhập (chủ phòng) trước, "cookie"
 * guest sau — khớp thứ tự resolve của backend (`resolveRoomActor`).
 */
function resolveMockRoomActor(config: InternalAxiosRequestConfig, room: MockRoom): MockRoomMember {
  if (db.authenticated) {
    const owner = room.members.find((member) => member.userId === CURRENT_USER.id)
    if (owner) return owner
  }
  const member = room.members.find((item) => item.id === db.roomTokens[room.code])
  if (member) return member
  forbidden(config, "Bạn không ở trong phòng này")
}

/** Chuỗi mô tả đề xuất — khớp `describeProposal` của backend (giá trị lạ → "—"). */
function describeMockProposal(proposal: RoomProposal): string {
  const sign = proposal.kind === "include" ? "＋" : "－"
  if (proposal.field === "category")
    return `${sign} Loại hình: ${categoryLabel(proposal.value as PlaceCategory)}`
  if (proposal.field === "district") return `${sign} Quận: ${proposal.value}`
  if (proposal.field === "priceMax") {
    const level = Number(proposal.value)
    const label = level === 1 || level === 2 || level === 3 ? priceLevelLabel(level) : "—"
    return `＋ Mức giá tối đa: ${label}`
  }
  return `${sign} Từ khoá: ${proposal.value}`
}

/** Áp đề xuất vào filter — port 1:1 `applyProposalToFilter` của backend. */
function applyMockProposalToFilter(
  filter: RoomFilter,
  proposal: { kind: "include" | "exclude"; field: RoomProposal["field"]; value: string },
): RoomFilter {
  const value = proposal.value
  if (proposal.field === "category") {
    const category = value as PlaceCategory
    return proposal.kind === "include"
      ? {
          ...filter,
          categories: [...new Set([...filter.categories, category])],
          excludedCategories: filter.excludedCategories.filter((item) => item !== category),
        }
      : {
          ...filter,
          excludedCategories: [...new Set([...filter.excludedCategories, category])],
          categories: filter.categories.filter((item) => item !== category),
        }
  }
  if (proposal.field === "district") {
    return proposal.kind === "include"
      ? {
          ...filter,
          districts: [...new Set([...filter.districts, value])],
          excludedDistricts: filter.excludedDistricts.filter((item) => item !== value),
        }
      : {
          ...filter,
          excludedDistricts: [...new Set([...filter.excludedDistricts, value])],
          districts: filter.districts.filter((item) => item !== value),
        }
  }
  if (proposal.field === "priceMax") {
    if (proposal.kind !== "include") return filter
    const parsed = Number(value)
    if (parsed !== 1 && parsed !== 2 && parsed !== 3) return filter
    return { ...filter, priceMax: parsed }
  }
  return proposal.kind === "include"
    ? { ...filter, includeKeywords: [...new Set([...filter.includeKeywords, value])] }
    : { ...filter, excludeKeywords: [...new Set([...filter.excludeKeywords, value])] }
}

const VALID_ROOM_CATEGORIES: ReadonlySet<PlaceCategory> = new Set([
  "cafe",
  "restaurant",
  "street-food",
  "bakery",
  "dessert",
  "bar",
])

/** Chuẩn hoá giá trị đề xuất theo field — `null` = không hợp lệ (400). */
function normalizeMockProposalValue(field: RoomProposal["field"], value: string): string | null {
  if (field === "category") {
    // Dạng Prisma (`street_food`) được chuẩn hoá về dạng API (`street-food`).
    const normalized = value.trim().replace(/_/gu, "-")
    return VALID_ROOM_CATEGORIES.has(normalized as PlaceCategory) ? normalized : null
  }
  if (field === "priceMax") return value === "1" || value === "2" || value === "3" ? value : null
  return value
}

type Handler = (config: InternalAxiosRequestConfig, params: string[]) => unknown
interface Route {
  method: string
  pattern: RegExp
  handler: Handler
  /** Mã trạng thái trả về — mặc định 200 (201 dùng `created`). */
  status?: 201
}

const routes: Route[] = [
  // Gợi ý người theo dõi — route `/users/suggestions` phải khớp TRƯỚC `/users/:handle`.
  ...userSuggestionRoutes,
  {
    method: "get",
    pattern: /^\/places\/suggestions$/,
    handler: (config) => {
      const { q = "", limit = "3" } = query(config)
      return { suggestions: suggestPlacesForCaption(q, Number(limit)) }
    },
  },
  {
    method: "get",
    pattern: /^\/places$/,
    handler: (config) => {
      const {
        cursor,
        category,
        district,
        q,
        priceMax,
        excludeCategory,
        excludeDistrict,
        includeKeyword,
        excludeKeyword,
        sort,
        lat,
        lng,
      } = query(config)
      const matched = sortPublishedPlaces(
        listPublishedPlaces({
          category,
          district,
          q,
          priceMax,
          excludeCategory,
          excludeDistrict,
          includeKeyword,
          excludeKeyword,
        }),
        sort,
        lat,
        lng,
      )
      // Cùng hợp đồng `meta` với backend thật: totalResults là COUNT toàn bộ
      // kết quả khớp (không phải số item của trang này).
      return {
        ...paginate(matched, cursor ?? null, PLACES_PAGE_SIZE),
        meta: { tookMs: 0, cacheHit: false, totalResults: matched.length },
      }
    },
  },
  {
    method: "get",
    // Đứng trước `/places/:id` — nếu không `:id` sẽ nuốt cả "map"/"saved".
    pattern: /^\/places\/map$/,
    handler: (config) => {
      const {
        bbox,
        category,
        district,
        q,
        priceMax,
        excludeCategory,
        excludeDistrict,
        includeKeyword,
        excludeKeyword,
      } = query(config)
      // Bản đồ không phân trang: trả mọi địa điểm trong khung (chặn trên để
      // khung nhìn quá rộng ở zoom nhỏ không trả cả dataset).
      const MAP_MAX_PLACES = 300
      const items = listPublishedPlaces({
        bbox,
        category,
        district,
        q,
        priceMax,
        excludeCategory,
        excludeDistrict,
        includeKeyword,
        excludeKeyword,
      })
      return { items: items.slice(0, MAP_MAX_PLACES), total: items.length }
    },
  },
  {
    method: "get",
    // Đứng trước `/places/:id` — nếu không `:id` sẽ nuốt cả "saved".
    pattern: /^\/places\/saved$/,
    handler: (config) => {
      const { cursor } = query(config)
      // "Đã lưu" = nằm trong ít nhất một bộ sưu tập của chính mình; gộp + loại trùng.
      const savedIds = new Set(
        db.collections
          .filter((collection) => collection.owner.id === CURRENT_USER.id)
          .flatMap((collection) => collection.placeIds),
      )
      const items = db.places
        .filter((place) => savedIds.has(place.id) && isPubliclyVisible(place))
        .map(toPlaceDto)
      return paginate(items, cursor ?? null, PLACES_PAGE_SIZE)
    },
  },
  {
    method: "get",
    // Đứng trước `/places/:id` — nếu không `:id` sẽ nuốt "daily-picks".
    pattern: /^\/places\/daily-picks$/,
    handler: () => {
      // Mock không có job hằng ngày: lấy 3 quán công khai đầu tiên, cùng bộ mỗi
      // lần tải. Ảnh lấy từ MOCK_PLACES (fixture cold-start) như lưới bên dưới.
      const items = db.places
        .filter(isPubliclyVisible)
        .slice(0, 3)
        .map((place, index) => ({
          place: toPlaceDto(place),
          reason: DAILY_PICK_REASONS[index % DAILY_PICK_REASONS.length],
          // Mock tính "vì sao" theo cùng hình dạng backend trả (không phải số
          // liệu thật của thuật toán — chỉ để UI/e2e có dữ liệu hiển thị).
          why: {
            matchPercent: 70 - index * 10,
            district: place.district,
            distanceKm: null,
            openNow: null,
            signals: place.imageUrl ? ["Ảnh thật"] : [],
          },
        }))
      return { date: new Date().toISOString().slice(0, 10), items }
    },
  },
  {
    method: "get",
    // Cá nhân hoá theo lịch sử — mock chưa có dữ liệu tương tác nên trả rỗng;
    // FE coi rỗng là "ẩn dải". Đứng trước `/places/:id` như daily-picks.
    pattern: /^\/places\/recommended$/,
    handler: () => ({
      items: [],
      next: null,
      meta: { tookMs: 0, cacheHit: false, totalResults: 0 },
    }),
  },
  {
    method: "get",
    pattern: /^\/places\/([^/]+)$/,
    handler: (config, [placeId]) => {
      const place = findPlace(placeId)
      if (!place || place.publishedAt === null) notFound(config, "Không tìm thấy địa điểm")
      return toPlaceDto(place)
    },
  },
  {
    method: "get",
    pattern: /^\/places\/([^/]+)\/reviews$/,
    handler: (config, [placeId]) => {
      const place = findPlace(placeId)
      if (!place || place.publishedAt === null) notFound(config, "Không tìm thấy địa điểm")
      return { items: listReviews(placeId), next: null } satisfies Page<Review>
    },
  },
  {
    method: "post",
    pattern: /^\/places\/([^/]+)\/reviews$/,
    handler: (config, [placeId]) => createReview(config, placeId),
  },
  {
    method: "delete",
    pattern: /^\/places\/([^/]+)\/reviews$/,
    handler: (config, [placeId]) => deleteReview(config, placeId),
  },
  {
    method: "post",
    pattern: /^\/places\/([^/]+)\/reports$/,
    handler: (config, [placeId]) => createPlaceReport(config, placeId),
  },
  {
    method: "get",
    pattern: /^\/collections$/,
    handler: (config) => {
      const { placeId } = query(config)
      return { items: listMyCollections(placeId), next: null } satisfies Page<CollectionSummary>
    },
  },
  {
    method: "post",
    pattern: /^\/collections$/,
    handler: (config) => createCollection(config),
  },
  {
    method: "get",
    pattern: /^\/collections\/([^/]+)$/,
    handler: (config, [collectionId]) => {
      const collection = db.collections.find((item) => item.id === collectionId)
      if (!collection) notFound(config, "Không tìm thấy bộ sưu tập")
      return toCollectionDto(collection)
    },
  },
  {
    method: "delete",
    pattern: /^\/collections\/([^/]+)$/,
    handler: (config, [collectionId]) => deleteCollection(config, collectionId),
  },
  {
    method: "patch",
    pattern: /^\/collections\/([^/]+)$/,
    handler: (config, [collectionId]) => updateCollection(config, collectionId),
  },
  {
    method: "post",
    pattern: /^\/collections\/([^/]+)\/like$/,
    handler: (config, [collectionId]) => setCollectionLike(config, collectionId, true),
  },
  {
    method: "delete",
    pattern: /^\/collections\/([^/]+)\/like$/,
    handler: (config, [collectionId]) => setCollectionLike(config, collectionId, false),
  },
  {
    method: "patch",
    pattern: /^\/collections\/([^/]+)\/places$/,
    handler: (config, [collectionId]) => setCollectionPlaces(config, collectionId),
  },
  {
    method: "get",
    pattern: /^\/posts$/,
    handler: (config) => {
      const { filter = "all", q, cursor } = query(config)
      const needle = typeof q === "string" ? normalizeText(q.trim()) : ""
      const items = db.posts.filter((post) => {
        if (filter === "unplaced" && post.placeId !== null) return false
        if (filter === "mine" && post.author.id !== CURRENT_USER.id) return false
        if (filter === "saved" && !post.savedByMe) return false
        if (filter === "following") {
          // Chưa đăng nhập hoặc chưa theo dõi ai → feed rỗng (khớp backend).
          if (!db.authenticated) return false
          const author = db.users[post.author.id]
          if (!author?.followedByMe) return false
        }
        if (needle.length > 0 && !normalizeText(post.caption).includes(needle)) return false
        return true
      })
      return paginate(items.map(toPostDto), cursor ?? null, POSTS_PAGE_SIZE)
    },
  },
  {
    method: "post",
    // Khớp backend thật: `POST /media` trả 201.
    pattern: /^\/media$/,
    status: 201,
    handler: (config) => createMediaTicket(config),
  },
  {
    method: "post",
    pattern: /^\/posts$/,
    handler: (config) => createPost(config),
  },
  {
    method: "get",
    // Chỉ khớp đúng `/posts/:id` — không nuốt `/posts/:id/comments` vì `[^/]+` loại dấu `/`.
    pattern: /^\/posts\/([^/]+)$/,
    handler: (config, [postId]) => {
      const post = db.posts.find((item) => item.id === postId)
      if (!post) notFound(config, "Không tìm thấy bài đăng")
      return toPostDto(post)
    },
  },
  {
    method: "patch",
    pattern: /^\/posts\/([^/]+)\/place$/,
    handler: (config, [postId]) => {
      const body = parseBody<{ placeId?: string }>(config)
      if (!body.placeId) notFound(config, "Thiếu placeId")
      const post = attachPlaceToPost(postId, body.placeId)
      if (!post) notFound(config, "Không tìm thấy bài đăng")
      return post
    },
  },
  {
    method: "patch",
    pattern: /^\/posts\/([^/]+)\/like$/,
    handler: (config, [postId]) => {
      const body = parseBody<{ liked?: boolean }>(config)
      const post = db.posts.find((item) => item.id === postId)
      if (!post) notFound(config, "Không tìm thấy bài đăng")
      const liked = body.liked ?? !post.likedByMe
      if (liked !== post.likedByMe) {
        post.likedByMe = liked
        post.likeCount += liked ? 1 : -1
      }
      return toPostDto(post)
    },
  },
  {
    method: "patch",
    pattern: /^\/posts\/([^/]+)\/save$/,
    handler: (config, [postId]) => {
      const body = parseBody<{ saved?: boolean }>(config)
      const post = db.posts.find((item) => item.id === postId)
      if (!post) notFound(config, "Không tìm thấy bài đăng")
      post.savedByMe = body.saved ?? !post.savedByMe
      return toPostDto(post)
    },
  },
  {
    method: "get",
    pattern: /^\/posts\/([^/]+)\/comments$/,
    handler: (config, [postId]) => {
      const { sort = "new" } = query(config)
      if (!db.posts.some((item) => item.id === postId)) notFound(config, "Không tìm thấy bài đăng")
      return listComments(postId, sort === "top" ? "top" : "new")
    },
  },
  {
    method: "post",
    pattern: /^\/posts\/([^/]+)\/comments$/,
    handler: (config, [postId]) => {
      const body = parseBody<{ body?: string; parentId?: string | null }>(config)
      try {
        return createComment(postId, body)
      } catch (error) {
        badRequest(config, error instanceof Error ? error.message : "Yêu cầu không hợp lệ")
      }
    },
  },
  {
    method: "patch",
    pattern: /^\/comments\/([^/]+)\/like$/,
    handler: (config, [commentId]) => {
      const body = parseBody<{ liked?: boolean }>(config)
      const comment = findComment(commentId)
      if (!comment || comment.deleted) notFound(config, "Không tìm thấy bình luận")
      return setCommentLike(commentId, body.liked ?? !comment.likedByMe)
    },
  },
  {
    method: "delete",
    pattern: /^\/comments\/([^/]+)$/,
    handler: (config, [commentId]) => {
      const comment = findComment(commentId)
      if (!comment || comment.deleted) notFound(config, "Không tìm thấy bình luận")
      // Chỉ tác giả mới xoá được — trước đây thiếu kiểm tra này nên ai cũng xoá được.
      if (comment.author.id !== CURRENT_USER.id) {
        forbidden(config, "Không phải bình luận của bạn")
      }
      deleteCommentSoft(commentId)
      return { deleted: true }
    },
  },
  {
    method: "get",
    pattern: /^\/places\/([^/]+)\/posts$/,
    handler: (config, [placeId]) => {
      const place = findPlace(placeId)
      if (!place || place.publishedAt === null) notFound(config, "Không tìm thấy địa điểm")
      const items = db.posts.filter((post) => post.placeId === placeId).map(toPostDto)
      return { items, next: null } satisfies Page<Post>
    },
  },
  {
    method: "get",
    pattern: /^\/me$/,
    handler: (config) => {
      // Dev có thể tắt bypass auth (`VITE_DEV_BYPASS_AUTH=false`) hoặc đăng xuất
      // (`DELETE /session`) để thấy đúng trạng thái chưa đăng nhập; prod không
      // nạp file này nên luôn đi backend.
      if (!db.authenticated) unauthorized(config, "Chưa đăng nhập")
      return { ...db.me }
    },
  },
  {
    method: "patch",
    pattern: /^\/me$/,
    handler: (config) => {
      if (!db.authenticated) unauthorized(config, "Chưa đăng nhập")
      return updateMe(config)
    },
  },
  {
    /** Đăng xuất: tắt phiên mock. Client xoá cache và quay về trạng thái chưa đăng nhập. */
    method: "delete",
    pattern: /^\/session$/,
    handler: (config) => {
      if (!db.authenticated) unauthorized(config, "Chưa đăng nhập")
      db.authenticated = false
      return { loggedOut: true }
    },
  },
  {
    /** Đăng nhập email + password — so khớp tài khoản mock (xem `MOCK_EMAIL`). */
    method: "post",
    pattern: /^\/session$/,
    handler: (config) => {
      if (scenario.unauthorized) unauthorized(config, "Chưa đăng nhập")
      const body = parseBody<{ email?: unknown; password?: unknown }>(config)
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
      const password = typeof body.password === "string" ? body.password : ""
      const account = db.accounts.find((item) => item.email === email && item.password === password)
      if (!account || db.deletedUserIds.has(account.userId)) {
        unauthorized(config, "Email hoặc mật khẩu không đúng")
      }
      // Bắt buộc xác thực email (khớp backend thật): chưa verified → 403 riêng,
      // không lẫn vào "Email hoặc mật khẩu không đúng".
      if (!account.verified) {
        forbidden(
          config,
          "Email chưa được xác thực. Hãy mở link trong email xác thực (kiểm tra cả mục spam) rồi đăng nhập lại.",
        )
      }
      const user = db.users[account.userId]
      if (!user) unauthorized(config, "Email hoặc mật khẩu không đúng")
      db.me = { ...user }
      db.authenticated = true
      return { ...db.me }
    },
  },
  {
    /**
     * Đăng ký — tạo tài khoản CHƯA xác thực email (khớp backend thật từ
     * 2026-11-12): không mở phiên, trả `{requiresVerification:true}` (201).
     */
    method: "post",
    pattern: /^\/register$/,
    handler: (config) => {
      const body = parseBody<Record<string, unknown>>(config)
      const name = typeof body.name === "string" ? body.name.trim() : ""
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
      const password = typeof body.password === "string" ? body.password : ""
      const handle = typeof body.handle === "string" ? body.handle.trim().toLowerCase() : ""

      if (name.length < 2 || name.length > MAX_PROFILE_NAME_LENGTH) {
        badRequest(config, "Tên cần từ 2 đến 40 ký tự")
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) badRequest(config, "Email không hợp lệ")
      if (password.length < 8) badRequest(config, "Mật khẩu cần ít nhất 8 ký tự")
      if (!/^[a-z0-9_]{3,30}$/u.test(handle)) {
        badRequest(config, "Handle chỉ gồm chữ thường, số và gạch dưới (3–30 ký tự)")
      }
      // Trùng email: backend thật trả "generic" 201 như đăng ký mới (không lộ
      // email tồn tại) — mock giữ đúng hợp đồng đó.
      if (db.accounts.some((account) => account.email === email)) {
        return created(config, { requiresVerification: true })
      }
      if (Object.values(db.users).some((user) => user.handle === handle)) {
        conflict(config, "Handle đã được sử dụng")
      }

      const id = `u-${++userSeq}`
      const user: (typeof db.users)[string] = {
        id,
        name,
        handle,
        initials: formatInitials(name),
        bio: "",
        location: "",
        avatarUrl: null,
        coverUrl: null,
        joinedAt: new Date().toISOString(),
        postCount: 0,
        followerCount: 0,
        followingCount: 0,
        followedByMe: false,
        isMe: true,
        privateProfile: false,
      }
      db.users[id] = user
      db.accounts.push({ userId: id, email, password, verified: false })
      return created(config, { requiresVerification: true })
    },
  },
  {
    /**
     * Gửi lại mail xác thực.
     *
     * Mock không có hộp thư thật: coi thao tác này là "người dùng đã mở link
     * xác thực" và đánh dấu tài khoản đã xác thực — nhờ vậy e2e mock đi được
     * trọn luồng đăng ký → chưa xác thực bị chặn → xác thực → đăng nhập được.
     * Luôn trả `{status:true}` như backend (không lộ email tồn tại).
     */
    method: "post",
    pattern: /^\/auth\/send-verification-email$/,
    handler: (config) => {
      const body = parseBody<{ email?: unknown }>(config)
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
      const account = db.accounts.find((item) => item.email === email)
      if (account) account.verified = true
      return { status: true }
    },
  },
  {
    /** Quên mật khẩu — luôn thành công để không lộ email có tồn tại. */
    method: "post",
    pattern: /^\/auth\/request-password-reset$/,
    handler: () => ({
      status: true,
      message: "If this email exists in our system, check your email for the reset link",
    }),
  },
  {
    /** Đặt lại mật khẩu — mock không có token thật, chỉ kiểm đầu vào tối thiểu. */
    method: "post",
    pattern: /^\/auth\/reset-password$/,
    handler: (config) => {
      const body = parseBody<{ token?: unknown; newPassword?: unknown }>(config)
      const token = typeof body.token === "string" ? body.token : ""
      const newPassword = typeof body.newPassword === "string" ? body.newPassword : ""
      if (token.length === 0) badRequest(config, "Token không hợp lệ")
      if (newPassword.length < 8) badRequest(config, "Mật khẩu cần ít nhất 8 ký tự")
      return { status: true }
    },
  },
  {
    /** Xoá tài khoản — đánh dấu đã xoá, tắt phiên (khớp xoá mềm của backend). */
    method: "delete",
    pattern: /^\/me$/,
    handler: (config) => {
      if (!db.authenticated) unauthorized(config, "Chưa đăng nhập")
      db.deletedUserIds.add(db.me.id)
      db.authenticated = false
      return { deleted: true }
    },
  },
  {
    method: "get",
    pattern: /^\/users$/,
    handler: (config) => {
      const { q } = query(config)
      const needle = typeof q === "string" ? normalizeText(q.trim()) : ""
      const items = Object.values(db.users).filter((user) => {
        if (needle.length === 0) return true
        return (
          normalizeText(user.name).includes(needle) || normalizeText(user.handle).includes(needle)
        )
      })
      return { items, next: null } satisfies Page<(typeof db.users)[string]>
    },
  },
  {
    method: "get",
    pattern: /^\/users\/([^/]+)$/,
    handler: (config, [handle]) => {
      const user = findUserByHandle(handle)
      if (!user) notFound(config, "Không tìm thấy người dùng")
      return { ...user }
    },
  },
  {
    method: "get",
    pattern: /^\/users\/([^/]+)\/posts$/,
    handler: (config, [handle]) => {
      const { tab = "posts" } = query(config)
      try {
        const items = listProfilePosts(handle, tab)
        return { items, next: null } satisfies Page<Post>
      } catch {
        notFound(config, "Không tìm thấy người dùng")
      }
    },
  },
  {
    method: "get",
    pattern: /^\/users\/([^/]+)\/collections$/,
    handler: (config, [handle]) => {
      try {
        const items = listUserCollections(handle)
        return { items, next: null } satisfies Page<CollectionSummary>
      } catch {
        notFound(config, "Không tìm thấy người dùng")
      }
    },
  },
  {
    method: "post",
    pattern: /^\/users\/([^/]+)\/follow$/,
    handler: (config, [handle]) => {
      try {
        return setFollow(handle, true)
      } catch (error) {
        badRequest(config, error instanceof Error ? error.message : "Yêu cầu không hợp lệ")
      }
    },
  },
  {
    method: "delete",
    pattern: /^\/users\/([^/]+)\/follow$/,
    handler: (config, [handle]) => {
      try {
        return setFollow(handle, false)
      } catch (error) {
        badRequest(config, error instanceof Error ? error.message : "Yêu cầu không hợp lệ")
      }
    },
  },
  {
    method: "get",
    pattern: /^\/notifications$/,
    handler: (config) => {
      syncPlaceSuggestions()
      const { cursor } = query(config)
      const items = db.notifications.map(toNotificationDto)
      return paginate(items, cursor ?? null, NOTIFICATIONS_PAGE_SIZE)
    },
  },
  {
    method: "patch",
    pattern: /^\/notifications$/,
    handler: () => {
      for (const notification of db.notifications) notification.read = true
      return db.notifications.map(toNotificationDto)
    },
  },
  {
    method: "patch",
    pattern: /^\/notifications\/([^/]+)$/,
    handler: (config, [notificationId]) => {
      const notification = db.notifications.find((item) => item.id === notificationId)
      if (!notification) notFound(config, "Không tìm thấy thông báo")
      notification.read = true
      return toNotificationDto(notification)
    },
  },

  // Phòng lọc nhóm — mục cụ thể đứng trước `/rooms/:code`.
  {
    method: "post",
    pattern: /^\/rooms$/,
    handler: (config) => {
      // Tạo phòng cần đăng nhập (khớp backend).
      if (!db.authenticated) unauthorized(config, "Chưa đăng nhập")
      const body = parseBody<{ name?: unknown }>(config)
      const name = typeof body.name === "string" ? body.name.trim() : ""
      if (name.length > MAX_ROOM_NAME_LENGTH) {
        badRequest(config, `Tên phòng tối đa ${MAX_ROOM_NAME_LENGTH} ký tự`)
      }

      const now = new Date().toISOString()
      const owner: MockRoomMember = {
        id: `room-member-${++roomMemberSeq}`,
        displayName: db.me.name,
        joinedAt: now,
        userId: CURRENT_USER.id,
      }
      const room: MockRoom = {
        id: `room-${++roomSeq}`,
        code: generateRoomCode(),
        name: name || "Phòng lọc nhóm",
        members: [owner],
        proposals: [],
        filter: emptyRoomFilter(),
        createdAt: now,
      }
      db.rooms.push(room)
      // Mô phỏng Set-Cookie HttpOnly của backend.
      db.roomTokens[room.code] = owner.id
      return { ...toRoomDto(room), guestToken: `mock-room-token-${owner.id}` }
    },
  },
  {
    method: "get",
    pattern: /^\/rooms\/([^/]+)$/,
    handler: (config, [code]) => {
      const room = db.rooms.find((item) => item.code === code.toUpperCase())
      if (!room) notFound(config, "Không tìm thấy phòng")
      return toRoomDto(room)
    },
  },
  {
    method: "post",
    pattern: /^\/rooms\/([^/]+)\/join$/,
    handler: (config, [code]) => {
      const room = db.rooms.find((item) => item.code === code.toUpperCase())
      if (!room) notFound(config, "Không tìm thấy phòng")

      const body = parseBody<{ displayName?: unknown }>(config)
      const displayName = typeof body.displayName === "string" ? body.displayName.trim() : ""
      if (!displayName || displayName.length > MAX_MEMBER_NAME_LENGTH) {
        badRequest(config, "Tên hiển thị không hợp lệ")
      }

      // "Cookie" cũ khớp thành viên → idempotent, không tạo mới.
      const tokenMember = room.members.find((member) => member.id === db.roomTokens[room.code])
      if (tokenMember) {
        return { room: toRoomDto(room), memberId: tokenMember.id, joined: false }
      }

      const duplicate = room.members.some(
        (member) => member.displayName.toLowerCase() === displayName.toLowerCase(),
      )
      if (duplicate) conflict(config, "Tên này đã có người dùng trong phòng")

      const member: MockRoomMember = {
        id: `room-member-${++roomMemberSeq}`,
        displayName,
        joinedAt: new Date().toISOString(),
        userId: null,
      }
      room.members.push(member)
      db.roomTokens[room.code] = member.id
      return {
        room: toRoomDto(room),
        memberId: member.id,
        joined: true,
        guestToken: `mock-room-token-${member.id}`,
      }
    },
  },
  {
    method: "post",
    pattern: /^\/rooms\/([^/]+)\/proposals$/,
    handler: (config, [code]) => {
      const room = db.rooms.find((item) => item.code === code.toUpperCase())
      if (!room) notFound(config, "Không tìm thấy phòng")
      const actor = resolveMockRoomActor(config, room)

      const body = parseBody<{ kind?: unknown; field?: unknown; value?: unknown }>(config)
      const kind = body.kind
      const field = body.field
      const rawValue = typeof body.value === "string" ? body.value.trim() : ""
      if (kind !== "include" && kind !== "exclude") badRequest(config, "Đề xuất không hợp lệ")
      if (
        field !== "category" &&
        field !== "district" &&
        field !== "priceMax" &&
        field !== "keyword"
      ) {
        badRequest(config, "Đề xuất không hợp lệ")
      }
      if (!rawValue || rawValue.length > MAX_ROOM_KEYWORD_LENGTH) {
        badRequest(config, "Giá trị đề xuất không hợp lệ")
      }
      const value = normalizeMockProposalValue(field, rawValue)
      if (value === null) badRequest(config, "Giá trị đề xuất không hợp lệ")

      room.proposals.unshift({
        id: `room-proposal-${++roomProposalSeq}`,
        memberId: actor.id,
        kind,
        field,
        value,
        status: "open",
        createdAt: new Date().toISOString(),
      })
      return toRoomDto(room)
    },
  },
  {
    method: "post",
    pattern: /^\/rooms\/([^/]+)\/proposals\/([^/]+)\/apply$/,
    handler: (config, [code, proposalId]) => {
      const room = db.rooms.find((item) => item.code === code.toUpperCase())
      if (!room) notFound(config, "Không tìm thấy phòng")
      const actor = resolveMockRoomActor(config, room)
      const proposal = room.proposals.find((item) => item.id === proposalId)
      if (!proposal) notFound(config, "Không tìm thấy đề xuất")

      const isOwner = actor.userId !== null && actor.userId === CURRENT_USER.id
      if (proposal.memberId !== actor.id && !isOwner) {
        forbidden(config, "Chỉ tác giả đề xuất hoặc chủ phòng mới được áp dụng")
      }
      if (proposal.status !== "open") {
        conflict(config, "Đề xuất đã được áp dụng hoặc đã bị bỏ")
      }

      proposal.status = "applied"
      room.filter = applyMockProposalToFilter(room.filter, proposal)
      return { room: toRoomDto(room), summary: describeMockProposal(proposal) }
    },
  },
  {
    method: "post",
    pattern: /^\/rooms\/([^/]+)\/proposals\/([^/]+)\/dismiss$/,
    handler: (config, [code, proposalId]) => {
      const room = db.rooms.find((item) => item.code === code.toUpperCase())
      if (!room) notFound(config, "Không tìm thấy phòng")
      const actor = resolveMockRoomActor(config, room)
      const proposal = room.proposals.find((item) => item.id === proposalId)
      if (!proposal) notFound(config, "Không tìm thấy đề xuất")

      const isOwner = actor.userId !== null && actor.userId === CURRENT_USER.id
      if (proposal.memberId !== actor.id && !isOwner) {
        forbidden(config, "Chỉ tác giả đề xuất hoặc chủ phòng mới được bỏ qua")
      }
      if (proposal.status !== "open") {
        conflict(config, "Đề xuất đã được áp dụng hoặc đã bị bỏ")
      }

      proposal.status = "dismissed"
      return toRoomDto(room)
    },
  },
  {
    method: "delete",
    pattern: /^\/rooms\/([^/]+)\/members\/([^/]+)$/,
    handler: (config, [code, memberId]) => {
      const room = db.rooms.find((item) => item.code === code.toUpperCase())
      if (!room) notFound(config, "Không tìm thấy phòng")
      const actor = resolveMockRoomActor(config, room)
      const target = room.members.find((item) => item.id === memberId)
      if (!target) forbidden(config, "Bạn không ở trong phòng này")

      const isOwner = actor.userId !== null && actor.userId === CURRENT_USER.id
      if (actor.id !== target.id && !isOwner) {
        forbidden(config, "Chỉ chủ phòng mới được cho người khác rời phòng")
      }

      room.members = room.members.filter((item) => item.id !== target.id)
      room.proposals = room.proposals.filter((item) => item.memberId !== target.id)
      // Mô phỏng xoá cookie khi chính mình rời phòng.
      if (actor.id === target.id) delete db.roomTokens[room.code]
      return toRoomDto(room)
    },
  },

  // -------------------------------------------------------------------------
  // Vận hành /system — demo số liệu của PHIÊN mock (không phải backend thật).
  // -------------------------------------------------------------------------
  {
    method: "get",
    pattern: /^\/system\/stats$/,
    handler: () => {
      const places = db.places
      const byEndpoint = [...mockMetrics.routes.entries()]
        .map(([route, count]) => ({ route, count }))
        .sort((a, b) => b.count - a.count)
      return {
        uptimeMs: Date.now() - mockMetrics.startedAt,
        totalQueries: [...mockMetrics.routes.values()].reduce((sum, count) => sum + count, 0),
        avgLatencyMs: RESPONSE_DELAY_MS + scenario.delayMs,
        cacheHitRatio: 0,
        byEndpoint,
        venues: {
          total: places.length,
          published: places.filter((place) => place.publishedAt !== null).length,
          withImages: places.filter((place) => place.imageUrl !== undefined).length,
          withTags: places.filter((place) => place.tags.length > 0).length,
          withHours: places.filter((place) => place.openingHours !== undefined).length,
        },
      }
    },
  },
  {
    method: "post",
    pattern: /^\/system\/reset$/,
    handler: () => {
      mockMetrics.routes.clear()
      mockMetrics.startedAt = Date.now()
      return { reset: true }
    },
  },

  // -------------------------------------------------------------------------
  // Quản trị `/admin/*`
  // -------------------------------------------------------------------------
  {
    method: "get",
    pattern: /^\/admin\/overview$/,
    handler: (config) => {
      requireMockRole(config, ["admin", "moderator"])
      const byEndpoint = [...mockMetrics.routes.entries()]
        .map(([route, count]) => ({ route, count }))
        .sort((a, b) => b.count - a.count)
      const userList = Object.keys(db.users)
        .filter((id) => !db.deletedUserIds.has(id))
        .map(toMockAdminUser)
      const reports = db.reports.map(toMockAdminReport)
      return {
        uptimeMs: Date.now() - mockMetrics.startedAt,
        totalQueries: [...mockMetrics.routes.values()].reduce((sum, count) => sum + count, 0),
        avgLatencyMs: RESPONSE_DELAY_MS + scenario.delayMs,
        cacheHitRatio: 0,
        byEndpoint,
        venues: {
          total: db.places.length,
          published: db.places.filter((p) => p.publishedAt !== null).length,
          unpublished: db.places.filter((p) => p.publishedAt === null).length,
          closed: db.places.filter((p) => p.status === "closed").length,
          withImages: db.places.filter((p) => p.imageUrl !== undefined).length,
          withTags: db.places.filter((p) => p.tags.length > 0).length,
          withHours: db.places.filter((p) => p.openingHours !== undefined).length,
        },
        reports: {
          pending: reports.filter((r) => r.status === "pending").length,
          reviewed: reports.filter((r) => r.status === "reviewed").length,
          dismissed: reports.filter((r) => r.status === "dismissed").length,
          total: reports.length,
        },
        users: {
          total: userList.length,
          active: userList.filter((u) => u.bannedAt === null).length,
          banned: userList.filter((u) => u.bannedAt !== null).length,
          admins: userList.filter((u) => u.role === "admin").length,
          moderators: userList.filter((u) => u.role === "moderator").length,
        },
        activity: {
          auditLogs24h: db.auditLogs.length,
          interactionEvents24h: 0,
        },
      } satisfies AdminOverview
    },
  },
  {
    method: "get",
    pattern: /^\/admin\/reports$/,
    handler: (config) => {
      requireMockRole(config, ["admin", "moderator"])
      const { status = "pending", cursor } = query(config)
      const filtered = db.reports
        .map(toMockAdminReport)
        .filter((r) => status === "all" || r.status === (status as AdminReportStatus))
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      return paginate(filtered, cursor ?? null, 20)
    },
  },
  {
    method: "patch",
    pattern: /^\/admin\/reports\/([^/]+)$/,
    handler: (config, [reportId]) => {
      requireMockRole(config, ["admin", "moderator"])
      const report = db.reports.find((item) => item.id === reportId)
      if (!report) notFound(config, "Không tìm thấy báo cáo")
      const parsed = updateAdminReportInputSchema.safeParse(parseBody(config))
      if (!parsed.success)
        badRequest(config, parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ")
      const now = new Date().toISOString()
      report.status = parsed.data.status
      report.updatedAt = now
      const place = findPlace(report.placeId)
      if (place) {
        if (parsed.data.placeAction === "unpublish") place.publishedAt = null
        else if (parsed.data.placeAction === "close") place.status = "closed"
        db.placeModerationState[place.id] = {
          status: parsed.data.placeAction !== "none" ? parsed.data.placeAction : "report_reviewed",
          note: parsed.data.moderationNote ?? null,
          moderatedAt: now,
        }
      }
      appendMockAuditLog("report.resolve", "place_report", report.id, {
        placeId: report.placeId,
        placeName: place?.name ?? report.placeId,
        nextStatus: parsed.data.status,
        placeAction: parsed.data.placeAction,
      })
      return toMockAdminReport(report)
    },
  },
  {
    method: "get",
    pattern: /^\/admin\/places$/,
    handler: (config) => {
      requireMockRole(config, ["admin", "moderator"])
      const { q, visibility = "all", district, cursor } = query(config)
      const needle = typeof q === "string" ? normalizeText(q.trim()) : ""
      const filtered = db.places
        .filter((p) => {
          if (visibility === "published" && (p.publishedAt === null || p.status === "closed"))
            return false
          if (visibility === "unpublished" && p.publishedAt !== null) return false
          if (visibility === "closed" && p.status !== "closed") return false
          if (district && district !== "all" && p.district !== district) return false
          if (
            needle &&
            !normalizeText(`${p.name} ${p.address} ${p.district ?? ""}`).includes(needle)
          ) {
            return false
          }
          return true
        })
        .map(toMockAdminPlace)
      return paginate(filtered, cursor ?? null, 20)
    },
  },
  {
    method: "patch",
    pattern: /^\/admin\/places\/([^/]+)$/,
    handler: (config, [placeId]) => {
      requireMockRole(config, ["admin", "moderator"])
      const place = findPlace(placeId)
      if (!place) notFound(config, "Không tìm thấy địa điểm")
      const parsed = updateAdminPlaceInputSchema.safeParse(parseBody(config))
      if (!parsed.success)
        badRequest(config, parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ")
      const now = new Date().toISOString()
      const input = parsed.data
      if (input.published !== undefined)
        place.publishedAt = input.published ? (place.publishedAt ?? now) : null
      if (input.status !== undefined) place.status = input.status
      if (input.name !== undefined) place.name = input.name
      if (input.address !== undefined) place.address = input.address
      if (input.district !== undefined) place.district = input.district ?? undefined
      if (input.category !== undefined) place.category = input.category
      if (input.priceLevel !== undefined) place.priceLevel = input.priceLevel
      if (input.lat !== undefined) place.lat = input.lat ?? undefined
      if (input.lng !== undefined) place.lng = input.lng ?? undefined
      db.placeModerationState[place.id] = {
        status: "edited",
        note: input.moderationNote ?? null,
        moderatedAt: now,
      }
      appendMockAuditLog("place.update", "place", place.id, { name: place.name })
      return toMockAdminPlace(place)
    },
  },
  {
    method: "get",
    pattern: /^\/admin\/users$/,
    handler: (config) => {
      requireMockRole(config, ["admin"])
      const { q, role = "all", status = "all", cursor } = query(config)
      const needle = typeof q === "string" ? q.trim().toLowerCase() : ""
      const items = Object.keys(db.users)
        .filter((id) => !db.deletedUserIds.has(id))
        .map(toMockAdminUser)
        .filter((u) => {
          if (role !== "all" && u.role !== role) return false
          if (status === "active" && u.bannedAt !== null) return false
          if (status === "banned" && u.bannedAt === null) return false
          if (
            needle &&
            !u.name.toLowerCase().includes(needle) &&
            !u.handle.toLowerCase().includes(needle) &&
            !u.email.toLowerCase().includes(needle)
          ) {
            return false
          }
          return true
        })
      return paginate(items, cursor ?? null, 20)
    },
  },
  {
    method: "patch",
    pattern: /^\/admin\/users\/([^/]+)$/,
    handler: (config, [targetId]) => {
      requireMockRole(config, ["admin"])
      if (!db.users[targetId] || db.deletedUserIds.has(targetId)) {
        notFound(config, "Không tìm thấy người dùng")
      }
      const parsed = updateAdminUserInputSchema.safeParse(parseBody(config))
      if (!parsed.success)
        badRequest(config, parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ")
      if (targetId === db.me.id && parsed.data.banned === true) {
        badRequest(config, "Không thể tự khoá tài khoản của chính mình")
      }
      if (targetId === db.me.id && parsed.data.role && parsed.data.role !== "admin") {
        badRequest(config, "Không thể tự hạ quyền của chính mình")
      }
      const current = toMockAdminUser(targetId)
      const nextRole = parsed.data.role ?? current.role
      const nextBannedAt =
        parsed.data.banned === true
          ? (current.bannedAt ?? new Date().toISOString())
          : parsed.data.banned === false
            ? null
            : current.bannedAt
      const nextBanReason =
        parsed.data.banned === false
          ? null
          : parsed.data.banReason !== undefined
            ? parsed.data.banReason
            : current.banReason
      db.userAdminState[targetId] = {
        role: nextRole,
        bannedAt: nextBannedAt,
        banReason: nextBanReason,
      }
      appendMockAuditLog(
        parsed.data.banned !== undefined
          ? parsed.data.banned
            ? "user.ban"
            : "user.unban"
          : "user.role_change",
        "user",
        targetId,
        { handle: current.handle, roleFrom: current.role, roleTo: nextRole },
      )
      return toMockAdminUser(targetId)
    },
  },
  {
    method: "get",
    pattern: /^\/admin\/audit-logs$/,
    handler: (config) => {
      requireMockRole(config, ["admin", "moderator"])
      const { entity = "all", action = "all", q, cursor } = query(config)
      const needle = typeof q === "string" ? q.trim().toLowerCase() : ""
      const items = db.auditLogs.filter((entry) => {
        if (entity !== "all" && entry.entity !== entity) return false
        if (action !== "all" && entry.action !== action) return false
        if (
          needle &&
          !entry.action.toLowerCase().includes(needle) &&
          !(entry.entityId ?? "").toLowerCase().includes(needle) &&
          !(entry.actor?.handle ?? "").toLowerCase().includes(needle)
        ) {
          return false
        }
        return true
      })
      return paginate(items, cursor ?? null, 20)
    },
  },
]

/**
 * Bộ đếm request của mock cho trang `/system` (demo vận hành). Đây là số liệu
 * CỦA PHIÊN mock — không phải số liệu backend thật; trang ghi rõ điều đó.
 */
const mockMetrics = {
  startedAt: Date.now(),
  routes: new Map<string, number>(),
}

function recordMockMetric(method: string, path: string): void {
  const key = `${method.toUpperCase()} ${path}`
  mockMetrics.routes.set(key, (mockMetrics.routes.get(key) ?? 0) + 1)
}

export const mockAdapter: AxiosAdapter = async (config) => {
  // Delay gồm cả kịch bản `slow` — giữ nguyên cơ chế cancel signal của `wait`.
  await wait(RESPONSE_DELAY_MS + scenario.delayMs, config)

  const method = (config.method ?? "get").toLowerCase()
  const path = (config.url ?? "").split("?")[0].replace(/\/$/, "") || "/"
  recordMockMetric(method, path)

  // Kịch bản `offline`: mọi method đều lỗi mạng (status 0, không response).
  if (scenario.offline) networkError(config, "Không có kết nối mạng (kịch bản offline)")

  // `media-unavailable`: giả lập backend chưa cấu hình R2 → composer ẩn nút upload.
  if (scenario.mediaUnavailable && method === "post" && path === "/media") {
    serviceUnavailable(config, "Tính năng upload ảnh chưa được cấu hình")
  }

  // Các kịch bản còn lại chỉ áp dụng cho GET — mutation vẫn hoạt động bình thường.
  if (method === "get") {
    if (scenario.serverError) serverError(config, "Lỗi máy chủ (kịch bản server-error)")
    if (scenario.unauthorized && path === "/me") unauthorized(config, "Chưa đăng nhập")
    if (scenario.emptyLists && LIST_ROUTES.some((pattern) => pattern.test(path))) {
      return ok(config, { items: [], next: null })
    }
  }

  for (const route of routes) {
    if (route.method !== method) continue
    const match = route.pattern.exec(path)
    if (!match) continue
    const data = route.handler(config, match.slice(1))
    return route.status === 201 ? created(config, data) : ok(config, data)
  }

  notFound(config, `Không có route ${method.toUpperCase()} ${path}`)
}
