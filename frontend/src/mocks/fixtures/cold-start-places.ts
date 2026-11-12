import type { Place, PlaceCategory } from "@/features/places/types/place"
import coldStartDataset from "../../../data/cold-start/places.json"

/**
 * Adapter cold-start → bản ghi server giả.
 *
 * Nguồn: `data/cold-start/places.json` (491 địa điểm curated gốc của Đà Nẵng).
 * File này là phía SERVER — chỉ `src/mocks/` import; khi chạy với backend thật
 * thì không dùng (xem `VITE_USE_MOCKS`).
 *
 * LƯU Ý ĐỒNG BỘ: corpus thật hiện do backend seed từ
 * `backend/data/places-expanded.json` (344 POI, sinh bởi `scripts/build-corpus`).
 * Mock này CHỈ là fallback khi không có backend, nên không cần khớp 1:1 —
 * nhưng nếu demo offline thì số liệu sẽ khác backend.
 *
 * Nguyên tắc: KHÔNG bịa số liệu. Trường dataset không có thì để trung tính:
 * - `rating = 0`, `reviewCount = 0`: chưa ai đánh giá trên hệ thống.
 * - `tags = []`: dataset không có tag.
 * - `priceLevel = 1`: chưa thu thập được mức giá.
 */

/**
 * Bản ghi địa điểm phía server.
 *
 * `publishedAt` là dữ liệu nội bộ của server, KHÔNG nằm trong hợp đồng API:
 * client chỉ nhận `Place` (đã lọc sẵn) hoặc `PlaceSummary.isPublished`.
 *
 * `publishedAt: null` = chưa được duyệt lên /discover.
 */
export type MockPlace = Place & { publishedAt: string | null }

interface ColdStartPlace {
  id: string
  name: string
  category: string
  district: string | null
  address: string | null
  lat: number | null
  lng: number | null
  image: string | null
  tier: string
  status: string
  /** Giờ mở cửa thô từ OSM (dataset curated); `null` = chưa thu thập. */
  openingHours: string | null
}

/**
 * 36 loại hình của dataset → 6 nhóm của frontend.
 * Loại không có trong bảng (hiếm) rơi về `restaurant`.
 */
const CATEGORY_MAP: Record<string, PlaceCategory> = {
  cafe: "cafe",
  "banh-mi": "bakery",
  "banh-ngot": "bakery",
  che: "dessert",
  "kem-bo": "dessert",
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
  banh: "bakery",
  // Các nhóm còn lại (hai-san, lau, pho, bun, com, quan-an, viet-nam, nhat,
  // thai, han, y, an, goi-ca, chay, banh-canh, bun-mam, khac…) → restaurant.
}

/** Địa điểm chưa duyệt lên /discover — giữ 1 mục để demo trạng thái `isPublished: false`. */
const UNPUBLISHED_IDS = new Set(["ram-cuon-cai-di-hoa-6152681085"])

/** Ngày duyệt mặc định cho dữ liệu cold-start (mock server, không thuộc dataset). */
const PUBLISHED_AT = "2026-11-09T08:00:00+07:00"

const places: ColdStartPlace[] = coldStartDataset.places

export const COLD_START_PLACES: MockPlace[] = places.map((raw) => {
  const place: Place = {
    id: raw.id,
    name: raw.name,
    address: raw.address ?? raw.district ?? "Đà Nẵng",
    city: "Đà Nẵng",
    district: raw.district ?? undefined,
    category: CATEGORY_MAP[raw.category] ?? "restaurant",
    tags: [],
    rating: 0,
    reviewCount: 0,
    priceLevel: 1,
    imageUrl: raw.image ? `/data/cold-start/${raw.image}` : undefined,
    imageHeight: 320,
    lat: raw.lat ?? undefined,
    lng: raw.lng ?? undefined,
    status: raw.status === "open" || raw.status === "closed" ? raw.status : "unknown",
    openingHours: raw.openingHours ?? undefined,
  }

  return { ...place, publishedAt: UNPUBLISHED_IDS.has(raw.id) ? null : PUBLISHED_AT }
})

/**
 * Dữ liệu địa điểm của mock server — thay cho 30 quán bịa tay trước đây.
 */
export const MOCK_PLACES: MockPlace[] = COLD_START_PLACES
