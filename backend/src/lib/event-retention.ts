import { prisma } from "./prisma"
import { logger } from "./logger"

/**
 * Bảo trì partition cho `interaction_events` (P0):
 * - Tạo trước partition tháng T+1 (để event ghi đúng mốc đổi tháng không rơi
 *   vào `_default` — bảng `_default` chỉ là lưới an toàn, không để phình).
 * - Xoá partition cũ hơn RETENTION_DAYS ngày (event chỉ là tín hiệu rec, không
 *   phải dữ liệu pháp lý — giữ 180 ngày là đủ và giữ DB gọn).
 *
 * Idempotent: chạy lại không lỗi (`IF NOT EXISTS` / kiểm tra trước khi drop).
 * Lỗi chỉ log — job cron ngày mai sẽ thử lại, không được làm rớt tiến trình.
 */

const RETENTION_DAYS = 180

/** `2026-11` → `interaction_events_2026_11`. */
function partitionName(year: number, month: number): string {
  return `interaction_events_${year}_${String(month).padStart(2, "0")}`
}

export async function maintainInteractionPartitions(): Promise<{
  created: string | null
  dropped: string[]
}> {
  // Tháng T+1 theo giờ địa phương (múi giờ nghiệp vụ là Asia/Ho_Chi_Minh).
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const year = next.getFullYear()
  const month = next.getMonth() + 1
  const name = partitionName(year, month)

  // BOUNDS: [ngày 1 tháng T+1, ngày 1 tháng T+2)
  const start = `${year}-${String(month).padStart(2, "0")}-01`
  const endYear = month === 12 ? year + 1 : year
  const endMonth = month === 12 ? 1 : month + 1
  const end = `${endYear}-${String(endMonth).padStart(2, "0")}-01`

  let created: string | null = null
  try {
    // Báo `created` chỉ khi bảng thực sự mới — `IF NOT EXISTS` thành công trên
    // bảng đã có không phải là "đã tạo".
    const exists = await prisma.$queryRaw<{ ok: boolean }[]>`
      SELECT true AS ok FROM pg_class WHERE relname = ${name}`
    if (exists.length === 0) {
      await prisma.$executeRawUnsafe(
        `CREATE TABLE ${name} PARTITION OF interaction_events FOR VALUES FROM ('${start}') TO ('${end}')`,
      )
      created = name
    }
  } catch (error) {
    logger.warn({ err: error, partition: name }, "không tạo được partition tháng tới")
  }

  // Drop partition có biên trên <= hôm nay - RETENTION_DAYS.
  const dropped: string[] = []
  try {
    const rows = await prisma.$queryRaw<{ relname: string; bound: string }[]>`
      SELECT c.relname, pg_get_expr(c.relpartbound, c.oid) AS bound
      FROM pg_inherits i
      JOIN pg_class c ON c.oid = i.inhrelid
      WHERE i.inhparent = 'interaction_events'::regclass
    `
    const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000)
    for (const row of rows) {
      // bound dạng: FOR VALUES FROM ('2026-11-01 00:00:00+07') TO ('2026-12-01 ...')
      const match = /TO \('([^']+)'\)/.exec(row.bound)
      if (!match?.[1]) continue
      const upper = new Date(match[1])
      if (Number.isNaN(upper.getTime()) || upper > cutoff) continue
      try {
        // Tên partition sinh từ năm/tháng do chính code này đặt — không có đầu
        // vào người dùng, an toàn khi nội suy.
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS ${row.relname}`)
        dropped.push(row.relname)
      } catch (error) {
        logger.warn({ err: error, partition: row.relname }, "không drop được partition cũ")
      }
    }
  } catch (error) {
    logger.warn({ err: error }, "không liệt kê được partition interaction_events")
  }

  logger.info({ created, dropped }, "event-retention xong")
  return { created, dropped }
}
