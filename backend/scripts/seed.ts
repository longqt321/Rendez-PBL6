/**
 * Seed idempotent tách biệt rõ 3 chế độ `SEED_MODE=dev | prod | test`:
 * - `prod` (hoặc `NODE_ENV=production` khi chưa đặt `SEED_MODE`):
 *   Chỉ thêm mới địa điểm chưa có và bổ sung các trường đang trống;
 *   TUYỆT ĐỐI KHÔNG ghi đè chỉnh sửa của Admin hay xoá địa điểm đang tồn tại trên Prod.
 *   Không tạo user/review/post ảo; tự động chạy `pickDailyPicks()` cho ngày hôm nay.
 * - `dev` (mặc định khi chạy local):
 *   Đồng bộ catalog F&B chuẩn (có ảnh thật & mức giá hợp lý), dọn bản ghi cũ,
 *   và nạp bộ Dev Fixtures (3 tài khoản mẫu đã xác thực + đánh giá + bài viết + bộ sưu tập + Daily Picks).
 * - `test` (hoặc `NODE_ENV=test`):
 *   Giữ nguyên hành vi seed catalog sạch phục vụ integration tests (`0` bài viết/user/review sẵn).
 */
import { join } from "node:path"
import { hashPassword } from "better-auth/crypto"
import type { PlaceCategory, PlaceStatus } from "@rendez/schema"
import type { PlaceCategory as PrismaPlaceCategory } from "../generated/prisma/enums"
import { getPickDate, pickDailyPicks } from "../src/lib/daily-picks"
import { prisma } from "../src/lib/prisma"

export type SeedMode = "dev" | "prod" | "test"

export function resolveSeedMode(rawEnv = process.env): SeedMode {
  const explicit = rawEnv.SEED_MODE?.trim().toLowerCase()
  if (explicit === "prod" || explicit === "production") return "prod"
  if (explicit === "dev" || explicit === "development") return "dev"
  if (explicit === "test") return "test"
  if (rawEnv.NODE_ENV === "production") return "prod"
  if (rawEnv.NODE_ENV === "test") return "test"
  return "dev"
}

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
  tags?: string[]
  vibes?: string[]
}

interface ColdStartDataset {
  meta: { count: number }
  places: ColdStartPlace[]
}

/**
 * Bảng ánh xạ danh mục F&B & Nightlife thuần tuý -> 6 nhóm chuẩn của frontend.
 * Khớp với `frontend/src/mocks/fixtures/cold-start-places.ts`.
 */
const CATEGORY_MAP: Record<string, PlaceCategory> = {
  restaurant: "restaurant",
  bakery: "bakery",
  dessert: "dessert",
  "street-food": "street-food",
  bar: "bar",
  cafe: "cafe",
  "bar-pub": "bar",
  "cho-dem": "street-food",
  "dac-san": "restaurant",
  "banh-mi": "bakery",
  "banh-ngot": "bakery",
  banh: "bakery",
  che: "dessert",
  "kem-bo": "dessert",
  "kem-trang-mieng": "dessert",
  "kem-trang-miem": "dessert",
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
  "music-box": "cafe",
}

const PRISMA_CATEGORY: Record<PlaceCategory, PrismaPlaceCategory> = {
  cafe: "cafe",
  restaurant: "restaurant",
  "street-food": "street_food",
  bakery: "bakery",
  dessert: "dessert",
  bar: "bar",
}

const UNPUBLISHED_IDS = new Set(["ram-cuon-cai-di-hoa-6152681085"])

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

  const usable = places.filter((place) => isSuggestableName(place.name))
  const chosen = usable.at(-1) ?? places.at(-1)
  if (!chosen) return new Set()
  console.info(`[seed] Dataset không chứa id chưa duyệt của mock — dùng place: ${chosen.id}`)
  return new Set([chosen.id])
}

const PUBLISHED_AT = new Date("2026-11-09T08:00:00+07:00")

function hashId(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 1_000_003
  return hash
}

function publishedAtFor(id: string): Date {
  const daysAgo = hashId(id) % 90
  return new Date(PUBLISHED_AT.getTime() - daysAgo * 24 * 60 * 60 * 1_000)
}

