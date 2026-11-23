import type { InternalAxiosRequestConfig } from "axios"
import type { PlaceReport, PlaceReportReason } from "@/features/places/types/place-report"
import type { Review } from "@/features/places/types/review"
import type { Collection, CollectionSummary } from "@/features/collections/types/collection"
import type { Post } from "@/features/social/types/post"
import type { Comment, CommentSort } from "@/features/social/types/comment"
import type { Page } from "@/types/api"
import { CURRENT_USER, ME } from "../fixtures/users"
import {
  IMAGE_CONTENT_TYPES,
  MAX_CAPTION_LENGTH,
  MAX_COLLECTION_DESCRIPTION_LENGTH,
  MAX_COLLECTION_NAME_LENGTH,
  MAX_REPORT_DETAIL_LENGTH,
  MAX_REVIEW_CONTENT_LENGTH,
  MIN_CAPTION_LENGTH,
  POST_IMAGE_INVALID_MESSAGE,
  validatePostImageUrls,
} from "@rendez/schema"
import type { MockCollection, MockComment, MockPost, MockReport, MockReview } from "../types"
import {
  VALID_REPORT_REASONS,
  MOCK_IMAGE_EXTENSIONS,
  MOCK_STORAGE_HOST,
  db,
  recomputePlaceTierStats,
  nextPostSeq,
  nextCommentSeq,
  nextReviewSeq,
  nextCollectionSeq,
  nextReportSeq,
  findPlace,
  toPostDto,
} from "./db-core"
import { notFound, badRequest, forbidden, parseBody } from "./http-utils"

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

  const post: MockPost = {
    id: `post-new-${nextPostSeq()}`,
    author: CURRENT_USER,
    caption,
    pinnedAt: null,
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

  const comment: MockComment = {
    id: `c-new-${nextCommentSeq()}`,
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

  const report: MockReport = {
    id: `report-new-${nextReportSeq()}`,
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

  const review: MockReview = {
    id: `r-new-${nextReviewSeq()}`,
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

  const collection: MockCollection = {
    id: `c-new-${nextCollectionSeq()}`,
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
