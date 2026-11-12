import { createHash } from "node:crypto"
import { Prisma } from "../../generated/prisma/client"
import { prisma } from "./prisma"
import { toUserProfile } from "./profile"

/**
 * Gợi ý người nên theo dõi (`GET /users/suggestions`).
 *
 * Tách hai phần như `daily-picks`:
 * - SQL chỉ *gom số đếm thô* cho mọi ứng viên trong MỘT batch (không N+1).
 * - `rankSuggestions` thuần hàm: tính điểm, `reason`, tiebreak hash theo ngày,
 *   cắt 5 người — test unit chạy trực tiếp không cần DB.
 *
 * Tín hiệu CHỈ lấy từ nguồn công khai (review, bài đăng gắn địa điểm, collection
 * công khai). KHÔNG dùng `post_saves`/collection riêng tư: suy ra "hai người cùng
 * quan tâm quán X" từ hành vi lưu riêng tư là rò rỉ dữ liệu (BLOCKER B1).
 */

/** Trọng số điểm tín hiệu — hằng số named, không cấu hình qua env. */
const SHARED_PLACE_WEIGHT = 3.0
const MUTUAL_FOLLOW_WEIGHT = 2.0
const RECENT_ACTIVITY_WEIGHT = 1.5
const NEW_USER_WEIGHT = 0.5

/** Số gợi ý tối đa — khớp `userSuggestionsSchema` (`max(5)`). */
export const MAX_SUGGESTIONS = 5

/** Cửa sổ "hoạt động gần đây" / "tài khoản mới" — 30 ngày. */
const RECENT_WINDOW_DAYS = 30

const DAY_MS = 86_400_000

/** Ứng viên với số đếm thô — đúng dữ liệu SQL trả về, chưa tính điểm. */
export interface SuggestionCandidate {
  id: string
  /** Số quán chung từ nguồn công khai (review, bài gắn địa điểm, collection công khai). */
  sharedPlaces: number
  /** Số người tôi theo dõi mà cũng theo dõi ứng viên này. */
  mutualFollows: number
  /** Ứng viên đang theo dõi tôi (gợi ý tốt nhất khi tôi chưa follow lại). */
  followsMe: boolean
  /** Số bài đăng + review của họ trong 30 ngày qua. */
  recentActivity: number
  createdAt: Date
}

/** Kết quả xếp hạng — route dùng `id` để lấy hồ sơ đầy đủ + `reason` để hiển thị. */
export interface RankedSuggestion {
  id: string
  reason: string
}

/** Ngày hôm nay dạng UTC `YYYY-MM-DD` — chỉ dùng xoay tiebreak, không mang nghĩa nghiệp vụ. */
export function getSuggestionDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

/** Tài khoản tạo trong 30 ngày tính tới `today` (tính cả ngày hôm nay). */
function isNewUser(createdAt: Date, today: string): boolean {
  const endOfToday = Date.parse(`${today}T00:00:00Z`) + DAY_MS
  const age = endOfToday - createdAt.getTime()
  return age >= 0 && age <= RECENT_WINDOW_DAYS * DAY_MS
}

/**
 * Khoá tiebreak: md5(`viewerId|userId|today`) — cùng ngày cùng thứ tự, ngày mai
 * đổi nhẹ, mỗi người xem một góc riêng. Không thêm dependency (`node:crypto`).
 */
function tiebreakKey(viewerId: string, userId: string, today: string): string {
  return createHash("md5").update(`${viewerId}|${userId}|${today}`).digest("hex")
}

/** Điểm tín hiệu của một ứng viên — công thức mục 5 của thiết kế. */
function scoreCandidate(candidate: SuggestionCandidate, today: string): number {
  return (
    SHARED_PLACE_WEIGHT * candidate.sharedPlaces +
    MUTUAL_FOLLOW_WEIGHT * candidate.mutualFollows +
    RECENT_ACTIVITY_WEIGHT * Math.log(1 + candidate.recentActivity) +
    (isNewUser(candidate.createdAt, today) ? NEW_USER_WEIGHT : 0)
  )
}

