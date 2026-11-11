import { prisma } from "./prisma"
import { isUniqueViolation } from "./errors"
import { rankPlaceSuggestions } from "./ranking"
import { createSuggestionNotification } from "./notifications"
import {
  fetchRankCandidates,
  normalizeCaption,
  toSuggestionCandidate,
  toSuggestionPlaceSummary,
} from "./suggestions"

/**
 * Job phát hiện địa điểm cho bài chưa gắn địa điểm (A7.2).
 *
 * Quét post `place_id IS NULL` chưa từng được thông báo, chấm điểm trên place
 * **chưa publish**; có kết quả thì tạo notification `place-suggestion` (tối đa 3
 * gợi ý + lý do) và ghi dấu vào `place_suggestion_notifications`.
 *
 * Idempotence: khoá chính `post_id` của bảng dấu — hai worker chạy song song
 * (cron + trigger sau khi tạo bài) không thể tạo 2 thông báo cho cùng một bài.
 * Notification và dấu idempotence được ghi trong CÙNG một transaction: worker
 * khác chen vào thì unique constraint trên `post_id` làm cả hai bị hoàn tác
 * (P2002 được coi là "đã xử lý", không phải lỗi).
 */

/** Số gợi ý mỗi thông báo — khớp mock (`rankPlaceSuggestions(..., 3)`). */
const SUGGESTIONS_PER_NOTIFICATION = 3

/** Batch nhỏ mỗi lần chạy (K6: 50 post/lần) — không giữ query/transaction dài. */
const BATCH_SIZE = 50

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
    // postId là xử lý 1 bài cụ thể (trigger) — không cần giới hạn.
    ...(postId ? {} : { take: BATCH_SIZE }),
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
            place: toSuggestionPlaceSummary(candidate.row, false),
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
      if (isUniqueViolation(error)) continue
      throw error
    }
  }

  return created
}
