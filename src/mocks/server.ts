import { AxiosError, AxiosHeaders, CanceledError } from "axios"
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from "axios"
import type { AppNotification } from "@/features/notification/types/notification"
import type { Place, PlaceCategory, PlaceSuggestion } from "@/features/places/types/place"
import type { Post } from "@/features/social/types/post"
import type { Page } from "@/types/api"
import { MOCK_NOTIFICATIONS } from "./fixtures/notifications"
import { MOCK_PLACES, type MockPlace } from "./fixtures/places"
import { CURRENT_USER, MOCK_POSTS } from "./fixtures/posts"
import { rankPlaceSuggestions } from "./ranking"
import { normalizeText } from "./text"
import type { MockPost } from "./types"

/**
 * SERVER GIẢ LẬP — không phải code frontend.
 *
 * Toàn bộ nghiệp vụ (lọc, phân trang, xếp hạng đề xuất, phát hiện địa điểm mới,
 * sinh thông báo, publish địa điểm) nằm trong file này và chạy như một adapter
 * của axios. Frontend chỉ thấy request/response HTTP.
 *
 * Khi backend thật sẵn sàng: xoá `src/mocks/` và bỏ `adapter` trong `src/lib/axios.ts`.
 */

const PLACES_PAGE_SIZE = 9
const NOTIFICATIONS_PAGE_SIZE = 20

/** "Database" trong bộ nhớ của server. Reset khi tải lại trang. */
const db = {
  places: MOCK_PLACES.map((place) => ({ ...place })),
  posts: MOCK_POSTS.map((post) => ({ ...post })),
  notifications: MOCK_NOTIFICATIONS.map((notification) => ({ ...notification })),
}

/** Bài đã được server gửi thông báo đề xuất — tránh sinh trùng. */
const notifiedPostIds = new Set<string>()

let postSeq = 0
let notificationSeq = 0

// ---------------------------------------------------------------------------
// Serialize: chuyển bản ghi nội bộ thành đúng hợp đồng API
// ---------------------------------------------------------------------------

function toPlaceDto(place: MockPlace): Place {
  return {
    id: place.id,
    name: place.name,
    address: place.address,
    city: place.city,
    category: place.category,
    tags: place.tags,
    rating: place.rating,
    reviewCount: place.reviewCount,
    priceLevel: place.priceLevel,
    imageSeed: place.imageSeed,
    imageHeight: place.imageHeight,
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
    category: place.category,
    imageSeed: place.imageSeed,
    isPublished: place.publishedAt !== null,
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

function paginate<T>(items: T[], cursor: string | null, pageSize: number): Page<T> {
  const offset = cursor === null ? 0 : Number(cursor)
  const slice = items.slice(offset, offset + pageSize)
  const nextOffset = offset + slice.length
  return { items: slice, next: nextOffset < items.length ? String(nextOffset) : null }
}

function listPublishedPlaces(params: { category?: string; q?: string }): Place[] {
  const published = db.places.filter((place) => place.publishedAt !== null)
  const query = normalizeText(params.q ?? "")
  const category = params.category

  return published
    .filter((place) => {
      if (category && category !== "all" && place.category !== (category as PlaceCategory)) {
        return false
      }
      if (!query) return true
      const haystack = normalizeText(
        [place.name, place.address, place.city, ...place.tags].join(" "),
      )
      return haystack.includes(query)
    })
    .map(toPlaceDto)
}

/**
 * Gợi ý địa điểm cho nội dung đang soạn.
 *
 * Server chấm điểm + chọn top N rồi trả về. Client chỉ render đúng thứ tự này.
 */
function suggestPlacesForCaption(caption: string, limit: number): PlaceSuggestion[] {
  if (caption.trim().length < 8) return []
  const candidates = db.places.filter((place) => place.publishedAt !== null)
  return rankPlaceSuggestions(caption, candidates, limit).map((item) => ({
    place: toPlaceSummary(item.place),
    reason: item.reason,
  }))
}

/**
 * Job phía server: quét bài chưa gắn địa điểm, tìm địa điểm CHƯA publish khớp
 * nội dung, rồi tạo thông báo "Đề xuất thêm địa điểm".
 *
 * Chạy mỗi lần client tải danh sách thông báo — mô phỏng job nền của backend.
 */
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

function createPost(body: { caption?: string; imageSeed?: string; placeId?: string | null }) {
  postSeq += 1
  const post: MockPost = {
    id: `post-new-${postSeq}`,
    author: CURRENT_USER,
    caption: (body.caption ?? "").trim(),
    imageSeed: body.imageSeed ?? "post-new-01",
    imageHeight: 380,
    createdAt: new Date().toISOString(),
    placeId: body.placeId ?? null,
    likeCount: 0,
    commentCount: 0,
    likedByMe: false,
    savedByMe: false,
  }
  db.posts.unshift(post)
  return toPostDto(post)
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

const RESPONSE_DELAY_MS = 320

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

function notFound(config: InternalAxiosRequestConfig, message: string): never {
  throw new AxiosError(message, "ERR_BAD_REQUEST", config, undefined, {
    data: { detail: message },
    status: 404,
    statusText: "Not Found",
    headers: new AxiosHeaders({ "content-type": "application/json" }),
    config,
  })
}

function parseBody<T>(config: InternalAxiosRequestConfig): T {
  const raw = config.data
  if (typeof raw !== "string" || raw.length === 0) return {} as T
  return JSON.parse(raw) as T
}

function query(config: InternalAxiosRequestConfig): Record<string, string> {
  const params = (config.params ?? {}) as Record<string, unknown>
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) result[key] = String(value)
  }
  return result
}

type Handler = (config: InternalAxiosRequestConfig, params: string[]) => unknown

interface Route {
  method: string
  pattern: RegExp
  handler: Handler
}

const routes: Route[] = [
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
      const { cursor, category, q } = query(config)
      return paginate(listPublishedPlaces({ category, q }), cursor ?? null, PLACES_PAGE_SIZE)
    },
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
    pattern: /^\/posts$/,
    handler: (config) => {
      const { filter = "all" } = query(config)
      const items = db.posts.filter((post) => {
        if (filter === "unplaced") return post.placeId === null
        if (filter === "mine") return post.author.id === CURRENT_USER.id
        return true
      })
      return { items: items.map(toPostDto), next: null } satisfies Page<Post>
    },
  },
  {
    method: "post",
    pattern: /^\/posts$/,
    handler: (config) => createPost(parseBody(config)),
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
]

export const mockAdapter: AxiosAdapter = async (config) => {
  await wait(RESPONSE_DELAY_MS, config)

  const method = (config.method ?? "get").toLowerCase()
  const path = (config.url ?? "").split("?")[0].replace(/\/$/, "") || "/"

  for (const route of routes) {
    if (route.method !== method) continue
    const match = route.pattern.exec(path)
    if (!match) continue
    return ok(config, route.handler(config, match.slice(1)))
  }

  notFound(config, `Không có route ${method.toUpperCase()} ${path}`)
}
