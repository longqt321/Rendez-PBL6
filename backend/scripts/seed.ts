/**
 * Seed idempotent: ưu tiên `backend/data/places-expanded.json` (corpus OSM đã lọc,
 * sinh bởi scripts/build-corpus — hiện 344 POI), không có thì dùng
 * `frontend/data/cold-start/places.json` (491 place gốc).
 *
 * Nguyên tắc (D-049, K4): KHÔNG bịa số liệu.
 * - `rating`/`reviewCount` không lưu cột — tính bằng COUNT/AVG (D3).
 * - `tags = []`, `priceLevel = 1`: dataset không có dữ liệu này.
 * - Posts/comments/reviews/collections để rỗng.
 *
 * Chạy: `bun run db:seed` (hoặc tự động sau `prisma migrate dev` qua prisma.config.ts).
 */
import { join } from "node:path"
import type { PlaceCategory, PlaceStatus } from "@rendez/schema"
import type { PlaceCategory as PrismaPlaceCategory } from "../generated/prisma/enums"
import { prisma } from "../src/lib/prisma"

interface ColdStartPlace {
  id: string
  name: string
  category: string
  district: string | null
  address: string | null
  lat: number | null
  lng: number | null
  phone: string | null
  openingHours: string | null
  description: string | null
  sources: string[]
  geoSource: string | null
  geoPrecision: string | null
  osmId: string | null
  image: string | null
  imageCredit?: string
  imageKind: string | null
  imageNote: string | null
  images: string[]
  venuePageUrl: string | null
  verified: boolean
  collectedAt: string | null
  tier: string | null
  status: string
}

interface ColdStartDataset {
  meta: { count: number }
  places: ColdStartPlace[]
}

/**
 * 36 loại hình của dataset → 6 nhóm của frontend.
 * Giữ ĐÚNG bảng map của `frontend/src/mocks/fixtures/cold-start-places.ts`
 * để seed và mock cho cùng kết quả.
 */
const CATEGORY_MAP: Record<string, PlaceCategory> = {
  // Nhãn ẩm thực gốc của dataset 491.
  cafe: "cafe",
  "banh-mi": "bakery",
  "banh-ngot": "bakery",
  che: "dessert",
  "kem-bo": "dessert",
  "kem-trang-mieng": "dessert",
  "sinh-to": "dessert",
  "tra-sua": "dessert",
  tau: "dessert",
  "an-vat": "street-food",
  "banh-trang-thit-heo": "street-food",
  "banh-xeo": "street-food",
  "banh-khoai": "street-food",
  "banh-beo": "street-food",
  "banh-cen": "street-food",
  "nem-lui": "street-food",
  banh: "bakery",
  // Nhãn món/quốc gia do build-corpus gán (lexicon + cuisine tag).
  // Đều là quán ăn → map về restaurant (frontend chỉ có 6 nhóm).
  "quan-an": "restaurant",
  "viet-nam": "restaurant",
  "hai-san": "restaurant",
  nhat: "restaurant",
  han: "restaurant",
  thai: "restaurant",
  trung: "restaurant",
  "an-do": "restaurant",
  y: "restaurant",
  com: "restaurant",
  pho: "restaurant",
  bun: "restaurant",
  "com-ga": "restaurant",
  "mi-quang": "restaurant",
  "bun-cha-ca": "restaurant",
  "bun-mam": "restaurant",
  "bun-mam-nem": "restaurant",
  "cao-lau": "restaurant",
  "hu-tieu": "restaurant",
  chao: "restaurant",
  nuong: "restaurant",
  lau: "restaurant",
  xoi: "restaurant",
  "goi-ca": "restaurant",
  chay: "restaurant",
  "quan-nhau": "restaurant",
  // Mua sắm — chỉ địa điểm lớn (D-AI-42).
  "sieu-thi": "restaurant",
  cho: "restaurant",
  mall: "restaurant",
  // Nhãn bị T4b loại khỏi corpus nhưng giữ map đề phòng dataset cũ.
  "cua-hang-tien-loi": "restaurant",
  "cua-hang-thuc-pham": "restaurant",
  "cua-hang-ruou": "restaurant",
  "tap-hoa": "restaurant",
  farm: "restaurant",
  // Giải trí (L7) — frontend chỉ có 6 nhóm, map gần nhất về mặt trải nghiệm.
  // KHÔNG có `casino` — đã bỏ khỏi corpus theo yêu cầu user.
  karaoke: "bar",
  "music-box": "cafe",
  cinema: "bar",
  bida: "bar",
  bowling: "bar",
  arcade: "bar",
  "water-park": "bar",
  spa: "restaurant",
  massage: "restaurant",
  // Thùng nhiễu — vẫn seed (1.3% corpus) để không mất dữ liệu âm thầm.
  khac: "restaurant",
}

