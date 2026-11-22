import { subDays } from "date-fns"
import { prisma } from "./prisma"
import { logger } from "./logger"

const RETENTION_DAYS = 180

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
    const cutoff = subDays(now, RETENTION_DAYS)
    for (const row of rows) {
      // bound dạng: FOR VALUES FROM ('2026-11-01 00:00:00+07') TO ('2026-12-01 ...')
      const match = /TO \('([^']+)'\)/.exec(row.bound)
      if (!match?.[1]) continue
      const upper = new Date(match[1])
      if (Number.isNaN(upper.getTime()) || upper > cutoff) continue
      if (!/^interaction_events_\d{4}_\d{2}$/u.test(row.relname)) continue
      try {
        // Tên partition đã được kiểm tra chặt theo regex `interaction_events_YYYY_MM`
        // và bọc nháy kép identifier trước khi thực thi.
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${row.relname}"`)
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
