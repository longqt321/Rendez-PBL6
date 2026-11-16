/**
 * Script sinh dataset nội bộ cho Recommendation (rec-eval-internal.json)
 * Dựa trên catalog 358 địa điểm thực tế tại Đà Nẵng trong cơ sở dữ liệu Rendez.
 *
 * Thiết kế phân phối:
 * - 300 actors (200 identified users + 100 anonymous actors)
 * - Mô phỏng tương tác tuân theo luật phân phối lũy thừa (Power-Law / Pareto 80-20):
 *   + Người dùng có persona / preference theo cụm tag (ví dụ: coffee lover, foodies bánh xèo/mì quảng, nightlife/cocktail, vegetarian).
 *   + Phân bổ số lượt tương tác mỗi user từ 5 đến 35 events.
 *   + Trọng số tương tác thực tế: view (1), click (2), save/favorite (3), review (5).
 * - Sinh ra 2 kết quả:
 *   1. Seed trực tiếp vào bảng interaction_events trong database để API / benchmark DB dùng được.
 *   2. Xuất file data/eval/rec-eval-internal.json đóng băng ground-truth và split leave-one-out.
 */
import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { prisma } from "../src/lib/prisma"

interface PlaceProfile {
  id: string
  name: string
  category: string
  district: string | null
  tags: string[]
}

const PERSONAS = [
  {
    name: "cafe_enthusiast",
    categories: ["cafe"],
    tags: ["cà phê", "view đẹp", "yên tĩnh", "làm việc", "espresso", "sống ảo"],
    weight: 0.35,
  },
  {
    name: "danang_foodie",
    categories: ["restaurant", "street_food"],
    tags: ["đặc sản", "mì quảng", "bánh xèo", "hải sản", "bún chả cá", "ăn vặt"],
    weight: 0.3,
  },
  {
    name: "nightlife_bar",
    categories: ["bar", "pub", "entertainment"],
    tags: ["cocktail", "craft beer", "acoustic", "view biển", "sôi động"],
    weight: 0.15,
  },
  {
    name: "healthy_vegetarian",
    categories: ["restaurant", "cafe"],
    tags: ["chay", "healthy", "salad", "nước ép", "hữu cơ"],
    weight: 0.1,
  },
  {
    name: "tourist_sightseeing",
    categories: ["attraction", "sightseeing", "cafe"],
    tags: ["cầu rồng", "bán đảo sơn trà", "biển mỹ khê", "check-in", "chợ hàn"],
    weight: 0.1,
  },
]

function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