/**
 * API dùng `street-food` (dấu gạch nối), Prisma enum buộc tên TS là
 * `street_food` (đã `@map("street-food")` ở DB) — quy đổi tại biên DB.
 */
const PRISMA_CATEGORY: Record<PlaceCategory, PrismaPlaceCategory> = {
  cafe: "cafe",
  restaurant: "restaurant",
  "street-food": "street_food",
  bakery: "bakery",
  dessert: "dessert",
  bar: "bar",
}

/**
 * Địa điểm chưa duyệt — giữ đúng 1 mục như mock để demo `isPublished: false`.
 *
 * Hợp đồng seed: LUÔN có ít nhất 1 place chưa publish (luồng gợi ý địa điểm
 * A7.2 và test phụ thuộc nó). Dataset gốc 491 place chứa id của mock; corpus
 * mở rộng từ OSM thì không — khi đó chọn phần tử CUỐI của dataset (xác định
 * theo dữ liệu, không phải hardcode id mới mỗi lần dataset thay đổi).
 */
const UNPUBLISHED_IDS = new Set(["ram-cuon-cai-di-hoa-6152681085"])

/**
 * Tên địa điểm có dùng được cho gợi ý/khớp tìm kiếm không.
 *
 * Corpus OSM có tên rác kiểu "N&M" — place như vậy làm bất biến "có ≥ 1 place
 * chưa publish" trở nên vô nghĩa: job gợi ý không thể khớp tên (token < 2 ký tự)
 * nên test và luồng demo đều rỗng. Chọn place có tên ≥ 2 từ, không ký tự đặc biệt.
 */
function isSuggestableName(name: string): boolean {
  const words = name
    .trim()
    .split(/\s+/u)
    .filter((word) => /[\p{L}]{2,}/u.test(word))
  return words.length >= 2 && name.length >= 8 && !/[&/|]/u.test(name)
}

function pickUnpublishedIds(places: ColdStartPlace[]): Set<string> {
  const fromMock = places.filter((place) => UNPUBLISHED_IDS.has(place.id))
  if (fromMock.length > 0) return new Set(fromMock.map((place) => place.id))

  // Dataset không chứa id của mock: chọn place cuối có TÊN DÙNG ĐƯỢC (xác định
  // theo dữ liệu, không hardcode id) để job gợi ý và test có mẫu khớp tên.
  const usable = places.filter((place) => isSuggestableName(place.name))
  const chosen = usable.at(-1) ?? places.at(-1)
  if (!chosen) return new Set()
  console.info(`[seed] Dataset không chứa id chưa duyệt của mock — dùng place: ${chosen.id}`)
  return new Set([chosen.id])
}

/** Ngày duyệt mặc định cho dữ liệu cold-start (mock server, không thuộc dataset). */
const PUBLISHED_AT = new Date("2026-11-09T08:00:00+07:00")

/**
 * `created_at` gán sẵn theo thứ tự dataset (mục đầu mới nhất, cách nhau 1 giây):
 * API trả place theo keyset `(created_at, id)` giảm dần, và mock — đặc tả hành vi —
 * trả theo thứ tự dataset. Không gán thì thứ tự phụ thuộc thời điểm insert,
 * trang đầu của `GET /places` sẽ không khớp mock (mất ảnh card ở trang đầu).
 */
const SEED_BASE_AT = new Date("2026-11-09T00:00:00+07:00")

/**
 * Corpus OSM mở rộng để place `osm` (không ảnh) TRƯỚC place curated (có ảnh),
 * khiến trang đầu `/discover` toàn card không ảnh — lệch đặc tả mock (curated
 * đầu tiên). Thứ tự seed: place CÓ ẢNH → curated còn lại → osm. Sort ổn định nên
 * giữ nguyên thứ tự trong từng nhóm, và `created_at` theo thứ tự đã sắp.
 */
function seedRank(place: ColdStartPlace): number {
  if (place.image || place.images.length > 0) return 0
  return place.tier === "osm" ? 2 : 1
}

const ORIGINAL_PATH = join(import.meta.dir, "../../frontend/data/cold-start/places.json")
// Corpus mở rộng từ OSM (nếu có) — ưu tiên dùng. Sinh bởi scripts/build-corpus.
const EXPANDED_PATH = join(import.meta.dir, "../data/places-expanded.json")

function toStatus(raw: string): PlaceStatus {
  return raw === "open" || raw === "closed" ? raw : "unknown"
}

function toDate(value: string | null): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

