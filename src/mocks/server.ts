import { AxiosError, AxiosHeaders, CanceledError } from "axios"
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from "axios"
import type { AppNotification } from "@/features/notification/types/notification"
import type { Place, PlaceCategory, PlaceSuggestion } from "@/features/places/types/place"
import type { PlaceReport, PlaceReportReason } from "@/features/places/types/place-report"
import { PLACE_REPORT_REASONS } from "@/features/places/types/place-report"
import type { Review } from "@/features/places/types/review"
import type { Collection, CollectionSummary } from "@/features/collections/types/collection"
import type { Post } from "@/features/social/types/post"
import type { Comment, CommentSort } from "@/features/social/types/comment"
import type { Page } from "@/types/api"
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
import { env } from "@/lib/env"
import {
  MAX_CAPTION_LENGTH,
  MAX_COLLECTION_DESCRIPTION_LENGTH,
  MAX_COLLECTION_NAME_LENGTH,
  MAX_PROFILE_BIO_LENGTH,
  MAX_PROFILE_LOCATION_LENGTH,
  MAX_PROFILE_NAME_LENGTH,
  MAX_REPORT_DETAIL_LENGTH,
  MAX_REVIEW_CONTENT_LENGTH,
  MIN_CAPTION_LENGTH,
} from "@/lib/constants"
import type { MockCollection, MockComment, MockPost, MockReport, MockReview } from "./types"

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
const POSTS_PAGE_SIZE = 5
const NOTIFICATIONS_PAGE_SIZE = 20

/** Lý do báo cáo hợp lệ — tra cứu O(1) thay vì so khớp mảng. */
const VALID_REPORT_REASONS: ReadonlySet<string> = new Set(PLACE_REPORT_REASONS)

/** "Database" trong bộ nhớ của server. Reset khi tải lại trang. */
const db = {
  places: MOCK_PLACES.map((place) => ({ ...place })),
  posts: MOCK_POSTS.map((post) => ({ ...post })),
  notifications: MOCK_NOTIFICATIONS.map((notification) => ({ ...notification })),
  comments: MOCK_COMMENTS.map((comment) => ({ ...comment, deleted: false })),
  reviews: MOCK_REVIEWS.map((review) => ({ ...review })),
  collections: MOCK_COLLECTIONS.map((collection) => ({ ...collection })),
  reports: [] as MockReport[],
  users: { ...MOCK_USERS },
  /** Hồ sơ người dùng hiện tại — PATCH /me sửa bản sao này, không đụng fixture. */
  me: { ...ME },
  /**
   * Phiên đăng nhập của mock server. Bật sẵn khi dev bypass auth; `DELETE /session`
   * (đăng xuất) tắt đi, `POST /session` (đăng nhập lại) bật lại. Reset khi tải
   * lại trang — mock là bộ nhớ tạm nên không có "phiên thật" để khôi phục.
   */
  authenticated: env.devBypassAuth,
}

/** Bài đã được server gửi thông báo đề xuất — tránh sinh trùng. */
const notifiedPostIds = new Set<string>()

let postSeq = 0
let notificationSeq = 0
let commentSeq = 0
let reviewSeq = 0
let collectionSeq = 0
let reportSeq = 0

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

function paginate<T>(items: T[], cursor: string | null, pageSize: number): Page<T> {
  const parsed = cursor === null ? 0 : Number.parseInt(cursor, 10)
  const offset = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
  const slice = items.slice(offset, offset + pageSize)
  const nextOffset = offset + slice.length
  return { items: slice, next: nextOffset < items.length ? String(nextOffset) : null }
}

/** Quy tắc hiển thị công khai: đã duyệt và chưa bị xác nhận đóng cửa. */
function isPubliclyVisible(place: MockPlace): boolean {
  return place.publishedAt !== null && place.status !== "closed"
}

