import { prisma } from "./prisma"
import { rankPlaceSuggestions } from "./ranking"
import { createSuggestionNotification } from "./notifications"
import { fetchRankCandidates, normalizeCaption, toSuggestionCandidate } from "./suggestions"

/**
 * Job phát hiện địa điểm cho bài chưa gắn địa điểm (A7.2).
 *
 * Quét post `place_id IS NULL` chưa từng được thông báo, chấm điểm trên place
 * **chưa publish**; có kết quả thì tạo notification `place-suggestion` (tối đa 3
 * gợi ý + lý do) và ghi dấu vào `place_suggestion_notifications`.
 *
 * Idempotence: khoá chính `post_id` của bảng dấu — hai worker chạy song song
 * (cron + trigger sau khi tạo bài) không thể tạo 2 thông báo cho cùng một bài.
 * Ghi dấu TRƯỚC khi tạo notification; nếu tạo notification lỗi thì xoá dấu để
 * lần chạy sau thử lại (không nuốt lỗi).
 */

/** Số gợi ý mỗi thông báo — khớp mock (`rankPlaceSuggestions(..., 3)`). */
const SUGGESTIONS_PER_NOTIFICATION = 3

export async function detectPlaceSuggestions(postId?: string): Promise<number> {
  const posts = await prisma.post.findMany({
    where: {
      placeId: null,
      deletedAt: null,
      ...(postId ? { id: postId } : {}),
      suggestionNotice: { is: null },
    },
    select: { id: true, authorId: true, caption: true },
    orderBy: { createdAt: "asc" },
  })
  if (posts.length === 0) return 0

  const candidates = (await fetchRankCandidates(false)).map(toSuggestionCandidate)
  if (candidates.length === 0) return 0

  let created = 0
  for (const post of posts) {
    const captionNorm = await normalizeCaption(post.caption)
    const ranked = rankPlaceSuggestions(captionNorm, candidates, SUGGESTIONS_PER_NOTIFICATION)
    if (ranked.length === 0) continue

    try {
      // Notification + dấu idempotence trong MỘT transaction: worker khác đã
      // xử lý bài này (trùng khoá `post_id`) thì cả hai đều được hoàn tác.
      await prisma.$transaction(async (tx) => {
        const notificationId = await createSuggestionNotification({
          userId: post.authorId,
          postId: post.id,
          postCaption: post.caption,
          suggestions: ranked.map(({ candidate, reason }) => ({
            place: {
              id: candidate.row.id,
              name: candidate.row.name,
              address: candidate.row.address,
              ...(candidate.row.district ? { district: candidate.row.district } : {}),
              category: candidate.category,
              ...(candidate.row.image_url ? { imageUrl: candidate.row.image_url } : {}),
              isPublished: false,
              ...(candidate.row.lat !== null ? { lat: candidate.row.lat } : {}),
              ...(candidate.row.lng !== null ? { lng: candidate.row.lng } : {}),
            },
            reason,
          })),
          client: tx,
        })
        await tx.placeSuggestionNotification.create({
          data: { postId: post.id, notificationId },
        })
      })
      created += 1
    } catch (error) {
      // Trùng khoá = worker khác đã thông báo bài này — không phải lỗi.
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      ) {
        continue
      }
      throw error
    }
  }

  return created
}
