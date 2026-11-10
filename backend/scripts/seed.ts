/**
 * Seed idempotent: import `frontend/data/cold-start/places.json` (491 place thật).
 *
 * Nguyên tắc (D-049, K4): KHÔNG bịa số liệu.
 * - `rating`/`reviewCount` không lưu cột — tính bằng COUNT/AVG (D3).
 * - `tags = []`, `priceLevel = 1`: dataset không có dữ liệu này.
 * - Posts/comments/reviews/collections để rỗng.
 *
 * Chạy: `bun run db:seed` (hoặc tự động sau `prisma migrate dev` qua prisma.config.ts).
 */
import { join } from "node:path";
import type { PlaceCategory, PlaceStatus } from "@rendez/schema";
import type { PlaceCategory as PrismaPlaceCategory } from "../generated/prisma/enums";
import { prisma } from "../src/lib/prisma";

interface ColdStartPlace {
  id: string;
  name: string;
  category: string;
  district: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  openingHours: string | null;
  description: string | null;
  sources: string[];
  geoSource: string | null;
  geoPrecision: string | null;
  osmId: string | null;
  image: string | null;
  imageCredit?: string;
  imageKind: string | null;
  imageNote: string | null;
  images: string[];
  venuePageUrl: string | null;
  verified: boolean;
  collectedAt: string | null;
  tier: string | null;
  status: string;
}

interface ColdStartDataset {
  meta: { count: number };
  places: ColdStartPlace[];
}

/**
 * 36 loại hình của dataset → 6 nhóm của frontend.
 * Giữ ĐÚNG bảng map của `frontend/src/mocks/fixtures/cold-start-places.ts`
 * để seed và mock cho cùng kết quả.
 */
const CATEGORY_MAP: Record<string, PlaceCategory> = {
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
};

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
};

/** Địa điểm chưa duyệt — giữ đúng 1 mục như mock để demo `isPublished: false`. */
const UNPUBLISHED_IDS = new Set(["ram-cuon-cai-di-hoa-6152681085"]);

/** Ngày duyệt mặc định cho dữ liệu cold-start (mock server, không thuộc dataset). */
const PUBLISHED_AT = new Date("2026-11-09T08:00:00+07:00");

const DATASET_PATH = join(
  import.meta.dir,
  "../../frontend/data/cold-start/places.json",
);

function toStatus(raw: string): PlaceStatus {
  return raw === "open" || raw === "closed" ? raw : "unknown";
}

function toDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function main(): Promise<void> {
  const file = Bun.file(DATASET_PATH);
  if (!(await file.exists())) {
    throw new Error(`Không tìm thấy dataset: ${DATASET_PATH}`);
  }

  const dataset = (await file.json()) as ColdStartDataset;
  console.info(`[seed] Đọc ${dataset.places.length} place từ ${DATASET_PATH}`);

  let images = 0;

  for (const raw of dataset.places) {
    const publishedAt = UNPUBLISHED_IDS.has(raw.id) ? null : PUBLISHED_AT;
    const data = {
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
    };

    await prisma.place.upsert({
      where: { id: raw.id },
      create: { id: raw.id, ...data },
      update: data,
    });

    // Ảnh: dataset có `images[]`; giữ thứ tự, idempotent theo (place, url).
    const urls =
      raw.images.length > 0 ? raw.images : raw.image ? [raw.image] : [];
    for (const [position, path] of urls.entries()) {
      const url = `/data/cold-start/${path}`;
      const existing = await prisma.placeImage.findFirst({
        where: { placeId: raw.id, url },
        select: { id: true },
      });
      if (existing) {
        await prisma.placeImage.update({
          where: { id: existing.id },
          data: {
            position,
            kind: raw.imageKind,
            credit: raw.imageCredit ?? null,
          },
        });
      } else {
        await prisma.placeImage.create({
          data: {
            placeId: raw.id,
            url,
            position,
            kind: raw.imageKind,
            credit: raw.imageCredit ?? null,
          },
        });
        images += 1;
      }
    }
  }

  const placeCount = await prisma.place.count();
  const imageCount = await prisma.placeImage.count();
  console.info(
    `[seed] Xong: ${placeCount} place, ${imageCount} ảnh (thêm mới ${images}).`,
  );
}

try {
  await main();
} catch (error) {
  console.error("[seed] Thất bại:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
