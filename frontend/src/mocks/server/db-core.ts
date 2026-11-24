import { forbidden, unauthorized } from "./http-utils"
import type { InternalAxiosRequestConfig } from "axios"
import type { AppNotification } from "@/features/notification/types/notification"
import type { Place, PlaceCategory, PlaceSuggestion } from "@/features/places/types/place"
import { PLACE_REPORT_REASONS } from "@/features/places/types/place-report"
import { calculateDistanceKm } from "@/features/places/lib/danang-districts"
import type { Post } from "@/features/social/types/post"
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
import { ME, MOCK_USERS } from "../fixtures/users"
import { rankPlaceSuggestions } from "../ranking"
import { normalizeText } from "../text"
import { env } from "@/lib/env"
import type { MockPost, MockReport, MockRoom } from "../types"

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
    { userId: "u-admin", email: "admin@rendez.test", password: MOCK_PASSWORD, verified: true },
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
  actor: { id: "u-admin", name: "Quản trị Rendez", handle: "rendez_admin", role: "admin" },
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
    role: adminMeta?.role ?? user.role ?? (user.id === "u-admin" ? "admin" : "user"),
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
      if (
        params.priceMax !== undefined &&
        place.priceLevel != null &&
        place.priceLevel > params.priceMax
      )
        return false
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

export const nextPostSeq = () => ++postSeq
export const nextCommentSeq = () => ++commentSeq
export const nextReportSeq = () => ++reportSeq
export const nextReviewSeq = () => ++reviewSeq
export const nextCollectionSeq = () => ++collectionSeq
export const nextRoomId = () => `room-${++roomSeq}`
export const nextRoomMemberId = () => `room-member-${++roomMemberSeq}`
export const nextRoomProposalId = () => `room-proposal-${++roomProposalSeq}`
export const nextUserId = () => `u-${++userSeq}`
