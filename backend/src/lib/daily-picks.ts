import { Prisma } from "../../generated/prisma/client"
import { prisma } from "./prisma"
import { toPlaceDto } from "./places"

/**
 * "Gợi ý hôm nay" (Daily Picks) — thuật toán chọn 3 quán mỗi ngày.
 *
 * Tách hai phần:
 * - `selectDailyPicks` thuần hàm (không DB) — test unit chạy trực tiếp.
 * - `pickDailyPicks` / `getDailyPicks` — đọc/ghi DB, job pg-boss gọi.
 *
 * Tín hiệu chỉ dựa trên dữ liệu có thật (category, district, review_count,
 * created_at, lịch sử picks) — không dùng rating/tags vì dataset cold-start
 * gần như không có (1 review, 0 tag). Đa dạng là tiêu chí chính khi điểm gần
 * như bằng nhau.
 */

/** Mốc đổi ngày — server luôn tính theo Asia/Ho_Chi_Minh, một chỗ duy nhất. */
const TIME_ZONE = "Asia/Ho_Chi_Minh"

/** Số slot mỗi ngày — khớp `dailyPicksSchema` (`max(3)`). */
export const DAILY_PICKS_COUNT = 3

/** Cửa sổ không lặp quán — 7 ngày gần nhất. */
const RECENT_DAYS = 7

/** Quán thêm trong 30 ngày tính tới `pickDate` được cộng điểm "quán mới". */
const NEW_PLACE_DAYS = 30

/** Ngưỡng "Nhiều đánh giá" khi dựng `reason`. */
const REASON_REVIEW_THRESHOLD = 5

/**
 * Ngày hôm nay theo Asia/Ho_Chi_Minh — `en-CA` cho đúng `YYYY-MM-DD`.
 * Job truyền `pickDate` vào thuật toán, KHÔNG dùng `now()` trong tính toán
 * nên retry cùng ngày luôn ra cùng kết quả.
 */
export function getPickDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(now)
}

/** Ngày cách `days` trước `pickDate` (định dạng `YYYY-MM-DD`). */
function shiftDate(pickDate: string, days: number): string {
  const time = Date.parse(`${pickDate}T00:00:00Z`) + days * 86_400_000
  return new Date(time).toISOString().slice(0, 10)
}

/**
 * Xáo trộn seeded — mulberry32 (~5 dòng, không thêm dependency, DECISIONS 27).
 * Seed từ chuỗi (ngày + định danh) nên cùng ngày chạy lại ra cùng thứ tự,
 * khác ngày khác thứ tự.
 */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** FNV-1a 32 bit — băm chuỗi thành seed cho mulberry32. */
