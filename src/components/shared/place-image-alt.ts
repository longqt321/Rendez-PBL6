import { categoryLabel } from "@/features/places/lib/category-meta"
import type { PlaceCategory } from "@/features/places/types/place"

/** Alt chuẩn cho ảnh địa điểm — ảnh thật hay minh hoạ đều nói rõ nguồn. */
export function placeImageAlt(place: { name: string; category: PlaceCategory; imageUrl?: string }) {
  return place.imageUrl
    ? `Ảnh ${place.name}`
    : `Ảnh minh hoạ ${categoryLabel(place.category)} — chưa có ảnh thật của ${place.name}`
}
