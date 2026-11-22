import { AxiosError, AxiosHeaders, CanceledError } from "axios"
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios"
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
import {
  parseNaturalFilterQuery,
  type AdminPlace,
  type AdminReport,
  type AdminUser,
  type AuditLogEntry,
  type UserRole,
} from "@rendez/schema"
import { MOCK_NOTIFICATIONS } from "../fixtures/notifications"
import { MOCK_PLACES, type MockPlace } from "../fixtures/cold-start-places"
import { MOCK_POSTS } from "../fixtures/posts"
import { MOCK_COMMENTS } from "../fixtures/comments"
import { MOCK_REVIEWS } from "../fixtures/reviews"
import { MOCK_COLLECTIONS } from "../fixtures/collections"
import { CURRENT_USER, ME, MOCK_USERS } from "../fixtures/users"
import { rankPlaceSuggestions } from "../ranking"
import { resolveScenario } from "../scenarios"
import { normalizeText } from "../text"
import { env } from "@/lib/env"
import {
  IMAGE_CONTENT_TYPES,
  MAX_CAPTION_LENGTH,
  MAX_COLLECTION_DESCRIPTION_LENGTH,
  MAX_COLLECTION_NAME_LENGTH,
  MAX_PROFILE_BIO_LENGTH,
  MAX_PROFILE_LOCATION_LENGTH,
  MAX_PROFILE_NAME_LENGTH,
  MAX_REPORT_DETAIL_LENGTH,
  MAX_REVIEW_CONTENT_LENGTH,
  MIN_CAPTION_LENGTH,
  POST_IMAGE_INVALID_MESSAGE,
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
} from "../types"

export const PLACES_PAGE_SIZE = 9

export const DAILY_PICK_REASONS = ["Gợi ý của ngày", "Quán mới", "Nhiều đánh giá"]
export const POSTS_PAGE_SIZE = 5
export const NOTIFICATIONS_PAGE_SIZE = 20

export const MOCK_EMAIL = "me@rendez.test"
export const MOCK_PASSWORD = "password123"

export interface MockAccount {
  userId: string
  email: string
  password: string
  verified: boolean
}

export const VALID_REPORT_REASONS: ReadonlySet<string> = new Set(PLACE_REPORT_REASONS)

export const MOCK_IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
}

export const MOCK_STORAGE_HOST = "mock-r2.test"

