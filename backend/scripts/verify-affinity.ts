/**
 * Verify nhánh `affinity` của `getRecommendedPlaces` trên DB thật (bench).
 *
 * Kịch bản (dữ liệu tổng hợp, TỰ XOÁ sau khi chạy):
 * 1. Chọn 5 place công khai P1..P5.
 * 2. Actor A (`anon_id = verify-affinity-a`) tương tác P1..P3.
 *    Actor B (`anon_id = verify-affinity-b`) tương tác P1..P5.
 *    → item-item thấy P4, P5 liên quan tới seed của A.
 * 3. `refreshAffinityCache()` → `getRecommendedPlaces(A, 5)`.
 *    Kỳ vọng: `strategy = "affinity"`, `seedCount = 3`, items ⊆ {P4, P5}.
 * 4. Xoá event tổng hợp + tính lại cache từ dữ liệu thật (không để rác).
 *
 * Chạy: DATABASE_URL=... bun run scripts/verify-affinity.ts
 */
import { prisma } from "../src/lib/prisma"
import { refreshAffinityCache } from "../src/lib/affinity"
import { getRecommendedPlaces } from "../src/lib/recommendations"

const ANON_A = "verify-affinity-a"
const ANON_B = "verify-affinity-b"

async function main(): Promise<void> {
  const places = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM places
    WHERE published_at IS NOT NULL AND status <> 'closed' AND deleted_at IS NULL
    ORDER BY id
    LIMIT 5
  `
  if (places.length < 5) throw new Error(`Cần 5 place công khai, chỉ có ${places.length}`)
  const [p1, p2, p3, p4, p5] = places.map((row) => row.id) as [
    string,
    string,
    string,
    string,
    string,
  ]

  await prisma.interactionEvent.createMany({
    data: [
      { anonId: ANON_A, eventType: "place_view", placeId: p1, weight: 3 },
      { anonId: ANON_A, eventType: "place_view", placeId: p2, weight: 2 },
      { anonId: ANON_A, eventType: "place_save", placeId: p3, weight: 4 },
      { anonId: ANON_B, eventType: "place_view", placeId: p1, weight: 3 },
      { anonId: ANON_B, eventType: "place_view", placeId: p2, weight: 2 },
      { anonId: ANON_B, eventType: "place_view", placeId: p3, weight: 1 },
      { anonId: ANON_B, eventType: "place_view", placeId: p4, weight: 5 },
      { anonId: ANON_B, eventType: "place_view", placeId: p5, weight: 5 },
    ],
  })

  const cachedPlaces = await refreshAffinityCache()
  const result = await getRecommendedPlaces({ userId: null, anonId: ANON_A }, 5)

  console.log(
    JSON.stringify(
      {
        seeds: [p1, p2, p3],
        expectedRelated: [p4, p5],
        cachedPlaces,
        strategy: result.strategy,
        seedCount: result.seedCount,
        recommended: result.items.map((item) => item.id),
      },
      null,
      2,
    ),
  )

  // Dọn dẹp: xoá event tổng hợp rồi tính lại cache từ dữ liệu thật.
  await prisma.interactionEvent.deleteMany({ where: { anonId: { in: [ANON_A, ANON_B] } } })
  const restored = await refreshAffinityCache()
  console.log(`Đã xoá event tổng hợp; cache tính lại từ dữ liệu thật: ${restored} place`)

  const ok =
    result.strategy === "affinity" &&
    result.seedCount === 3 &&
    result.items.length === 5 &&
    [p4, p5].every((id) => result.items.slice(0, 2).some((item) => item.id === id))
  console.log(ok ? "KẾT LUẬN: PASS" : "KẾT LUẬN: FAIL")
  if (!ok) process.exitCode = 1
}

await main()
await prisma.$disconnect()