/**
 * `reason` trung thực, ưu tiên theo bảng thiết kế. Chỉ nói về dữ liệu công khai
 * và **không nhúng tên người khác** (bài học V3-04) — "Có 2 người theo dõi
 * chung", không phải "Có dung, long theo dõi chung".
 */
function buildReason(candidate: SuggestionCandidate, today: string): string {
  if (candidate.sharedPlaces >= 1) return `Cùng quan tâm ${candidate.sharedPlaces} quán`
  if (candidate.mutualFollows >= 1) return `Có ${candidate.mutualFollows} người theo dõi chung`
  if (candidate.followsMe) return "Theo dõi bạn"
  if (candidate.recentActivity >= 1) return "Đang hoạt động gần đây"
  if (isNewUser(candidate.createdAt, today)) return "Mới tham gia Rendez"
  return "Gợi ý cho bạn"
}

/**
 * Xếp hạng ứng viên — thuần hàm, deterministic theo `(candidates, viewerId, today)`.
 *
 * Điểm giảm dần; bằng điểm thì tiebreak hash tăng dần. Corpus hiện gần như
 * không có tín hiệu nên nhánh tiebreak chính là thứ tự thực tế: vẫn ổn định
 * trong ngày và không ai "đứng đầu vĩnh viễn".
 */
export function rankSuggestions(
  candidates: SuggestionCandidate[],
  viewerId: string,
  today: string,
  limit: number = MAX_SUGGESTIONS,
): RankedSuggestion[] {
  return candidates
    .map((candidate) => ({
      candidate,
      score: scoreCandidate(candidate, today),
      key: tiebreakKey(viewerId, candidate.id, today),
    }))
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))
    .slice(0, limit)
    .map((entry) => ({
      id: entry.candidate.id,
      reason: buildReason(entry.candidate, today),
    }))
}

/** Dòng thô từ SQL — snake_case như SELECT. */
interface CandidateRow {
  id: string
  name: string
  handle: string
  bio: string
  location: string
  avatar_url: string | null
  cover_url: string | null
  private_profile: boolean
  created_at: Date
  shared_places: number
  mutual_follows: number
  follows_me: boolean
  recent_activity: number
}

/**
 * Gom số đếm thô cho mọi ứng viên trong MỘT query.
 *
 * Ứng viên: user chưa xoá, không phải chính mình, chưa được mình theo dõi.
 * Người đang theo dõi mình nhưng mình chưa follow lại vẫn đủ điều kiện.
 */
async function fetchCandidates(viewerId: string): Promise<CandidateRow[]> {
  return prisma.$queryRaw<CandidateRow[]>(Prisma.sql`
    WITH my_places AS (
      SELECT r.place_id FROM reviews r
      WHERE r.author_id = ${viewerId}::uuid AND r.deleted_at IS NULL
      UNION
      SELECT p.place_id FROM posts p
      WHERE p.author_id = ${viewerId}::uuid AND p.place_id IS NOT NULL AND p.deleted_at IS NULL
      UNION
      SELECT cp.place_id FROM collection_places cp
      JOIN collections col ON col.id = cp.collection_id
      WHERE col.owner_id = ${viewerId}::uuid AND col.is_private = false AND col.deleted_at IS NULL
    )
    SELECT u.id, u.name, u.handle, u.bio, u.location, u.avatar_url, u.cover_url,
           u.private_profile, u.created_at,
           (SELECT COUNT(*)::int
            FROM (
              SELECT r.place_id FROM reviews r
              WHERE r.author_id = u.id AND r.deleted_at IS NULL
              UNION
              SELECT p.place_id FROM posts p
              WHERE p.author_id = u.id AND p.place_id IS NOT NULL AND p.deleted_at IS NULL
              UNION
              SELECT cp.place_id FROM collection_places cp
              JOIN collections col ON col.id = cp.collection_id
              WHERE col.owner_id = u.id AND col.is_private = false AND col.deleted_at IS NULL
            ) theirs
            JOIN my_places mine ON mine.place_id = theirs.place_id
           ) AS shared_places,
           (SELECT COUNT(*)::int
            FROM follows f1
            JOIN follows f2 ON f2.follower_id = f1.following_id
            WHERE f1.follower_id = ${viewerId}::uuid AND f2.following_id = u.id
           ) AS mutual_follows,
           EXISTS (
             SELECT 1 FROM follows f
             WHERE f.follower_id = u.id AND f.following_id = ${viewerId}::uuid
           ) AS follows_me,
           ((SELECT COUNT(*) FROM posts p
             WHERE p.author_id = u.id AND p.deleted_at IS NULL
               AND p.created_at > now() - interval '30 days')
            + (SELECT COUNT(*) FROM reviews r
             WHERE r.author_id = u.id AND r.deleted_at IS NULL
               AND r.created_at > now() - interval '30 days'))::int AS recent_activity
    FROM users u
    WHERE u.deleted_at IS NULL
      AND u.id <> ${viewerId}::uuid
      AND NOT EXISTS (
        SELECT 1 FROM follows f
        WHERE f.follower_id = ${viewerId}::uuid AND f.following_id = u.id
      )
  `)
}