function priceLevelFor(id: string, category: PlaceCategory, mode: SeedMode): 1 | 2 | 3 {
  if (mode === "test") return 1
  const bucket = hashId(id) % 10
  if (category === "street-food" || category === "bakery") {
    return bucket < 8 ? 1 : 2
  }
  if (category === "cafe" || category === "dessert") {
    if (bucket < 4) return 1
    if (bucket < 9) return 2
    return 3
  }
  // restaurant & bar
  if (bucket < 2) return 1
  if (bucket < 7) return 2
  return 3
}

const SEED_BASE_AT = new Date("2026-11-09T00:00:00+07:00")

function seedRank(place: ColdStartPlace): number {
  if (place.image || (place.images?.length ?? 0) > 0) return 0
  return place.tier === "osm" ? 2 : 1
}

const ORIGINAL_PATH = join(import.meta.dir, "../../frontend/data/cold-start/places.json")
const EXPANDED_PATH = join(import.meta.dir, "../data/places-expanded.json")

function toStatus(raw: string): PlaceStatus {
  return raw === "open" || raw === "closed" ? raw : "unknown"
}

function mergeTags(tags: string[], vibes: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const tag of [...tags, ...vibes]) {
    if (seen.has(tag)) continue
    seen.add(tag)
    out.push(tag)
  }
  return out
}

async function syncPlaceSources(placeId: string, sources: string[]): Promise<void> {
  await prisma.placeSource.deleteMany({ where: { placeId } })
  const unique = [...new Set(sources.map((s) => s.trim()).filter(Boolean))]
  for (const name of unique) {
    const source = await prisma.source.upsert({
      where: { name },
      create: { name },
      update: {},
      select: { id: true },
    })
    await prisma.placeSource.create({
      data: { placeId, sourceId: source.id },
    })
  }
}

async function syncPlaceTags(placeId: string, tags: string[]): Promise<void> {
  await prisma.placeTag.deleteMany({ where: { placeId } })
  for (const [position, rawName] of tags.entries()) {
    const name = rawName.trim()
    if (!name) continue
    const tag = await prisma.tag.upsert({
      where: { name },
      create: { name },
      update: {},
      select: { id: true },
    })
    await prisma.placeTag.create({
      data: { placeId, tagId: tag.id, position },
    })
  }
}

function toDate(value: string | null): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const DEV_USERS = [
  {
    id: "11111111-1111-4111-8111-111111111101",
    name: "Quản trị Rendez",
    handle: "rendez_admin",
    email: "admin@rendez.local",
    role: "admin" as const,
    bio: "Điều phối dữ liệu địa điểm & kiểm duyệt cộng đồng Đà Nẵng.",
    location: "Hải Châu, Đà Nẵng",
  },
  {
    id: "11111111-1111-4111-8111-111111111102",
    name: "Minh Anh",
    handle: "minhanh_dn",
    email: "minhanh@rendez.local",
    role: "user" as const,
    bio: "Thích cà phê sân vườn yên tĩnh & mì Quảng buổi sáng.",
    location: "Sơn Trà, Đà Nẵng",
  },
  {
    id: "11111111-1111-4111-8111-111111111103",
    name: "Quang Huy",
    handle: "quanghuy_food",
    email: "quanghuy@rendez.local",
    role: "user" as const,
    bio: "Săn quán ăn vặt kiệt nhỏ và hải sản bình dân.",
    location: "Thanh Khê, Đà Nẵng",
  },
]