export function patchFetchForMockStorage(): void {
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

export const db = {
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

export const seedPlace = db.places[0]
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
export function recomputePlaceTierStats(place: MockPlace) {
  const revs = db.reviews.filter((r) => r.placeId === place.id)
  place.reviewCount = revs.length
  const pos = revs.filter((r) => r.tier === "good" || r.tier === "must_try").length
  place.positiveRatio = revs.length > 0 ? Math.round((100 * pos) / revs.length) : 0
  place.mustTryCount = revs.filter((r) => r.tier === "must_try").length
}
for (const place of db.places) {
  recomputePlaceTierStats(place)
}

export const mockPlaceMedia = new Map<
  string,
  Array<{
    id: string
    url: string
    kind: "venue" | "dish_real" | "menu_price"
    capturedAt: string
    sourceType: "place" | "post"
    authorName?: string
  }>
>()
export const mockRoomVoting = new Map<
  string,
  {
    phase: "filtering" | "voting" | "locked"
    votingMode: "swipe_match" | "ranked_choice" | "random_wheel"
    winnerPlaceId: string | null
    candidates: Array<{
      id: string
      placeId: string
      addedByMemberId: string
      place: Place
      createdAt: string
    }>
    votes: Array<{
      candidateId: string
      memberId: string
      decision?: "like" | "pass"
      rank?: number
    }>
  }
>()

export function getRoomVotingState(code: string) {
  let st = mockRoomVoting.get(code)
  if (!st) {
    st = {
      phase: "filtering",
      votingMode: "swipe_match",
      winnerPlaceId: null,
      candidates: [],
      votes: [],
    }
    mockRoomVoting.set(code, st)
  }
  return st
}

export const notifiedPostIds = new Set<string>()

export let postSeq = 0
export let notificationSeq = 0
export let commentSeq = 0
export let reviewSeq = 0
export let collectionSeq = 0
export let reportSeq = 0
export let userSeq = 0
export let roomSeq = 0
export let roomMemberSeq = 0
export let roomProposalSeq = 0
export let auditLogSeq = 1

export function requireMockRole(config: InternalAxiosRequestConfig, roles: UserRole[]): UserRole {
  if (!db.authenticated) unauthorized(config, "Chưa đăng nhập")
  const role: UserRole = db.userAdminState[db.me.id]?.role ?? db.me.role ?? "user"
  if (!roles.includes(role)) forbidden(config, "Bạn không có quyền truy cập khu vực này")
  return role
}

export function appendMockAuditLog(
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

export function toMockAdminReport(report: MockReport): AdminReport {
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

export function toMockAdminPlace(place: MockPlace): AdminPlace {
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

export function toMockAdminUser(userId: string): AdminUser {
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

export function toPlaceDto(place: MockPlace): Place {
  return {
    id: place.id,
    name: place.name,
    address: place.address,
    city: place.city,
    district: place.district,
    category: place.category,
    tags: place.tags,
    positiveRatio: place.positiveRatio,
    mustTryCount: place.mustTryCount ?? 0,
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

export function findPlace(placeId: string): MockPlace | undefined {
  return db.places.find((place) => place.id === placeId)
}

export function toPlaceSummary(place: MockPlace) {
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

export function toPostDto(post: MockPost): Post {
  const place = post.placeId === null ? undefined : findPlace(post.placeId)
  return { ...post, place: place ? toPlaceSummary(place) : null }
}

export function toNotificationDto(notification: AppNotification): AppNotification {
  if (notification.kind !== "place-suggestion") return { ...notification }
  const post = db.posts.find((item) => item.id === notification.postId)
  return { ...notification, postPlaceId: post?.placeId ?? null }
}

// ---------------------------------------------------------------------------
// Nghiệp vụ phía server
// ---------------------------------------------------------------------------

export function sortPublishedPlaces(
  items: Place[],
  sort?: string,
  lat?: string,
  lng?: string,
): Place[] {
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
      if (aHas && a.positiveRatio !== b.positiveRatio) return b.positiveRatio - a.positiveRatio
      return 0
    })
  }
  return items
}

export function paginate<T>(items: T[], cursor: string | null, pageSize: number): Page<T> {
  const parsed = cursor === null ? 0 : Number.parseInt(cursor, 10)
  const offset = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
  const slice = items.slice(offset, offset + pageSize)
  const nextOffset = offset + slice.length
  return { items: slice, next: nextOffset < items.length ? String(nextOffset) : null }
}

export function isPubliclyVisible(place: MockPlace): boolean {
  return place.publishedAt !== null && place.status !== "closed"
}

export interface Bbox {
  minLng: number
  minLat: number
  maxLng: number
  maxLat: number
}

export function matchesBbox(place: MockPlace, bbox?: Bbox): boolean {
  if (!bbox) return true
  if (place.lat === undefined || place.lng === undefined) return false
  return !(
    place.lng < bbox.minLng ||
    place.lng > bbox.maxLng ||
    place.lat < bbox.minLat ||
    place.lat > bbox.maxLat
  )
}

export function matchesKeywords(
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

export function filterMockPlacesCore(
  published: MockPlace[],
  params: {
    categories: PlaceCategory[]
    districts: string[]
    priceMax?: number
    excludedCategories: Set<PlaceCategory>
    excludedDistricts: Set<string>
    includeKeywords: string[]
    excludeKeywords: string[]
    query: string
    bbox?: { minLng: number; minLat: number; maxLng: number; maxLat: number }
  },
): Place[] {
  return published
    .filter((place) => {
      if (!matchesBbox(place, params.bbox)) return false
      if (params.categories.length > 0 && !params.categories.includes(place.category)) {
        return false
      }
      if (params.districts.length > 0 && !params.districts.includes(place.district ?? "")) {
        return false
      }
      if (params.priceMax !== undefined && place.priceLevel > params.priceMax) return false
      if (params.excludedCategories.has(place.category)) return false
      if (place.district && params.excludedDistricts.has(place.district)) return false
      const haystack = normalizeText(
        [place.name, place.address, place.city, place.district ?? "", ...place.tags].join(" "),
      )
      return matchesKeywords(haystack, params.includeKeywords, params.excludeKeywords, params.query)
    })
    .map(toPlaceDto)
}

export function listPublishedPlaces(params: {
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
  const rawQuery = (params.q ?? "").trim()
  const query = normalizeText(rawQuery)
  // `category`/`district` nhận một giá trị (discover) hoặc danh sách phân tách
  // dấu phẩy (phòng lọc nhóm có thể chọn nhiều) - "all" nghĩa là không ràng buộc.
  const categories = (params.category ?? "")
    .split(",")
    .filter((value) => value && value !== "all") as PlaceCategory[]
  const districts = (params.district ?? "").split(",").filter((value) => value && value !== "all")
  const priceMaxRaw = Number(params.priceMax)
  // Chỉ nhận 1-3; giá trị lạ (NaN, 0, 9...) coi như không lọc thay vì lọc sai.
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

  if (rawQuery) {
    const exactMatch = published.some((p) => normalizeText(p.name) === query)
    const parsed = parseNaturalFilterQuery(rawQuery)
    const hasPromoted =
      !exactMatch &&
      ((categories.length === 0 && parsed.categories.length > 0) ||
        (districts.length === 0 && parsed.districts.length > 0) ||
        (priceMax === undefined && parsed.priceMax !== undefined) ||
        parsed.excludeCategories.length > 0 ||
        parsed.excludeDistricts.length > 0 ||
        parsed.excludeKeywords.length > 0)

    if (hasPromoted) {
      const promoted = filterMockPlacesCore(published, {
        categories: categories.length > 0 ? categories : parsed.categories,
        districts: districts.length > 0 ? districts : parsed.districts,
        priceMax: priceMax !== undefined ? priceMax : parsed.priceMax,
        excludedCategories: new Set([...excludedCategories, ...parsed.excludeCategories]),
        excludedDistricts: new Set([...excludedDistricts, ...parsed.excludeDistricts]),
        includeKeywords,
        excludeKeywords: [
          ...new Set([...excludeKeywords, ...parsed.excludeKeywords.map(normalizeText)]),
        ],
        query: normalizeText(parsed.residualQuery),
        bbox,
      })
      if (promoted.length > 0) return promoted
    }
  }

  return filterMockPlacesCore(published, {
    categories,
    districts,
    priceMax,
    excludedCategories,
    excludedDistricts,
    includeKeywords,
    excludeKeywords,
    query,
    bbox,
  })
}

export function suggestPlacesForCaption(caption: string, limit: number): PlaceSuggestion[] {
  if (caption.trim().length < 8) return []
  const candidates = db.places.filter(isPubliclyVisible)
  return rankPlaceSuggestions(caption, candidates, limit).map((item) => ({
    place: toPlaceSummary(item.place),
    reason: item.reason,
  }))
}

export function syncPlaceSuggestions(): void {
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

export function attachPlaceToPost(postId: string, placeId: string): Post | undefined {
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

export function createPost(config: InternalAxiosRequestConfig) {
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
export function createMediaTicket(config: InternalAxiosRequestConfig) {
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

export function toCommentDto(comment: MockComment): Comment {
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

export function toReviewDto(review: MockReview): Review {
  return {
    id: review.id,
    placeId: review.placeId,
    author: review.author,
    tier: review.tier,
    recommendedDishes: review.recommendedDishes ?? [],
    quickTags: review.quickTags ?? [],
    authorReviewCount: db.reviews.filter((r) => r.author.id === review.author.id).length,
    isFollowingAuthor: Boolean(
      Object.values(db.users).find((u) => u.id === review.author.id)?.followedByMe,
    ),
    content: review.content,
    createdAt: review.createdAt,
    isMine: review.author.id === CURRENT_USER.id,
  }
}

/** Đánh giá của một địa điểm, mới nhất trước. */
export function listReviews(placeId: string): Review[] {
  return db.reviews
    .filter((review) => review.placeId === placeId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(toReviewDto)
}

export function toCollectionDto(collection: MockCollection): Collection {
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

export function toCollectionSummary(
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
export function listMyCollections(targetPlaceId?: string): CollectionSummary[] {
  return db.collections
    .filter((collection) => collection.owner.id === ME.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((c) => toCollectionSummary(c, targetPlaceId))
}

export function findComment(commentId: string): MockComment | undefined {
  return db.comments.find((comment) => comment.id === commentId)
}

/** Bình luận gốc (không phải trả lời, chưa xoá) — dùng cho phân trang cấp 1. */
export function listTopLevelComments(postId: string): MockComment[] {
  return db.comments.filter(
    (comment) => comment.postId === postId && comment.parentId === null && !comment.deleted,
  )
}

export function sortComments(comments: MockComment[], sort: CommentSort): MockComment[] {
  const sorted = [...comments]
  if (sort === "top") {
    sorted.sort((a, b) => b.likeCount - a.likeCount)
  } else {
    sorted.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  }
  return sorted
}

export function listComments(postId: string, sort: CommentSort): Page<Comment> {
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

export function createComment(
  postId: string,
  body: { body?: string; parentId?: string | null },
): Comment {
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
export function createPlaceReport(
  config: InternalAxiosRequestConfig,
  placeId: string,
): PlaceReport {
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

export function createReview(config: InternalAxiosRequestConfig, placeId: string): Review {
  const place = findPlace(placeId)
  if (!place || place.publishedAt === null) notFound(config, "Không tìm thấy địa điểm")

  const body = parseBody<{
    tier?: unknown
    content?: unknown
    recommendedDishes?: unknown
    quickTags?: unknown
  }>(config)
  const tier =
    body.tier === "ok" || body.tier === "good" || body.tier === "must_try" ? body.tier : null
  if (!tier) badRequest(config, "Mức đánh giá không hợp lệ")
  const content = typeof body.content === "string" ? body.content.trim() : ""
  if (content.length > MAX_REVIEW_CONTENT_LENGTH) {
    badRequest(config, `Nội dung đánh giá tối đa ${MAX_REVIEW_CONTENT_LENGTH} ký tự`)
  }
  const recommendedDishes = Array.isArray(body.recommendedDishes)
    ? body.recommendedDishes
        .filter((d): d is string => typeof d === "string" && d.trim().length > 0)
        .slice(0, 3)
    : []
  const quickTags = Array.isArray(body.quickTags)
    ? body.quickTags
        .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
        .slice(0, 3)
    : []

  const existing = db.reviews.find(
    (review) => review.placeId === placeId && review.author.id === CURRENT_USER.id,
  )
  if (existing) {
    existing.tier = tier!
    existing.content = content
    existing.recommendedDishes = recommendedDishes
    existing.quickTags = quickTags
    existing.createdAt = new Date().toISOString()
    recomputePlaceTierStats(place)
    return toReviewDto(existing)
  }

  reviewSeq += 1
  const review: MockReview = {
    id: `r-new-${reviewSeq}`,
    placeId,
    author: CURRENT_USER,
    tier,
    recommendedDishes,
    quickTags,
    content,
    createdAt: new Date().toISOString(),
  }
  db.reviews.push(review)
  recomputePlaceTierStats(place)
  return toReviewDto(review)
}

export function deleteReview(config: InternalAxiosRequestConfig, placeId: string): void {
  const place = findPlace(placeId)
  if (!place || place.publishedAt === null) notFound(config, "Không tìm thấy địa điểm")

  const idx = db.reviews.findIndex(
    (review) => review.placeId === placeId && review.author.id === CURRENT_USER.id,
  )
  if (idx === -1) notFound(config, "Không tìm thấy đánh giá")

  db.reviews.splice(idx, 1)
  recomputePlaceTierStats(place)
}

/**
 * Tạo bộ sưu tập rỗng cho người dùng hiện tại.
 *
 * Tên bắt buộc, mô tả tuỳ chọn. `isPrivate` mặc định công khai nếu không truyền.
 */
export function createCollection(config: InternalAxiosRequestConfig): Collection {
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
export function updateCollection(
  config: InternalAxiosRequestConfig,
  collectionId: string,
): Collection {
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
export function setCollectionLike(
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
export function listUserCollections(handle: string): CollectionSummary[] {
  const user = findUserByHandle(handle)
  if (!user) throw new Error("Không tìm thấy người dùng")

  return db.collections
    .filter((collection) => collection.owner.id === user.id)
    .filter((collection) => !collection.isPrivate || user.id === ME.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((collection) => toCollectionSummary(collection))
}

/** Chỉ chủ sở hữu được xoá bộ sưu tập. */
export function deleteCollection(
  config: InternalAxiosRequestConfig,
  collectionId: string,
): boolean {
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
export function setCollectionPlaces(
  config: InternalAxiosRequestConfig,
  collectionId: string,
): Collection {
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

export function setCommentLike(commentId: string, liked: boolean): Comment {
  const comment = findComment(commentId)
  if (!comment || comment.deleted) notFoundComment()
  if (liked !== comment.likedByMe) {
    comment.likedByMe = liked
    comment.likeCount += liked ? 1 : -1
  }
  return toCommentDto(comment)
}

export function deleteCommentSoft(commentId: string): void {
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

export function notFoundComment(): never {
  throw new Error("Không tìm thấy bình luận")
}

// ---------------------------------------------------------------------------
// Hồ sơ người dùng — nghiệp vụ phía server
// ---------------------------------------------------------------------------

export function findUserByHandle(handle: string) {
  return Object.values(db.users).find((user) => user.handle === handle)
}

export function listProfilePosts(handle: string, tab: string): Post[] {
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

export function setFollow(handle: string, followed: boolean) {
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

export const RESPONSE_DELAY_MS = 320

/**
 * Kịch bản lỗi đọc MỘT LẦN lúc khởi tạo module (`VITE_MOCK_SCENARIO`).
 * Đổi giá trị cần restart dev server — đủ dùng cho việc thử UI, và tránh phải
 * đọc biến môi trường trên mỗi request.
 */
export const scenario = resolveScenario(env.mockScenario)

// Cho phép E2E / dev test ghi đè kịch bản động trên window mà không cần restart server
if (typeof window !== "undefined") {
  ;(window as unknown as { __setMockScenario?: (name: string) => void }).__setMockScenario = (
    name: string,
  ) => {
    Object.assign(scenario, resolveScenario(name))
  }
}

/** Route GET trả danh sách — dùng để áp kịch bản `empty`. */
export const LIST_ROUTES: readonly RegExp[] = [
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

export function wait(ms: number, config: InternalAxiosRequestConfig): Promise<void> {
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

export function ok<T>(config: InternalAxiosRequestConfig, data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: new AxiosHeaders({ "content-type": "application/json" }),
    config,
  }
}

/** 201 cho `POST /register` — giữ đúng mã trạng thái của backend thật. */
export function created<T>(config: InternalAxiosRequestConfig, data: T): AxiosResponse<T> {
  return { ...ok(config, data), status: 201, statusText: "Created" }
}

export function notFound(config: InternalAxiosRequestConfig, message: string): never {
  throw new AxiosError(message, "ERR_BAD_REQUEST", config, undefined, {
    data: { detail: message },
    status: 404,
    statusText: "Not Found",
    headers: new AxiosHeaders({ "content-type": "application/json" }),
    config,
  })
}

export function badRequest(config: InternalAxiosRequestConfig, message: string): never {
  throw new AxiosError(message, "ERR_BAD_REQUEST", config, undefined, {
    data: { detail: message },
    status: 400,
    statusText: "Bad Request",
    headers: new AxiosHeaders({ "content-type": "application/json" }),
    config,
  })
}

export function forbidden(config: InternalAxiosRequestConfig, message: string): never {
  throw new AxiosError(message, "ERR_FORBIDDEN", config, undefined, {
    data: { detail: message },
    status: 403,
    statusText: "Forbidden",
    headers: new AxiosHeaders({ "content-type": "application/json" }),
    config,
  })
}

/** 409 — trùng email/handle khi đăng ký (khớp backend thật). */
export function conflict(config: InternalAxiosRequestConfig, message: string): never {
  throw new AxiosError(message, "ERR_BAD_REQUEST", config, undefined, {
    data: { detail: message },
    status: 409,
    statusText: "Conflict",
    headers: new AxiosHeaders({ "content-type": "application/json" }),
    config,
  })
}

export function unauthorized(config: InternalAxiosRequestConfig, message: string): never {
  throw new AxiosError(message, "ERR_BAD_REQUEST", config, undefined, {
    data: { detail: message },
    status: 401,
    statusText: "Unauthorized",
    headers: new AxiosHeaders({ "content-type": "application/json" }),
    config,
  })
}

/** Lỗi máy chủ 500 — dùng cho kịch bản `server-error`. */
export function serverError(config: InternalAxiosRequestConfig, message: string): never {
  throw new AxiosError(message, "ERR_BAD_RESPONSE", config, undefined, {
    data: { detail: message },
    status: 500,
    statusText: "Internal Server Error",
    headers: new AxiosHeaders({ "content-type": "application/json" }),
    config,
  })
}

/** Lỗi mạng (status 0, không response) — dùng cho kịch bản `offline`. */
export function networkError(config: InternalAxiosRequestConfig, message: string): never {
  throw new AxiosError(message, AxiosError.ERR_NETWORK, config)
}

/** 503 — tính năng chưa được cấu hình phía server (kịch bản `media-unavailable`). */
export function serviceUnavailable(config: InternalAxiosRequestConfig, message: string): never {
  throw new AxiosError(message, "ERR_BAD_RESPONSE", config, undefined, {
    data: { detail: message },
    status: 503,
    statusText: "Service Unavailable",
    headers: new AxiosHeaders({ "content-type": "application/json" }),
    config,
  })
}

export function parseBody<T>(config: InternalAxiosRequestConfig): T {
  const raw: unknown = config.data
  if (typeof raw !== "string" || raw.length === 0) return {} as T
  return JSON.parse(raw) as T
}

export function query(config: InternalAxiosRequestConfig): Record<string, string> {
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
export function normalizeProfileImageUrl(
  value: unknown,
  config: InternalAxiosRequestConfig,
): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value === "string" && value.length > 0) return value
  badRequest(config, "URL ảnh không hợp lệ")
}

export function updateMe(config: InternalAxiosRequestConfig): typeof db.me {
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
export const ROOM_CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

/** Sinh mã phòng 6 ký tự từ CSPRNG của trình duyệt. */
export function generateRoomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  let code = ""
  for (const byte of bytes) code += ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length]
  return code
}

export function emptyRoomFilter(): RoomFilter {
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
export function toRoomDto(room: MockRoom): Room {
  const tokenMemberId = db.roomTokens[room.code]
  return {
    id: room.id,
    code: room.code,
    name: room.name,
    ...(() => {
      const st = getRoomVotingState(room.code)
      const me = room.members.find((m) => m.userId === CURRENT_USER.id)
      const votedIds = new Set<string>()
      const voteSummaries = st.candidates.map((c) => {
        const cv = st.votes.filter((v) => v.candidateId === c.id)
        let likeCount = 0
        let passCount = 0
        let myDecision: "like" | "pass" | undefined
        let myRank: number | undefined
        for (const v of cv) {
          votedIds.add(v.memberId)
          if (v.decision === "like") likeCount++
          if (v.decision === "pass") passCount++
          if (me && v.memberId === me.id) {
            myDecision = v.decision
            myRank = v.rank
          }
        }
        return {
          candidateId: c.id,
          likeCount,
          passCount,
          ...(myDecision ? { myDecision } : {}),
          ...(myRank ? { myRank } : {}),
        }
      })
      return {
        phase: st.phase,
        votingMode: st.votingMode,
        votingDeadlineAt: null,
        winnerPlaceId: st.winnerPlaceId,
        lockedAt: st.phase === "locked" ? new Date().toISOString() : null,
        candidates: st.candidates,
        voteSummaries,
        votingProgress: {
          votedMemberIds: [...votedIds],
          totalActiveMembers: room.members.length,
          matchedCandidateIds: voteSummaries
            .filter((vs) => vs.likeCount >= room.members.length && room.members.length > 0)
            .map((vs) => vs.candidateId),
        },
      }
    })(),
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
      ...(room.filter.priceMax ? { priceMax: room.filter.priceMax } : {}),
    },
    createdAt: room.createdAt,
  }
}

/**
 * Actor của một mutation phòng: phiên đăng nhập (chủ phòng) trước, "cookie"
 * guest sau — khớp thứ tự resolve của backend (`resolveRoomActor`).
 */
export function resolveMockRoomActor(
  config: InternalAxiosRequestConfig,
  room: MockRoom,
): MockRoomMember {
  if (db.authenticated) {
    const owner = room.members.find((member) => member.userId === CURRENT_USER.id)
    if (owner) return owner
  }
  const member = room.members.find((item) => item.id === db.roomTokens[room.code])
  if (member) return member
  forbidden(config, "Bạn không ở trong phòng này")
}

/** Chuỗi mô tả đề xuất — khớp `describeProposal` của backend (giá trị lạ → "—"). */
export function describeMockProposal(proposal: RoomProposal): string {
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
export function applyMockProposalToFilter(
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

export function removeMockFilterConstraint(
  filter: RoomFilter,
  target: { kind: "include" | "exclude"; field: RoomProposal["field"]; value: string },
): RoomFilter {
  const value = target.value.trim()
  if (target.field === "category") {
    const category = value as PlaceCategory
    return target.kind === "include"
      ? { ...filter, categories: filter.categories.filter((c) => c !== category) }
      : { ...filter, excludedCategories: filter.excludedCategories.filter((c) => c !== category) }
  }
  if (target.field === "district") {
    return target.kind === "include"
      ? { ...filter, districts: filter.districts.filter((d) => d !== value) }
      : { ...filter, excludedDistricts: filter.excludedDistricts.filter((d) => d !== value) }
  }
  if (target.field === "priceMax") {
    const next = { ...filter }
    delete next.priceMax
    return next
  }
  return target.kind === "include"
    ? { ...filter, includeKeywords: filter.includeKeywords.filter((k) => k !== value) }
    : { ...filter, excludeKeywords: filter.excludeKeywords.filter((k) => k !== value) }
}

export function hasMockFilterConstraint(
  filter: RoomFilter,
  target: { kind: "include" | "exclude"; field: RoomProposal["field"]; value: string },
): boolean {
  const value = target.value.trim()
  if (target.field === "category") {
    const category = value as PlaceCategory
    return target.kind === "include"
      ? filter.categories.includes(category)
      : filter.excludedCategories.includes(category)
  }
  if (target.field === "district") {
    return target.kind === "include"
      ? filter.districts.includes(value)
      : filter.excludedDistricts.includes(value)
  }
  if (target.field === "priceMax") {
    return filter.priceMax !== undefined && String(filter.priceMax) === value
  }
  return target.kind === "include"
    ? filter.includeKeywords.includes(value)
    : filter.excludeKeywords.includes(value)
}

export function toggleMockFilterConstraint(
  filter: RoomFilter,
  target: { kind: "include" | "exclude"; field: RoomProposal["field"]; value: string },
): RoomFilter {
  return hasMockFilterConstraint(filter, target)
    ? removeMockFilterConstraint(filter, target)
    : applyMockProposalToFilter(filter, target)
}

export const VALID_ROOM_CATEGORIES: ReadonlySet<PlaceCategory> = new Set([
  "cafe",
  "restaurant",
  "street-food",
  "bakery",
  "dessert",
  "bar",
])

/** Chuẩn hoá giá trị đề xuất theo field — `null` = không hợp lệ (400). */
export function normalizeMockProposalValue(
  field: RoomProposal["field"],
  value: string,
): string | null {
  if (field === "category") {
    // Dạng Prisma (`street_food`) được chuẩn hoá về dạng API (`street-food`).
    const normalized = value.trim().replace(/_/gu, "-")
    return VALID_ROOM_CATEGORIES.has(normalized as PlaceCategory) ? normalized : null
  }
  if (field === "priceMax") return value === "1" || value === "2" || value === "3" ? value : null
  return value
}

export type Handler = (config: InternalAxiosRequestConfig, params: string[]) => unknown
export interface Route {
  method: string
  pattern: RegExp
  handler: Handler
  /** Mã trạng thái trả về — mặc định 200 (201 dùng `created`). */
  status?: 201
}

/**
 * Bộ đếm request của mock cho trang `/system` (demo vận hành). Đây là số liệu
 * CỦA PHIÊN mock — không phải số liệu backend thật; trang ghi rõ điều đó.
 */
export const mockMetrics = {
  startedAt: Date.now(),
  routes: new Map<string, number>(),
}

export function recordMockMetric(method: string, path: string): void {
  const key = `${method.toUpperCase()} ${path}`
  mockMetrics.routes.set(key, (mockMetrics.routes.get(key) ?? 0) + 1)
}

export const nextRoomId = () => `room-${++roomSeq}`
export const nextRoomMemberId = () => `room-member-${++roomMemberSeq}`
export const nextRoomProposalId = () => `room-proposal-${++roomProposalSeq}`
export const nextUserId = () => `u-${++userSeq}`