/**
 * Gợi ý người nên theo dõi cho một người xem — hồ sơ đầy đủ để FE render nút
 * follow ngay (không gọi thêm request).
 *
 * Chọn 5 người trong TS rồi đếm `postCount`/`followerCount`/`followingCount`/
 * `followedByMe` cho cả trang bằng GROUP BY — không N+1 (A6.9).
 */
export async function suggestUsersToFollow(
  viewerId: string,
): Promise<{ user: ReturnType<typeof toUserProfile>; reason: string }[]> {
  const rows = await fetchCandidates(viewerId)
  if (rows.length === 0) return []

  const ranked = rankSuggestions(
    rows.map((row) => ({
      id: row.id,
      sharedPlaces: Number(row.shared_places),
      mutualFollows: Number(row.mutual_follows),
      followsMe: row.follows_me,
      recentActivity: Number(row.recent_activity),
      createdAt: row.created_at,
    })),
    viewerId,
    getSuggestionDate(),
  )
  if (ranked.length === 0) return []

  const pageIds = ranked.map((entry) => entry.id)
  const [postCounts, followerCounts, followingCounts, followedRows] = await Promise.all([
    prisma.post.groupBy({
      by: ["authorId"],
      where: { authorId: { in: pageIds }, deletedAt: null },
      _count: { authorId: true },
    }),
    prisma.follow.groupBy({
      by: ["followingId"],
      where: { followingId: { in: pageIds } },
      _count: { followingId: true },
    }),
    prisma.follow.groupBy({
      by: ["followerId"],
      where: { followerId: { in: pageIds } },
      _count: { followerId: true },
    }),
    prisma.follow.findMany({
      where: { followerId: viewerId, followingId: { in: pageIds } },
      select: { followingId: true },
    }),
  ])
  const postByUser = new Map(postCounts.map((row) => [row.authorId, row._count.authorId]))
  const followerByUser = new Map(
    followerCounts.map((row) => [row.followingId, row._count.followingId]),
  )
  const followingByUser = new Map(
    followingCounts.map((row) => [row.followerId, row._count.followerId]),
  )
  const followedIds = new Set(followedRows.map((row) => row.followingId))
  const rowById = new Map(rows.map((row) => [row.id, row]))

  return ranked.flatMap((entry) => {
    const row = rowById.get(entry.id)
    if (!row) return []
    return [
      {
        user: toUserProfile(
          {
            id: row.id,
            name: row.name,
            handle: row.handle,
            bio: row.bio,
            location: row.location,
            avatarUrl: row.avatar_url,
            coverUrl: row.cover_url,
            privateProfile: row.private_profile,
            createdAt: row.created_at,
          },
          viewerId,
          {
            postCount: postByUser.get(row.id) ?? 0,
            followerCount: followerByUser.get(row.id) ?? 0,
            followingCount: followingByUser.get(row.id) ?? 0,
            followedByMe: followedIds.has(row.id),
          },
        ),
        reason: entry.reason,
      },
    ]
  })
}