async function seedDevFixtures(
  places: ColdStartPlace[],
  unpublishedIds: Set<string>,
): Promise<void> {
  const devPasswordHash = await hashPassword("rendezdev123")

  for (const u of DEV_USERS) {
    const existing = await prisma.user.findUnique({
      where: { email: u.email },
      select: { id: true },
    })
    if (!existing) {
      await prisma.user.create({
        data: {
          id: u.id,
          name: u.name,
          handle: u.handle,
          email: u.email,
          emailVerified: true,
          role: u.role,
          bio: u.bio,
          location: u.location,
        },
      })
      await prisma.account.create({
        data: {
          userId: u.id,
          accountId: u.id,
          providerId: "credential",
          password: devPasswordHash,
        },
      })
    }
  }

  const publishedImagePlaces = places.filter(
    (p) => !unpublishedIds.has(p.id) && (Boolean(p.image) || (p.images?.length ?? 0) > 0),
  )

  const sampleReviews = [
    {
      tier: "must_try" as const,
      recommendedDishes: ["Món đặc sản quán", "Nước ép tươi"],
      content: "Không gian thoáng, lên món nhanh, hương vị đúng chuẩn bản địa Đà Nẵng.",
    },
    {
      tier: "good" as const,
      recommendedDishes: ["Combo 2 người"],
      content: "Quán sạch sẽ, nhân viên nhiệt tình, cuối tuần hơi đông nhưng đáng thử.",
    },
    {
      tier: "must_try" as const,
      recommendedDishes: ["Món tủ của quán"],
      content: "Vị rất vừa miệng, giá hợp lý, nhóm mình đi 4 người ai cũng khen.",
    },
  ]

  // Seed đánh giá mẫu cho top 6 quán có ảnh thật (chỉ thêm khi cặp user-place chưa có)
  for (const [idx, place] of publishedImagePlaces.slice(0, 6).entries()) {
    const reviewerA = DEV_USERS[(idx % 2) + 1]!
    const reviewerB = DEV_USERS[((idx + 1) % 2) + 1]!
    const reviewA = sampleReviews[idx % sampleReviews.length]!
    const reviewB = sampleReviews[(idx + 1) % sampleReviews.length]!

    for (const [author, rev] of [
      [reviewerA, reviewA],
      [reviewerB, reviewB],
    ] as const) {
      await prisma.review.upsert({
        where: { placeId_authorId: { placeId: place.id, authorId: author.id } },
        create: {
          placeId: place.id,
          authorId: author.id,
          tier: rev.tier,
          recommendedDishes: [...rev.recommendedDishes],
          content: rev.content,
        },
        update: {},
      })
    }
  }

  // Chỉ tạo bài viết & bộ sưu tập mẫu khi bảng còn trống (tránh nhân bản khi chạy lại)
  const existingPostCount = await prisma.post.count()
  if (existingPostCount === 0 && publishedImagePlaces.length >= 3) {
    const postSpecs = [
      {
        authorId: DEV_USERS[1]!.id,
        place: publishedImagePlaces[0]!,
        caption: `Cuối tuần ghé ${publishedImagePlaces[0]!.name}, không gian dễ chịu và phục vụ rất chu đáo.`,
      },
      {
        authorId: DEV_USERS[2]!.id,
        place: publishedImagePlaces[1]!,
        caption: `Trưa nay ăn ở ${publishedImagePlaces[1]!.name} — đậm đà đúng chất miền Trung, gọi thêm trà đá là chuẩn bài.`,
      },
      {
        authorId: DEV_USERS[1]!.id,
        place: publishedImagePlaces[2]!,
        caption: `Lưu lại toạ độ ${publishedImagePlaces[2]!.name} để lần sau rủ cả nhóm ghé tiếp.`,
      },
    ]
    for (const spec of postSpecs) {
      await prisma.post.create({
        data: {
          authorId: spec.authorId,
          placeId: spec.place.id,
          caption: spec.caption,
        },
      })
    }
  }

  const existingCollectionCount = await prisma.collection.count()
  if (existingCollectionCount === 0 && publishedImagePlaces.length >= 4) {
    const col = await prisma.collection.create({
      data: {
        ownerId: DEV_USERS[1]!.id,
        name: "Quán ruột cuối tuần ở Đà Nẵng",
        description: "Tổng hợp các quán cà phê và ăn uống đã đi thực tế, toạ độ chuẩn.",
        isPrivate: false,
      },
    })
    for (const [position, place] of publishedImagePlaces.slice(0, 4).entries()) {
      await prisma.collectionPlace.create({
        data: { collectionId: col.id, placeId: place.id, position },
      })
    }
  }

  console.info("[seed] Đã đồng bộ Dev Fixtures (3 user mẫu, reviews, posts, collection).")
}

