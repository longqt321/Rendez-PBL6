import { parseISO, subDays } from "date-fns"
import type { Place, PlaceCategory } from "@/features/places/types/place"
import coldStartDataset from "../../../data/cold-start/places.json"

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

  openingHours: string | null
}

const CATEGORY_MAP: Record<string, PlaceCategory> = {
  restaurant: "restaurant",
  bakery: "bakery",
  dessert: "dessert",
  "street-food": "street-food",
  bar: "bar",
  "bar-pub": "bar",
  cafe: "cafe",
  "banh-mi": "bakery",
  "banh-ngot": "bakery",
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
  "cho-dem": "street-food",
  banh: "bakery",
  // Các nhóm còn lại (hai-san, lau, pho, bun, com, quan-an, viet-nam, nhat,
  // thai, han, y, an-do, goi-ca, chay, banh-canh, bun-mam…) → restaurant.
}

const UNPUBLISHED_IDS = new Set(["ram-cuon-cai-di-hoa-6152681085"])

const PUBLISHED_AT = "2026-11-09T08:00:00+07:00"

const places: ColdStartPlace[] = coldStartDataset.places

export const COLD_START_PLACES: MockPlace[] = places.map((raw, index) => {
  const place: Omit<Place, "publishedAt"> = {
    id: raw.id,
    name: raw.name,
    address: raw.address ?? raw.district ?? "Đà Nẵng",
    city: "Đà Nẵng",
    district: raw.district ?? undefined,
    category: CATEGORY_MAP[raw.category] ?? "restaurant",
    tags: [],
    positiveRatio: 0,
    reviewCount: 0,
    priceLevel: 1,
    imageUrl: raw.image ? `/data/cold-start/${raw.image}` : undefined,
    imageHeight: 320,
    lat: raw.lat ?? undefined,
    lng: raw.lng ?? undefined,
    status: raw.status === "open" || raw.status === "closed" ? raw.status : "unknown",
    openingHours: raw.openingHours ?? undefined,
  }

  // Trải ngày duyệt để badge "Mới" (14 ngày) có cả quán mới lẫn cũ trong mock.
  const daysAgo = (index % 6) * 4
  const publishedAt = UNPUBLISHED_IDS.has(raw.id)
    ? null
    : subDays(parseISO(PUBLISHED_AT), daysAgo).toISOString()

  return { ...place, publishedAt }
})

/**
 * Dữ liệu địa điểm của mock server — thay cho 30 quán bịa tay trước đây.
 */
export const MOCK_PLACES: MockPlace[] = COLD_START_PLACES
