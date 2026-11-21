/**
 * Export ma trận điểm gợi ý cho mọi cặp (user, place) — offline, phục vụ phân
 * tích/đối chiếu với luồng gợi ý thật.
 *
 * Điểm được lấy trực tiếp từ `scoreAffinity` / `scoreColdStart` trong
 * `src/lib/recommendations.ts` (cùng nguồn với `getRecommendedPlaces`), không
 * nhân bản công thức. Place đã từng tương tác vẫn có row nhưng `seen=1`,
 * `rank` để trống vì luồng gợi ý loại chúng.
 *
 * Chạy: cd backend && bun run scripts/export-rec-scores.ts
 *       [--out <dir>] [--active-only] [--max-users <n>]
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { Prisma } from "../generated/prisma/client"
import { prisma } from "../src/lib/prisma"
import {
  COLD_START_CAP_PER_CATEGORY,
  HISTORY_WINDOW_DAYS,
  scoreAffinity,
  scoreColdStart,
} from "../src/lib/recommendations"

interface UserRow {
  id: string
  name: string
  email: string
}

interface PlaceRow {
  id: string
  name: string
  category: string
}

interface ScoreRow {
  userId: string
  userName: string
  userEmail: string
  placeId: string
  placeName: string
  category: string
  strategy: "affinity" | "cold-start"
  score: number
  rank: number | null
  seen: 0 | 1
  seedCount: number
}

function argValue(flag: string): string | undefined {
  const args = process.argv.slice(2)
  const idx = args.indexOf(flag)
  if (idx < 0) return undefined
  return args[idx + 1]
}

function csvCell(value: string | number | null): string {
  const text = value === null ? "" : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

async function main(): Promise<void> {
  const outDir = argValue("--out") ?? join(import.meta.dir, "..", "data", "eval")
  const activeOnly = process.argv.includes("--active-only")
  const maxUsers = Number(argValue("--max-users") ?? "0")

  const activeUserIds = activeOnly
    ? new Set(
        (
          await prisma.$queryRaw<{ user_id: string }[]>(Prisma.sql`
          SELECT DISTINCT user_id FROM interaction_events
          WHERE user_id IS NOT NULL AND weight > 0
            AND created_at >= now() - (${HISTORY_WINDOW_DAYS} || ' days')::interval
        `)
        ).map((row) => row.user_id),
      )
    : null

  const [users, places, coldStart] = await Promise.all([
    prisma.$queryRaw<UserRow[]>(Prisma.sql`
      SELECT id, name, email FROM users
      WHERE deleted_at IS NULL
      ORDER BY created_at ASC, id ASC
    `),
    prisma.$queryRaw<PlaceRow[]>(Prisma.sql`
      SELECT id, name, category::text AS category FROM places
      WHERE published_at IS NOT NULL
        AND deleted_at IS NULL
        AND status <> 'closed'
      ORDER BY id ASC
    `),
    scoreColdStart(),
  ])

  // DES điểm phụ thuộc hour bucket nhưng không phụ thuộc user — tính một lần.
  // Thứ tự phải khớp `coldStartCandidates`: lọc category cap rồi xếp theo
  // categoryRank, sau đó score. Place vượt cap không thể lọt danh sách gợi ý
  // nên không có rank.
  const coldScore = new Map(coldStart.map((row) => [row.id, row.score]))
  const coldOrder = coldStart
    .filter((row) => row.categoryRank <= COLD_START_CAP_PER_CATEGORY)
    .sort(
      (a, b) => a.categoryRank - b.categoryRank || b.score - a.score || a.id.localeCompare(b.id),
    )
  const coldRank = new Map(coldOrder.map((row, index) => [row.id, index + 1]))

  const selectedUsers = activeUserIds ? users.filter((user) => activeUserIds.has(user.id)) : users
  const limitedUsers = maxUsers > 0 ? selectedUsers.slice(0, maxUsers) : selectedUsers

  const rows: ScoreRow[] = []
  const perUser: {
    userId: string
    name: string
    strategy: string
    seedCount: number
    top5: { placeId: string; name: string; score: number }[]
  }[] = []

  for (const user of limitedUsers) {
    const scored = await scoreAffinity({ userId: user.id, anonId: null })
    const affinity = scored && scored.ranked.length > 0 ? scored : null
    const seenSet = affinity?.seen ?? new Set<string>()

    const scoreById = affinity
      ? new Map(affinity.ranked.map((item) => [item.id, item.score]))
      : coldScore
    const rankById = affinity
      ? new Map(affinity.ranked.map((item, index) => [item.id, index + 1]))
      : coldRank
    const strategy = affinity ? "affinity" : "cold-start"

    for (const place of places) {
      const seen = seenSet.has(place.id)
      rows.push({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        placeId: place.id,
        placeName: place.name,
        category: place.category,
        strategy,
        score: scoreById.get(place.id) ?? 0,
        rank: seen ? null : (rankById.get(place.id) ?? null),
        seen: seen ? 1 : 0,
        seedCount: affinity?.seedCount ?? 0,
      })
    }

    const top = (affinity ? affinity.ranked : coldOrder)
      .filter((item) => !seenSet.has(item.id))
      .slice(0, 5)
      .map((item) => ({
        placeId: item.id,
        name: places.find((place) => place.id === item.id)?.name ?? item.id,
        score: item.score,
      }))
    perUser.push({
      userId: user.id,
      name: user.name,
      strategy,
      seedCount: affinity?.seedCount ?? 0,
      top5: top,
    })
  }

  mkdirSync(outDir, { recursive: true })
  const header = [
    "user_id",
    "user_name",
    "user_email",
    "place_id",
    "place_name",
    "category",
    "strategy",
    "score",
    "rank",
    "seen",
    "seed_count",
  ]
  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [
        row.userId,
        row.userName,
        row.userEmail,
        row.placeId,
        row.placeName,
        row.category,
        row.strategy,
        row.score.toFixed(6),
        row.rank,
        row.seen,
        row.seedCount,
      ]
        .map(csvCell)
        .join(","),
    ),
  ]
  const csvPath = join(outDir, "rec-scores-user-place.csv")
  writeFileSync(csvPath, `${lines.join("\n")}\n`)

  const jsonPath = join(outDir, "rec-scores-user-place.json")
  writeFileSync(
    jsonPath,
    `${JSON.stringify(
      {
        runAt: new Date().toISOString(),
        users: limitedUsers.length,
        places: places.length,
        rows: rows.length,
        strategies: {
          affinity: perUser.filter((item) => item.strategy === "affinity").length,
          "cold-start": perUser.filter((item) => item.strategy === "cold-start").length,
        },
        notes: [
          "score: affinity = tổng share_weight × item_score từ affinity_cache; cold-start = DES score (giờ hiện tại).",
          "rank: thứ tự trong danh sách gợi ý thật; trống với place đã tương tác (seen=1) hoặc cold-start vượt category cap.",
          "cold-start cap mỗi category: " + COLD_START_CAP_PER_CATEGORY,
        ],
        perUser,
      },
      null,
      2,
    )}\n`,
  )

  console.log(`Đã ghi ${rows.length} dòng (${limitedUsers.length} user × ${places.length} place)`)
  console.log(`CSV: ${csvPath}`)
  console.log(`JSON: ${jsonPath}`)
}

try {
  await main()
} catch (error: unknown) {
  console.error("export-rec-scores lỗi:", error)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