const CITY_LANDMARKS = [
  {
    slug: "cau-rong",
    name: "Cầu Rồng",
    district: "Hải Châu",
    lat: 16.0611,
    lng: 108.2275,
    sortOrder: 1,
  },
  {
    slug: "cau-song-han",
    name: "Cầu Sông Hàn",
    district: "Hải Châu",
    lat: 16.0721,
    lng: 108.227,
    sortOrder: 2,
  },
  {
    slug: "tuong-dai-me-nhu",
    name: "Tượng đài Mẹ Nhu",
    district: "Thanh Khê",
    lat: 16.0672,
    lng: 108.1873,
    sortOrder: 3,
  },
  {
    slug: "bai-bien-my-khe",
    name: "Bãi biển Mỹ Khê",
    district: "Sơn Trà",
    lat: 16.0598,
    lng: 108.2467,
    sortOrder: 4,
  },
  {
    slug: "cho-han",
    name: "Chợ Hàn",
    district: "Hải Châu",
    lat: 16.0686,
    lng: 108.2244,
    sortOrder: 5,
  },
  {
    slug: "cau-tran-thi-ly",
    name: "Cầu Trần Thị Lý",
    district: "Hải Châu",
    lat: 16.0497,
    lng: 108.2294,
    sortOrder: 6,
  },
  {
    slug: "san-bay-da-nang",
    name: "Sân bay Quốc tế Đà Nẵng",
    district: "Hải Châu",
    lat: 16.0439,
    lng: 108.1994,
    sortOrder: 7,
  },
  {
    slug: "cong-vien-bien-dong",
    name: "Công viên Biển Đông",
    district: "Sơn Trà",
    lat: 16.0695,
    lng: 108.2454,
    sortOrder: 8,
  },
] as const

async function seedCityLandmarks() {
  for (const lm of CITY_LANDMARKS) {
    await prisma.cityLandmark.upsert({
      where: { slug: lm.slug },
      update: {
        name: lm.name,
        district: lm.district,
        lat: lm.lat,
        lng: lm.lng,
        sortOrder: lm.sortOrder,
      },
      create: lm,
    })
  }
}

