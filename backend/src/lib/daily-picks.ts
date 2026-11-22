import { addDays, parseISO } from "date-fns"
import { Prisma } from "../../generated/prisma/client"
import { prisma } from "./prisma"
import { toPlaceDto } from "./places"
import { isOpenNow } from "./opening-hours"
import { mulberry32 } from "./eval-metrics"

const TIME_ZONE = "Asia/Ho_Chi_Minh"

export const DAILY_PICKS_COUNT = 3

const RECENT_DAYS = 7

const NEW_PLACE_DAYS = 30

const REASON_REVIEW_THRESHOLD = 5

export function getPickDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(now)
}

function shiftDate(pickDate: string, days: number): string {
  return addDays(parseISO(`${pickDate}T00:00:00Z`), days)
    .toISOString()
    .slice(0, 10)
}

/** FNV-1a 32 bit — băm chuỗi thành seed cho mulberry32 (định nghĩa ở `eval-metrics`). */
function hashString(value: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.codePointAt(index) ?? 0
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
  rating?: number
  /** Số ảnh thật của quán — quán curated có ảnh, quán OSM thô thì không. */
  imageCount: number
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

/** Phần dữ liệu thật cần cho việc chấm điểm một quán (dùng lại ở `why`). */
export interface PickScoreInput {
  reviewCount: number
  rating?: number
  /** Số ảnh thật của quán — quán curated có ảnh, quán OSM thô thì không. */
  imageCount: number
  createdAt: Date
}

/**
 * Điểm tối đa lý thuyết của công thức `baseScore`: quán ≥ `REASON_REVIEW_THRESHOLD`
 * đánh giá, điểm >= 4.0, vừa thêm trong 30 ngày, có ảnh thật. Dùng làm mẫu số để quy đổi
 * `matchPercent` — hằng số của công thức, không phải số liệu bịa theo từng quán.
 */
export const PICK_SCORE_MAX = 2 * Math.log(1 + REASON_REVIEW_THRESHOLD) + 2 + 2 + 1

/** Điểm cơ bản: review thật, điểm cao, quán mới và ảnh thật. */
function baseScore(candidate: PickScoreInput, newCutoff: string): number {
  const isNew = candidate.createdAt.toISOString().slice(0, 10) >= newCutoff
  // Quán có ảnh thật được cộng điểm: dải gợi ý hiển thị ảnh ngay trên đầu
  // /discover — chọn quán không ảnh là dải toàn placeholder. Cùng điểm với
  // "quán mới" (2) vì ảnh là tín hiệu chất lượng quan trọng nhất hiện có.
  const hasImage = candidate.imageCount > 0 ? 2 : 0
  const goodRating = (candidate.rating ?? 0) >= 4.0 && candidate.reviewCount >= 3 ? 1 : 0
  return 2 * Math.log(1 + candidate.reviewCount) + (isNew ? 2 : 0) + hasImage + goodRating
}

/** Điểm của một quán theo đúng `pickDate` — dùng cho `why.matchPercent`. */
export function pickScore(candidate: PickScoreInput, pickDate: string): number {
  return baseScore(candidate, shiftDate(pickDate, -NEW_PLACE_DAYS))
}

/**
 * `matchPercent` = điểm / điểm tối đa × 100, làm tròn, kẹp 0–100. Số nguyên,
 * tính từ chính breakdown điểm của thuật toán — client không tự tính lại.
 */
export function pickMatchPercent(candidate: PickScoreInput, pickDate: string): number {
  const percent = Math.round((pickScore(candidate, pickDate) / PICK_SCORE_MAX) * 100)
  return Math.min(100, Math.max(0, percent))
}

/**
 * Các lý do THẬT đang được dùng để chọn quán (tối đa 3), suy trực tiếp từ dữ
 * liệu: ảnh thật, số đánh giá, quán mới. Không thêm lý do không có căn cứ.
 */
export function pickSignals(candidate: PickScoreInput, pickDate: string): string[] {
  const newCutoff = shiftDate(pickDate, -NEW_PLACE_DAYS)
  const signals: string[] = []
  if (candidate.imageCount > 0) signals.push("Có ảnh thật")
  if (candidate.reviewCount >= REASON_REVIEW_THRESHOLD) signals.push("Nhiều đánh giá")
  if (candidate.createdAt.toISOString().slice(0, 10) >= newCutoff) signals.push("Quán mới")
  if (signals.length === 0) {
    // Không có tín hiệu định lượng nào — nói đúng sự thật thay vì bịa lý do.
    signals.push("Gợi ý của ngày")
  }
  return signals.slice(0, 3)
}

/** `reason` trung thực từ dữ liệu có thật — không bịa "điểm cao" khi rating = 0. */
function buildReason(candidate: PickCandidate, newCutoff: string): string {
  if (candidate.reviewCount >= REASON_REVIEW_THRESHOLD) return "Nhiều đánh giá"
  if (candidate.imageCount > 0) return "Được chọn lọc"
  if (candidate.createdAt.toISOString().slice(0, 10) >= newCutoff) return "Quán mới"
  return "Gợi ý của ngày"
}

interface PoolEntry {
  candidate: PickCandidate
  score: number
  key: number
}

function fillRoundRobin(
  picked: PickedPlace[],
  limit: number,
  categories: string[],
  byCategory: Map<string, PoolEntry[]>,
  usedDistricts: Set<string>,
  newCutoff: string,
): void {
  for (let round = 0; picked.length < limit && round < limit; round += 1) {
    for (const category of categories) {
      if (picked.length >= limit) break
      const list = byCategory.get(category)
      if (!list || list.length === 0) continue
      const fresh = list.find(
        (entry) =>
          entry.candidate.district !== null && !usedDistricts.has(entry.candidate.district),
      )
      const chosen = fresh ?? list[0]
      if (!chosen) continue
      if (chosen.candidate.district) usedDistricts.add(chosen.candidate.district)
      list.splice(list.indexOf(chosen), 1)
      picked.push({
        placeId: chosen.candidate.id,
        position: picked.length + 1,
        reason: buildReason(chosen.candidate, newCutoff),
      })
    }
  }
}

function fillFromHistory(
  picked: PickedPlace[],
  limit: number,
  candidates: PickCandidate[],
  history: PickHistoryEntry[],
  newCutoff: string,
): void {
  const pickedIds = new Set(picked.map((pick) => pick.placeId))
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

  // Cổng chất lượng: khi corpus có đủ ≥ `limit` quán có ảnh thật thì chỉ chọn
  // từ nhóm đó — dải gợi ý nằm ngay đầu /discover, chọn quán không ảnh là dải
  // toàn placeholder. Không đủ thì dùng nguyên pool (corpus quá nhỏ vẫn có picks).
  const withImages = pool.filter((entry) => entry.candidate.imageCount > 0)
  const activePool = withImages.length >= limit ? withImages : pool

  const byCategory = new Map<string, typeof pool>()
  for (const entry of activePool) {
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

  // Round-robin: mỗi vòng lấy 1 quán mỗi category → 3 slot gần như luôn thuộc
  // 3 category khác nhau khi corpus đủ; cạn category thì vòng sau lặp lại.
  fillRoundRobin(picked, limit, categories, byCategory, usedDistricts, newCutoff)

  // Cạn ứng viên (corpus quá nhỏ): nới lỏng bằng quán lặp cũ nhất — trả thiếu
  // thì dải gợi ý co lại, vẫn tốt hơn rỗng.
  if (picked.length < limit) {
    fillFromHistory(picked, limit, candidates, history, newCutoff)
  }

  return picked
}

/** Dòng thô ứng viên từ Postgres. */
interface CandidateRow {
  id: string
  category: string
  district: string | null
  review_count: number
  rating: number
  image_count: number
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
           COALESCE(r.review_count, 0)::int AS review_count,
           COALESCE(r.rating, 0)::float8 AS rating,
           COALESCE(img.image_count, 0)::int AS image_count
    FROM places p
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS review_count,
             COALESCE(AVG(CASE rv.tier WHEN 'must_try' THEN 5.0 WHEN 'good' THEN 4.0 WHEN 'ok' THEN 3.0 ELSE 0.0 END), 0) AS rating
      FROM reviews rv
      WHERE rv.place_id = p.id AND rv.deleted_at IS NULL
    ) r ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS image_count
      FROM place_images pi
      WHERE pi.place_id = p.id
    ) img ON true
    WHERE p.published_at IS NOT NULL AND p.status <> 'closed' AND p.deleted_at IS NULL
  `)
  return rows.map((row) => ({
    id: row.id,
    category: row.category,
    district: row.district,
    reviewCount: Number(row.review_count),
    rating: Number(row.rating),
    imageCount: Number(row.image_count),
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
  image_count: number
} & Parameters<typeof toPlaceDto>[0]

/**
 * Đọc picks của một ngày để trả endpoint — JOIN lại điều kiện visibility nên
 * quán bị unpublish/close giữa ngày chỉ làm dải co lại, không 404.
 *
 * Mỗi item kèm `why`: matchPercent tính từ chính công thức chọn quán, `openNow`
 * parse `opening_hours` (Asia/Ho_Chi_Minh), `signals` là các lý do thật. Không
 * có toạ độ người xem trong endpoint này nên `distanceKm` luôn `null`.
 */
export async function getDailyPicks(pickDate: string): Promise<{
  date: string
  items: {
    place: ReturnType<typeof toPlaceDto>
    reason: string
    why: {
      matchPercent: number
      district?: string
      distanceKm: number | null
      openNow: boolean | null
      signals: string[]
    }
  }[]
}> {
  const rows = await prisma.$queryRaw<DailyPickRow[]>(Prisma.sql`
    SELECT dp.position, dp.reason, p.id, p.name, p.address, p.city, p.district,
           p.category::text AS category,
           COALESCE(tg.tags, ARRAY[]::text[]) AS tags,
           p.price_level, p.lat, p.lng,
           p.status::text AS status, p.opening_hours, p.created_at, p.published_at,
           COALESCE(r.positive_ratio, 0)::int AS positive_ratio,
           COALESCE(r.must_try_count, 0)::int AS must_try_count,
           COALESCE(r.review_count, 0)::int AS review_count,
           COALESCE(img.image_count, 0)::int AS image_count,
           img.url AS image_url, img.height AS image_height
    FROM daily_picks dp
    JOIN places p ON p.id = dp.place_id
    LEFT JOIN LATERAL (
      SELECT ARRAY_AGG(t.name ORDER BY pt.position, t.name) AS tags
      FROM place_tags pt
      JOIN tags t ON t.id = pt.tag_id
      WHERE pt.place_id = p.id
    ) tg ON true
    LEFT JOIN LATERAL (
      SELECT COALESCE(
               ROUND(
                 100.0 * COUNT(*) FILTER (WHERE rv.tier IN ('good', 'must_try')) /
                   NULLIF(COUNT(*), 0)
               )::int,
               0
             ) AS positive_ratio,
             COUNT(*) FILTER (WHERE rv.tier = 'must_try')::int AS must_try_count,
             COUNT(*) AS review_count
      FROM reviews rv
      WHERE rv.place_id = p.id AND rv.deleted_at IS NULL
    ) r ON true
    LEFT JOIN LATERAL (
      SELECT pi.url, pi.height,
             (SELECT COUNT(*) FROM place_images all_pi WHERE all_pi.place_id = p.id) AS image_count
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
    items: rows.map((row) => {
      const input = {
        reviewCount: Number(row.review_count),
        rating: Number(row.positive_ratio) / 20,
        imageCount: Number(row.image_count),
        createdAt: row.created_at,
      }
      return {
        place: toPlaceDto(row),
        reason: row.reason,
        why: {
          matchPercent: pickMatchPercent(input, pickDate),
          ...(row.district ? { district: row.district } : {}),
          distanceKm: null,
          openNow: isOpenNow(row.opening_hours),
          signals: pickSignals(input, pickDate),
        },
      }
    }),
  }
}