function listPublishedPlaces(params: {
  category?: string
  district?: string
  q?: string
  /**
   * Khung nhìn bản đồ `minLng,minLat,maxLng,maxLat` — chỉ trả địa điểm trong khung.
   * Dùng cho `GET /places/map` (bản đồ tự nạp theo vùng đang xem).
   */
  bbox?: string
  /** Mức giá tối đa (1–3) — dùng cho phòng lọc nhóm. */
  priceMax?: string
  /** Danh sách loại hình/quán bị loại, phân tách bằng dấu phẩy. */
  excludeCategory?: string
  excludeDistrict?: string
  /** Từ khoá phải xuất hiện (phân tách bằng dấu phẩy) — khớp name + tags. */
  includeKeyword?: string
  /** Từ khoá bị loại (phân tách bằng dấu phẩy) — khớp name + tags. */
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
  const excludedCategories = (params.excludeCategory ?? "")
    .split(",")
    .filter(Boolean) as PlaceCategory[]
  const excludedDistricts = (params.excludeDistrict ?? "").split(",").filter(Boolean)
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
      if (bbox) {
        if (place.lat === undefined || place.lng === undefined) return false
        if (
          place.lng < bbox.minLng ||
          place.lng > bbox.maxLng ||
          place.lat < bbox.minLat ||
          place.lat > bbox.maxLat
        ) {
          return false
        }
      }
      if (categories.length > 0 && !categories.includes(place.category)) {
        return false
      }
      if (districts.length > 0 && !districts.includes(place.district ?? "")) {
        return false
      }
      if (priceMax !== undefined && place.priceLevel > priceMax) return false
      if (excludedCategories.includes(place.category)) return false
      if (place.district && excludedDistricts.includes(place.district)) return false
      const haystack = normalizeText(
        [place.name, place.address, place.city, place.district ?? "", ...place.tags].join(" "),
      )
      // Nhiều từ khoá include = phải có ĐỦ (AND) — "muốn có hải sản" + "muốn có
      // bình dân" nghĩa là cả hai, không phải một trong hai.
      if (
        includeKeywords.length > 0 &&
        !includeKeywords.every((keyword) => haystack.includes(keyword))
      ) {
        return false
      }
      if (excludeKeywords.some((keyword) => haystack.includes(keyword))) return false
      if (!query) return true
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
  const candidates = db.places.filter(isPubliclyVisible)
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

function createPost(config: InternalAxiosRequestConfig) {
  const body = parseBody<{ caption?: string; placeId?: string | null }>(config)
  const caption = (body.caption ?? "").trim()
  if (caption.length < MIN_CAPTION_LENGTH) {
    badRequest(config, `Nội dung bài đăng cần ít nhất ${MIN_CAPTION_LENGTH} ký tự`)
  }
  if (caption.length > MAX_CAPTION_LENGTH) {
    badRequest(config, `Nội dung bài đăng tối đa ${MAX_CAPTION_LENGTH} ký tự`)
  }

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
    if (!parent || parent.postId !== postId) throw new Error("Không tìm thấy bình luận gốc")
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
  const duplicate = db.reports.find(
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

/** Route GET trả danh sách — dùng để áp kịch bản `empty`. */
const LIST_ROUTES: readonly RegExp[] = [
  /^\/places$/,
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
 * Chỉ nhận đúng 4 trường trong hợp đồng; trường lạ bị bỏ qua để client không
 * thể ghi đè dữ liệu server không cho sửa.
 */
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

  db.me = { ...db.me, name, bio, location, privateProfile }
  db.users[db.me.id] = { ...db.me }
  return { ...db.me }
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
      } = query(config)
      return paginate(
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
        cursor ?? null,
        PLACES_PAGE_SIZE,
      )
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
        if (needle.length > 0 && !normalizeText(post.caption).includes(needle)) return false
        return true
      })
      return paginate(items.map(toPostDto), cursor ?? null, POSTS_PAGE_SIZE)
    },
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
    /**
     * Đăng nhập lại ở dev (không có form đăng nhập thật): bật phiên mock với
     * `db.me`. Có để test luồng đăng xuất → đăng nhập mà không phải tải lại trang.
     */
    method: "post",
    pattern: /^\/session$/,
    handler: (config) => {
      if (scenario.unauthorized) unauthorized(config, "Chưa đăng nhập")
      db.authenticated = true
      return { ...db.me }
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
]

export const mockAdapter: AxiosAdapter = async (config) => {
  // Delay gồm cả kịch bản `slow` — giữ nguyên cơ chế cancel signal của `wait`.
  await wait(RESPONSE_DELAY_MS + scenario.delayMs, config)

  const method = (config.method ?? "get").toLowerCase()
  const path = (config.url ?? "").split("?")[0].replace(/\/$/, "") || "/"

  // Kịch bản `offline`: mọi method đều lỗi mạng (status 0, không response).
  if (scenario.offline) networkError(config, "Không có kết nối mạng (kịch bản offline)")

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
    return ok(config, route.handler(config, match.slice(1)))
  }

  notFound(config, `Không có route ${method.toUpperCase()} ${path}`)
}