async function main(): Promise<void> {
  const mode = resolveSeedMode()
  console.info(`[seed] Chế độ đang chạy: SEED_MODE=${mode}`)

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

  const places = [...dataset.places].sort((a, b) => seedRank(a) - seedRank(b))
  let images = 0
  let index = 0
  // Trong Production KHÔNG ẩn bất kỳ quán thật nào.
  const unpublishedIds = mode === "prod" ? new Set<string>() : pickUnpublishedIds(places)

  for (const raw of places) {
    const mappedCategory = CATEGORY_MAP[raw.category] ?? "restaurant"
    const publishedAt = unpublishedIds.has(raw.id) ? null : publishedAtFor(raw.id)
    const data = {
      createdAt: new Date(SEED_BASE_AT.getTime() - index * 1_000),
      name: raw.name,
      address: raw.address ?? raw.district ?? "Đà Nẵng",
      city: "Đà Nẵng",
      district: raw.district,
      category: PRISMA_CATEGORY[mappedCategory],
      priceLevel: priceLevelFor(raw.id, mappedCategory, mode),
      lat: raw.lat,
      lng: raw.lng,
      status: toStatus(raw.status),
      description: raw.description,
      phone: raw.phone,
      openingHours: raw.openingHours,
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

    const mergedTags = mergeTags(raw.tags ?? [], raw.vibes ?? [])

    if (mode === "prod") {
      // Production: An toàn tuyệt đối (Non-destructive). Chỉ tạo mới hoặc vá các trường đang rỗng,
      // không ghi đè dữ liệu do Admin biên tập trên Production.
      const existingPlace = await prisma.place.findUnique({
        where: { id: raw.id },
        select: {
          id: true,
          description: true,
          phone: true,
          openingHours: true,
          lat: true,
          lng: true,
          district: true,
          _count: { select: { placeTags: true } },
        },
      })
      if (!existingPlace) {
        await prisma.place.create({ data: { id: raw.id, ...data } })
        await syncPlaceTags(raw.id, mergedTags)
        await syncPlaceSources(raw.id, raw.sources ?? [])
      } else {
        await prisma.place.update({
          where: { id: raw.id },
          data: {
            geoSource: data.geoSource,
            geoPrecision: data.geoPrecision,
            osmId: data.osmId,
            tier: data.tier,
            collectedAt: data.collectedAt,
            imageKind: data.imageKind,
            imageNote: data.imageNote,
            description: existingPlace.description ?? data.description,
            phone: existingPlace.phone ?? data.phone,
            openingHours: existingPlace.openingHours ?? data.openingHours,
            lat: existingPlace.lat ?? data.lat,
            lng: existingPlace.lng ?? data.lng,
            district: existingPlace.district ?? data.district,
          },
        })
        await syncPlaceSources(raw.id, raw.sources ?? [])
        if (existingPlace._count.placeTags === 0 && mergedTags.length > 0) {
          await syncPlaceTags(raw.id, mergedTags)
        }
      }
    } else {
      await prisma.place.upsert({
        where: { id: raw.id },
        create: { id: raw.id, ...data } as Parameters<typeof prisma.place.upsert>[0]["create"],
        update: data,
      })
      await syncPlaceTags(raw.id, mergedTags)
      await syncPlaceSources(raw.id, raw.sources ?? [])
    }

    const urls = (raw.images?.length ?? 0) > 0 ? raw.images : raw.image ? [raw.image] : []
    for (const [position, path] of urls.entries()) {
      const url = `/data/cold-start/${path}`
      const mediaKind =
        raw.imageKind === "dish_real" || raw.imageKind === "menu_price" ? raw.imageKind : "venue"
      const existing = await prisma.placeImage.findFirst({
        where: { placeId: raw.id, url },
        select: { id: true },
      })
      if (existing) {
        await prisma.placeImage.update({
          where: { id: existing.id },
          data: {
            position,
            kind: mediaKind,
            credit: raw.imageCredit ?? null,
          },
        })
      } else {
        await prisma.placeImage.create({
          data: {
            placeId: raw.id,
            url,
            position,
            kind: mediaKind,
            credit: raw.imageCredit ?? null,
          },
        })
        images += 1
      }
    }

    index += 1
  }

  // CHỈ dọn dẹp bản ghi ngoài dataset khi ở chế độ dev/test; Production tuyệt đối giữ nguyên mọi place do Admin/User tạo.
  if (mode !== "prod") {
    const datasetIds = dataset.places.map((p) => p.id)

    await prisma.dailyPick.deleteMany({
      where: { placeId: { notIn: datasetIds } },
    })
    await prisma.placeEmbedding.deleteMany({
      where: { placeId: { notIn: datasetIds } },
    })
    await prisma.affinityCache.deleteMany({
      where: { placeId: { notIn: datasetIds } },
    })
    await prisma.interactionEvent.updateMany({
      where: { placeId: { notIn: datasetIds } },
      data: { placeId: null },
    })

    const stale = await prisma.place.deleteMany({
      where: { id: { notIn: datasetIds } },
    })
    if (stale.count > 0) {
      console.info(`[seed] Dọn ${stale.count} place cũ không còn trong dataset.`)
    }
  }

  await seedCityLandmarks()

  if (mode === "dev") {
    await seedDevFixtures(places, unpublishedIds)
  }

  if (mode === "dev" || mode === "prod") {
    const pickCount = await pickDailyPicks(getPickDate())
    if (pickCount > 0) {
      console.info(`[seed] Đã khởi tạo ${pickCount} Daily Picks cho hôm nay (${getPickDate()}).`)
    }
  }

  const placeCount = await prisma.place.count()
  const imageCount = await prisma.placeImage.count()
  console.info(`[seed] Xong: ${placeCount} place, ${imageCount} ảnh (thêm mới ${images}).`)

  const seedAdminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase()
  if (seedAdminEmail) {
    const promoted = await prisma.user.updateMany({
      where: { email: seedAdminEmail, deletedAt: null },
      data: { role: "admin" },
    })
    console.info(
      `[seed] SEED_ADMIN_EMAIL=${seedAdminEmail}: cập nhật ${promoted.count} tài khoản thành admin.`,
    )
  }
}

if (import.meta.main) {
  try {
    await main()
  } catch (error) {
    console.error("[seed] Thất bại:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}