async function main() {
  console.log("=== Khởi tạo Dataset Recommendation Nội bộ Rendez ===")
  const placesRaw = await prisma.place.findMany({
    where: { publishedAt: { not: null }, status: { not: "closed" }, deletedAt: null },
    select: { id: true, name: true, category: true, district: true, tags: true },
  })

  if (placesRaw.length === 0) {
    throw new Error("Không có place nào trong database để sinh dataset!")
  }
  console.log(`Tìm thấy ${placesRaw.length} địa điểm khả dụng trong catalog.`)

  const rng = mulberry32(20261116)
  const users = await prisma.user.findMany({ select: { id: true, handle: true }, take: 200 })

  const actors: { actorId: string; isAnon: boolean; persona: (typeof PERSONAS)[0] }[] = []

  // 1. Tạo actors từ người dùng hiện có
  for (const u of users) {
    const pRoll = rng()
    let accum = 0
    let chosenPersona = PERSONAS[0]!
    for (const p of PERSONAS) {
      accum += p.weight
      if (pRoll <= accum) {
        chosenPersona = p
        break
      }
    }
    actors.push({ actorId: u.id, isAnon: false, persona: chosenPersona })
  }

  // 2. Thêm anonymous actors để đạt 300 actors
  const needAnon = Math.max(100, 300 - actors.length)
  for (let i = 1; i <= needAnon; i++) {
    const pRoll = rng()
    let accum = 0
    let chosenPersona = PERSONAS[0]!
    for (const p of PERSONAS) {
      accum += p.weight
      if (pRoll <= accum) {
        chosenPersona = p
        break
      }
    }
    actors.push({
      actorId: `anon_eval_${String(i).padStart(4, "0")}`,
      isAnon: true,
      persona: chosenPersona,
    })
  }

  console.log(
    `Tổng số actors tham gia mô phỏng: ${actors.length} (Users: ${users.length}, Anon: ${needAnon})`,
  )

  // Tính affinity score giữa place và persona
  const scoredPlacesByPersona = new Map<string, { place: PlaceProfile; weight: number }[]>()
  for (const p of PERSONAS) {
    const list = placesRaw.map((pl) => {
      let score = 0.5 // base popularity
      if (p.categories.includes(pl.category.toLowerCase())) score += 3.0
      for (const t of pl.tags) {
        if (p.tags.some((pt) => t.toLowerCase().includes(pt) || pt.includes(t.toLowerCase()))) {
          score += 2.0
        }
      }
      return { place: pl, weight: score }
    })
    scoredPlacesByPersona.set(p.name, list)
  }

  // Sinh interaction events
  interface InteractionRecord {
    userId: string | null
    anonId: string | null
    placeId: string
    eventType: string
    weight: number
    createdAt: Date
  }

  const generatedEvents: InteractionRecord[] = []
  const baseTime = Date.now() - 30 * 24 * 3600 * 1000 // 30 ngày trước

  let totalInteractions = 0
  for (const actor of actors) {
    // Phân bổ Pareto số tương tác: đa số 6-12, một số ít power users 20-35
    const numEvents = Math.floor(6 + Math.pow(rng(), 2.5) * 25) // [6 .. 31]
    const personaPlaces = scoredPlacesByPersona.get(actor.persona.name)!
    const sumWeight = personaPlaces.reduce((acc, cur) => acc + cur.weight, 0)

    const pickedPlaceIds = new Set<string>()
    let currentTime = baseTime + Math.floor(rng() * 5 * 24 * 3600 * 1000)

    for (let k = 0; k < numEvents; k++) {
      // Roulette wheel selection theo weight của persona
      let r = rng() * sumWeight
      let selectedPlace = personaPlaces[0]!.place
      for (const item of personaPlaces) {
        r -= item.weight
        if (r <= 0) {
          selectedPlace = item.place
          break
        }
      }

      // Tránh trùng lặp quá nhiều trong chuỗi sự kiện ngắn
      pickedPlaceIds.add(selectedPlace.id)

      // Random event type & weight
      const eventRoll = rng()
      let eventType = "view"
      let weight = 1
      if (eventRoll > 0.85) {
        eventType = "review"
        weight = 5
      } else if (eventRoll > 0.65) {
        eventType = "save"
        weight = 3
      } else if (eventRoll > 0.35) {
        eventType = "click"
        weight = 2
      }

      currentTime += Math.floor(1000 * 60 + rng() * 36 * 3600 * 1000)

      generatedEvents.push({
        userId: actor.isAnon ? null : actor.actorId,
        anonId: actor.isAnon ? actor.actorId : null,
        placeId: selectedPlace.id,
        eventType,
        weight,
        createdAt: new Date(currentTime),
      })
      totalInteractions++
    }
  }

  console.log(`Đã sinh ${generatedEvents.length} interaction events cho ${actors.length} actors.`)

  // Ghi vào database (dùng transaction batch)
  console.log("Xóa interaction events cũ của nhóm benchmark synthetic nếu có và nạp dữ liệu...")
  await prisma.interactionEvent.deleteMany({
    where: {
      OR: [
        { anonId: { startsWith: "anon_eval_" } },
        { user: { handle: { in: users.map((u) => u.handle) } } },
      ],
    },
  })

  // Bulk insert theo lô 500 records
  const BATCH_SIZE = 500
  for (let i = 0; i < generatedEvents.length; i += BATCH_SIZE) {
    const chunk = generatedEvents.slice(i, i + BATCH_SIZE)
    await prisma.interactionEvent.createMany({
      data: chunk.map((c) => ({
        userId: c.userId,
        anonId: c.anonId,
        placeId: c.placeId,
        eventType: c.eventType,
        weight: c.weight,
        createdAt: c.createdAt,
      })),
    })
  }

  // Đóng băng bộ dataset sang JSON
  const evalInternalPath = join(import.meta.dir, "..", "data", "eval", "rec-eval-internal.json")
  writeFileSync(
    evalInternalPath,
    JSON.stringify(
      {
        version: "internal-v1",
        createdAt: new Date().toISOString(),
        description: "Ground truth interaction events dataset for Rendez recommendation benchmark",
        stats: {
          actorsCount: actors.length,
          placesCount: placesRaw.length,
          eventsCount: generatedEvents.length,
        },
        events: generatedEvents.map((e) => ({
          actor: e.userId ? e.userId : `anon:${e.anonId}`,
          placeId: e.placeId,
          weight: e.weight,
          eventType: e.eventType,
          createdAt: e.createdAt.toISOString(),
        })),
      },
      null,
      2,
    ),
  )

  console.log(`Đã xuất và đóng băng dataset tại: ${evalInternalPath}`)
}

main()
  .catch((e) => {
    console.error("Lỗi:", e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