function hashString(value: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** Số giả lập ổn định theo (ngày, định danh) — dùng làm khoá xáo trộn. */
function seededKey(pickDate: string, id: string): number {
  return mulberry32(hashString(`${pickDate}:${id}`))()
}

/** Ứng viên đủ điều kiện chọn (đã lọc visibility ở tầng SQL). */
export interface PickCandidate {
  id: string
  /** Dạng Prisma (`street_food`) — thuật toán chỉ nhóm theo chuỗi này. */
  category: string
  district: string | null
  reviewCount: number
  createdAt: Date
}

/** Một lần xuất hiện trong lịch sử picks — để loại quán lặp 7 ngày. */
export interface PickHistoryEntry {
  placeId: string
  /** `YYYY-MM-DD`. */
  pickDate: string
}

/** Một slot đã chọn — job ghi nguyên trạng này vào `daily_picks`. */
export interface PickedPlace {
  placeId: string
  position: number
  reason: string
}

/** Điểm cơ bản: review thật được ưu tiên khi có, quán mới cộng thêm. */
function baseScore(candidate: PickCandidate, newCutoff: string): number {
  const isNew = candidate.createdAt.toISOString().slice(0, 10) >= newCutoff
  return 2 * Math.log(1 + candidate.reviewCount) + (isNew ? 1 : 0)
}

/** `reason` trung thực từ dữ liệu có thật — không bịa "điểm cao" khi rating = 0. */
function buildReason(candidate: PickCandidate, newCutoff: string): string {
  if (candidate.createdAt.toISOString().slice(0, 10) >= newCutoff) return "Quán mới"
  if (candidate.reviewCount >= REASON_REVIEW_THRESHOLD) return "Nhiều đánh giá"
  return "Gợi ý của ngày"
}

/**
 * Chọn 3 quán cho một ngày — thuần hàm, deterministic theo `(candidates,
 * history, pickDate)`.
 *
 * Bước 1: điểm cơ bản (review + quán mới). Bước 2: round-robin theo thứ tự
 * category xáo trộn seeded — 3 slot ưu tiên 3 category khác nhau. Bước 3:
 * trong cùng category ưu tiên district chưa dùng (quán thiếu district xếp
 * sau). Bước 4: loại quán của 7 ngày gần nhất; cạn ứng viên thì nới lỏng bằng
 * quán lặp cũ nhất thay vì trả thiếu.
 */
export function selectDailyPicks(
  candidates: PickCandidate[],
  history: PickHistoryEntry[],
  pickDate: string,
  limit: number = DAILY_PICKS_COUNT,
): PickedPlace[] {
  const newCutoff = shiftDate(pickDate, -NEW_PLACE_DAYS)
  const recentCutoff = shiftDate(pickDate, -RECENT_DAYS)
  const recentIds = new Set(
    history.filter((entry) => entry.pickDate >= recentCutoff).map((entry) => entry.placeId),
  )

  // Ứng viên chính: loại quán của 7 ngày gần nhất; xếp theo điểm rồi khoá seeded.
  const pool = candidates
    .filter((candidate) => !recentIds.has(candidate.id))
    .map((candidate) => ({
      candidate,
      score: baseScore(candidate, newCutoff),
      key: seededKey(pickDate, candidate.id),
    }))
    .sort((a, b) => b.score - a.score || a.key - b.key)

  const byCategory = new Map<string, typeof pool>()
  for (const entry of pool) {
    const list = byCategory.get(entry.candidate.category) ?? []
    list.push(entry)
    byCategory.set(entry.candidate.category, list)
  }

  // Thứ tự category xáo trộn seeded theo ngày — khác ngày, vòng lặp khác.
  const categories = [...byCategory.keys()].sort(
    (a, b) => seededKey(pickDate, `category:${a}`) - seededKey(pickDate, `category:${b}`),
  )

  const usedDistricts = new Set<string>()
  const picked: PickedPlace[] = []

  const takeBest = (list: typeof pool): (typeof pool)[number] | undefined => {
    // Ưu tiên district chưa dùng trong ngày; thiếu district coi như "kém ưu
    // tiên" nhưng vẫn đủ điều kiện (xếp sau cùng trong category).
    const fresh = list.find(
      (entry) => entry.candidate.district !== null && !usedDistricts.has(entry.candidate.district),
    )
    const chosen = fresh ?? list[0]
    if (!chosen) return undefined
    if (chosen.candidate.district) usedDistricts.add(chosen.candidate.district)
    return chosen
  }

  // Round-robin: mỗi vòng lấy 1 quán mỗi category → 3 slot gần như luôn thuộc
  // 3 category khác nhau khi corpus đủ; cạn category thì vòng sau lặp lại.
  for (let round = 0; picked.length < limit && round < limit; round += 1) {
    for (const category of categories) {
      if (picked.length >= limit) break
      const list = byCategory.get(category)
      if (!list || list.length === 0) continue
      const chosen = takeBest(list)
      if (!chosen) continue
      list.splice(list.indexOf(chosen), 1)
      picked.push({
        placeId: chosen.candidate.id,
        position: picked.length + 1,
        reason: buildReason(chosen.candidate, newCutoff),
      })
    }
  }

  // Cạn ứng viên (corpus quá nhỏ): nới lỏng bằng quán lặp cũ nhất — trả thiếu
  // thì dải gợi ý co lại, vẫn tốt hơn rỗng.
  if (picked.length < limit) {
    const pickedIds = new Set(picked.map((pick) => pick.placeId))
    // Cũ nhất trước: quán lặp lại là quán lâu nhất chưa được chọn.
    const oldest = [...history].sort((a, b) => a.pickDate.localeCompare(b.pickDate))
    for (const entry of oldest) {
      if (picked.length >= limit) break
      if (pickedIds.has(entry.placeId)) continue
      const candidate = candidates.find((item) => item.id === entry.placeId)
      if (!candidate) continue
      pickedIds.add(entry.placeId)
      picked.push({
        placeId: candidate.id,
        position: picked.length + 1,
        reason: buildReason(candidate, newCutoff),
      })
    }
  }

  return picked
}

/** Dòng thô ứng viên từ Postgres. */
interface CandidateRow {
  id: string
  category: string
  district: string | null
  review_count: number
  created_at: Date
}

/**
 * Lấy ứng viên đủ điều chọn — tái dùng điều kiện visibility của danh sách
 * (`published_at IS NOT NULL AND status <> 'closed' AND deleted_at IS NULL`).
 * Viết query riêng (không dùng `fetchRankCandidates`) vì không cần chuẩn hoá
 * chuỗi cho caption-matching — thừa và đắt.
 */
async function fetchPickCandidates(
  client: Prisma.TransactionClient = prisma,
): Promise<PickCandidate[]> {
  const rows = await client.$queryRaw<CandidateRow[]>(Prisma.sql`
    SELECT p.id, p.category::text AS category, p.district, p.created_at,
           COALESCE(r.review_count, 0)::int AS review_count
    FROM places p
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS review_count
      FROM reviews rv
      WHERE rv.place_id = p.id AND rv.deleted_at IS NULL
    ) r ON true
    WHERE p.published_at IS NOT NULL AND p.status <> 'closed' AND p.deleted_at IS NULL
  `)
  return rows.map((row) => ({
    id: row.id,
    category: row.category,
    district: row.district,
    reviewCount: Number(row.review_count),
    createdAt: row.created_at,
  }))
}

/**
 * Tính + ghi picks của một ngày trong MỘT transaction: job chết giữa chừng
 * (sau khi insert 1–2 row) thì rollback, retry tính lại từ đầu theo `pickDate`
 * và ra đúng cùng bộ 3.
 *
 * Chạy lại khi ngày đó đã có picks: `createMany({ skipDuplicates: true })` bỏ
 * qua row trùng unique constraint mà KHÔNG ném lỗi (khác `create`), nên không
 * cần bắt P2002 ở đây — số row ghi thật lấy từ `count` trả về.
 *
 * @returns số slot đã ghi thật (0 khi hôm nay đã có picks hoặc không đủ ứng viên).
 */
export async function pickDailyPicks(pickDate: string): Promise<number> {
  return await prisma.$transaction(async (tx) => {
    const [candidateRows, historyRows] = await Promise.all([
      fetchPickCandidates(tx),
      tx.dailyPick.findMany({
        // Chỉ picks TRƯỚC ngày đang tính — picks cùng ngày (kể cả row của
        // lần chạy dở) không được coi là lịch sử, nếu không retry sẽ ra bộ
        // khác với lần tính đầy đủ.
        //
        // Cửa sổ `>= pickDate - 7` (8 ngày lịch) CHẶT HƠN thiết kế 1 ngày
        // (`> current_date - 7` = 7 ngày) một cách có chủ đích: chặn thêm quán
        // vừa lên đúng 7 ngày trước, tránh cảm giác "quán này lặp lại" mà
        // không ảnh hưởng khả năng tìm đủ 3 slot.
        where: {
          pickDate: {
            gte: new Date(`${shiftDate(pickDate, -RECENT_DAYS)}T00:00:00Z`),
            lt: new Date(`${pickDate}T00:00:00Z`),
          },
        },
        select: { placeId: true, pickDate: true },
      }),
    ])
    const history = historyRows.map((row) => ({
      placeId: row.placeId,
      pickDate: row.pickDate.toISOString().slice(0, 10),
    }))

    const picked = selectDailyPicks(candidateRows, history, pickDate)
    if (picked.length === 0) return 0

    // skipDuplicates: job chạy lại không nhân đôi slot (unique constraint chặn).
    // Đếm `count` thật thay vì `picked.length` để log/return không gây hiểu
    // nhầm là đã ghi 3 row khi thực tế bỏ qua hết.
    const { count } = await tx.dailyPick.createMany({
      data: picked.map((pick) => ({
        pickDate: new Date(`${pickDate}T00:00:00Z`),
        position: pick.position,
        placeId: pick.placeId,
        reason: pick.reason,
      })),
      skipDuplicates: true,
    })
    return count
  })
}

/** Dòng thô của endpoint — phần place khớp `PlaceRow` của `toPlaceDto`. */
type DailyPickRow = {
  position: number
  reason: string
} & Parameters<typeof toPlaceDto>[0]

/**
 * Đọc picks của một ngày để trả endpoint — JOIN lại điều kiện visibility nên
 * quán bị unpublish/close giữa ngày chỉ làm dải co lại, không 404.
 */
export async function getDailyPicks(pickDate: string): Promise<{
  date: string
  items: { place: ReturnType<typeof toPlaceDto>; reason: string }[]
}> {
  const rows = await prisma.$queryRaw<DailyPickRow[]>(Prisma.sql`
    SELECT dp.position, dp.reason, p.id, p.name, p.address, p.city, p.district,
           p.category::text AS category, p.tags, p.price_level, p.lat, p.lng,
           p.status::text AS status, p.created_at,
           COALESCE(r.rating, 0)::float8 AS rating,
           COALESCE(r.review_count, 0)::int AS review_count,
           img.url AS image_url, img.height AS image_height
    FROM daily_picks dp
    JOIN places p ON p.id = dp.place_id
    LEFT JOIN LATERAL (
      SELECT ROUND(AVG(rv.rating)::numeric, 1) AS rating, COUNT(*) AS review_count
      FROM reviews rv
      WHERE rv.place_id = p.id AND rv.deleted_at IS NULL
    ) r ON true
    LEFT JOIN LATERAL (
      SELECT pi.url, pi.height
      FROM place_images pi
      WHERE pi.place_id = p.id
      ORDER BY pi.position
      LIMIT 1
    ) img ON true
    WHERE dp.pick_date = ${pickDate}::date
      AND p.published_at IS NOT NULL AND p.status <> 'closed' AND p.deleted_at IS NULL
    ORDER BY dp.position
  `)
  return {
    date: pickDate,
    items: rows.map((row) => ({ place: toPlaceDto(row), reason: row.reason })),
  }
}