async function main(): Promise<void> {
  // Ưu tiên corpus mở rộng; nếu chưa có thì dùng dataset gốc 491 place.
  let datasetPath = EXPANDED_PATH
  if (!(await Bun.file(EXPANDED_PATH).exists())) {
    datasetPath = ORIGINAL_PATH
  }
  const file = Bun.file(datasetPath)
  if (!(await file.exists())) {
    throw new Error(`Không tìm thấy dataset: ${datasetPath}`)
  }

  const dataset = (await file.json()) as ColdStartDataset
  console.info(`[seed] Đọc ${dataset.places.length} place từ ${datasetPath}`)

  // Chống lệch code ↔ dữ liệu (L-019): corpus do build-corpus sinh mà có nhãn
  // chưa khai báo trong CATEGORY_MAP thì DỪNG, không map bừa về "restaurant".
  // Chỉ áp dụng cho corpus mở rộng — dataset gốc 491 có bộ nhãn riêng.
  if (datasetPath === EXPANDED_PATH) {
    const unknown = [...new Set(dataset.places.map((place) => place.category))].filter(
      (category) => !(category in CATEGORY_MAP),
    )
    if (unknown.length > 0) {
      throw new Error(
        `[seed] Nhãn chưa map trong CATEGORY_MAP: ${unknown.join(", ")} — sửa seed.ts hoặc build-corpus (L-019)`,
      )
    }
  }

  // Có ảnh → curated → osm: trang đầu /discover phải giống mock (có ảnh card).
  const places = [...dataset.places].sort((a, b) => seedRank(a) - seedRank(b))
  let images = 0
  let index = 0
  const unpublishedIds = pickUnpublishedIds(places)

  for (const raw of places) {
    const publishedAt = unpublishedIds.has(raw.id) ? null : PUBLISHED_AT
    const data = {
      createdAt: new Date(SEED_BASE_AT.getTime() - index * 1_000),
      name: raw.name,
      address: raw.address ?? raw.district ?? "Đà Nẵng",
      city: "Đà Nẵng",
      district: raw.district,
      category: PRISMA_CATEGORY[CATEGORY_MAP[raw.category] ?? "restaurant"],
      priceLevel: 1,
      tags: [],
      lat: raw.lat,
      lng: raw.lng,
      status: toStatus(raw.status),
      description: raw.description,
      phone: raw.phone,
      openingHours: raw.openingHours,
      sources: raw.sources ?? [],
      geoSource: raw.geoSource,
      geoPrecision: raw.geoPrecision,
      venuePageUrl: raw.venuePageUrl,
      verified: raw.verified,
      collectedAt: toDate(raw.collectedAt),
      tier: raw.tier,
      osmId: raw.osmId,
      imageKind: raw.imageKind,
      imageNote: raw.imageNote,
      publishedAt,
    }

    await prisma.place.upsert({
      where: { id: raw.id },
      create: { id: raw.id, ...data },
      update: data,
    })

    // Ảnh: dataset có `images[]`; giữ thứ tự, idempotent theo (place, url).
    const urls = raw.images.length > 0 ? raw.images : raw.image ? [raw.image] : []
    for (const [position, path] of urls.entries()) {
      const url = `/data/cold-start/${path}`
      const existing = await prisma.placeImage.findFirst({
        where: { placeId: raw.id, url },
        select: { id: true },
      })
      if (existing) {
        await prisma.placeImage.update({
          where: { id: existing.id },
          data: {
            position,
            kind: raw.imageKind,
            credit: raw.imageCredit ?? null,
          },
        })
      } else {
        await prisma.placeImage.create({
          data: {
            placeId: raw.id,
            url,
            position,
            kind: raw.imageKind,
            credit: raw.imageCredit ?? null,
          },
        })
        images += 1
      }
    }

    index += 1
  }

  // Dọn dư liệu: các place tier='osm' KHÔNG còn trong dataset hiện tại là rác
  // từ lần seed trước (corpus OSM thay đổi id mỗi lần build). Chỉ xoá tier='osm'
  // — tier curated/curated-v2 là dữ liệu kiểm tay, KHÔNG BAO GIỜ tự xoá.
  // notIn giới hạn ~65k tham số của Postgres; corpus hiện 344, đủ dư địa.
  const datasetIds = dataset.places.map((p) => p.id)
  const stale = await prisma.place.deleteMany({
    where: { tier: "osm", id: { notIn: datasetIds } },
  })
  if (stale.count > 0) {
    console.info(`[seed] Dọn ${stale.count} place tier='osm' không còn trong corpus.`)
  }

  const placeCount = await prisma.place.count()
  const imageCount = await prisma.placeImage.count()
  console.info(`[seed] Xong: ${placeCount} place, ${imageCount} ảnh (thêm mới ${images}).`)
}

try {
  await main()
} catch (error) {
  console.error("[seed] Thất bại:", error)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
