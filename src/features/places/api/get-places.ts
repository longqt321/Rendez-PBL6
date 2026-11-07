import type { Place, PlaceCategory } from "../types/place"
import { MOCK_PLACES } from "./mock-places"

export interface DiscoverFilters {
  category: PlaceCategory | "all"
  query: string
}

export interface DiscoverPage {
  items: Place[]
  nextCursor: string | null
}

const PAGE_SIZE = 9

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
}

export function filterPlaces(places: Place[], filters: DiscoverFilters): Place[] {
  const q = normalize(filters.query.trim())
  return places.filter((place) => {
    if (filters.category !== "all" && place.category !== filters.category) return false
    if (!q) return true
    const haystack = normalize([place.name, place.address, place.city, ...place.tags].join(" "))
    return haystack.includes(q)
  })
}

/**
 * Mô phỏng endpoint phân trang cursor.
 *
 * `publishedIds` do store cung cấp — chỉ địa điểm đã được thuật toán đưa lên
 * /discover mới nằm trong danh sách này. Cursor là offset dạng chuỗi; khi có
 * backend thật thì thay bằng giá trị `next` do server trả về.
 */
export async function getDiscoverPage(
  filters: DiscoverFilters,
  publishedIds: string[],
  cursor: string | null,
  signal?: AbortSignal,
): Promise<DiscoverPage> {
  // Giả lập độ trễ mạng để thấy skeleton và trạng thái loading của infinite scroll.
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, 420)
    signal?.addEventListener("abort", () => {
      clearTimeout(timer)
      reject(new DOMException("Aborted", "AbortError"))
    })
  })

  const published = new Set(publishedIds)
  const source = MOCK_PLACES.filter((place) => published.has(place.id))
  const matched = filterPlaces(source, filters)

  const offset = cursor === null ? 0 : Number(cursor)
  const items = matched.slice(offset, offset + PAGE_SIZE)
  const nextOffset = offset + items.length

  return {
    items,
    nextCursor: nextOffset < matched.length ? String(nextOffset) : null,
  }
}

export const DISCOVER_PAGE_SIZE = PAGE_SIZE
