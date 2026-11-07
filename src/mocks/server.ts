import { AxiosError, AxiosHeaders, CanceledError } from "axios"
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from "axios"
import type { AppNotification } from "@/features/notification/types/notification"
import type { Place, PlaceCategory, PlaceSuggestion } from "@/features/places/types/place"
import type { Post } from "@/features/social/types/post"
import type { Comment, CommentSort } from "@/features/social/types/comment"
import type { Page } from "@/types/api"
import { MOCK_NOTIFICATIONS } from "./fixtures/notifications"
import { MOCK_PLACES, type MockPlace } from "./fixtures/places"
import { CURRENT_USER, MOCK_POSTS } from "./fixtures/posts"
import { CURRENT_USER as COMMENT_USER, MOCK_COMMENTS } from "./fixtures/comments"
import { ME, MOCK_USERS } from "./fixtures/users"
import { rankPlaceSuggestions } from "./ranking"
import { normalizeText } from "./text"
import type { MockComment, MockPost } from "./types"

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
  comments: MOCK_COMMENTS.map((comment) => ({ ...comment, deleted: false })),
  users: { ...MOCK_USERS },
}

/** Bài đã được server gửi thông báo đề xuất — tránh sinh trùng. */
const notifiedPostIds = new Set<string>()

let postSeq = 0
let notificationSeq = 0
let commentSeq = 0

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
    parentId: comment.parentId,
    replyTo:
      comment.parentId === null || parentHandle === null
        ? null
        : { commentId: comment.parentId, handle: parentHandle },
  }
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
    if (!parent || parent.postId !== postId) throw new Error("Không tìm thấy bình luận gốc")
    if (parent.parentId !== null) throw new Error("Chỉ hỗ trợ trả lời 1 cấp")
  }

  commentSeq += 1
  const comment: MockComment = {
    id: `c-new-${commentSeq}`,
    postId,
    author: COMMENT_USER,
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

function badRequest(config: InternalAxiosRequestConfig, message: string): never {
  throw new AxiosError(message, "ERR_BAD_REQUEST", config, undefined, {
    data: { detail: message },
    status: 400,
    statusText: "Bad Request",
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
    pattern: /^\/posts\/([^/]+)\/comments$/,
    handler: (config, [postId]) => {
      const { sort = "new" } = query(config)
      const post = db.posts.find((item) => item.id === postId)
      if (!post) notFound(config, "Không tìm thấy bài đăng")
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
    handler: () => ({ ...ME }),
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
