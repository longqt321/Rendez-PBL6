import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import type { DiscoverSort } from "../api/get-places"
import type { PlaceCategory } from "../types/place"

/** Loại hình hợp lệ — chặn giá trị rác từ URL do người dùng sửa tay. */
const VALID_CATEGORIES: PlaceCategory[] = [
  "cafe",
  "restaurant",
  "street-food",
  "bakery",
  "dessert",
  "bar",
]

const VALID_SORTS: DiscoverSort[] = ["newest", "rating", "distance"]

export interface DiscoverFiltersState {
  category: PlaceCategory | "all"
  /** `"all"` = không lọc quận. */
  district: string
  /** Từ khoá đã ghi vào URL (đã debounce) — dùng để gọi API. */
  query: string
  /** Giá trị ô nhập hiện tại, cập nhật ngay theo từng ký tự. */
  draftQuery: string
  setDraftQuery: (value: string) => void
  /** Mức giá tối đa — `"all"` = không lọc giá. */
  priceMax: 1 | 2 | 3 | "all"
  setPriceMax: (value: 1 | 2 | 3 | "all") => void
  /**
   * Nguồn sự thật DUY NHẤT cho sắp xếp (thiết kế mục 2.2.1). `nearby` trên URL
   * chỉ là **alias chỉ-đọc** cho link cũ — đọc vào thì map sang `distance` rồi
   * xoá khỏi URL, KHÔNG giữ state song song.
   */
  sort: DiscoverSort
  setSort: (value: DiscoverSort) => void
  /**
   * Ghi/xoá toạ độ người dùng trên URL khi `sort=distance` (làm tròn 4 chữ số
   * — cùng quy ước với query key, link chia sẻ tái tạo đúng thứ tự khoảng cách).
   */
  setCoords: (coords: { lat: number; lng: number } | null) => void
  /** Giá trị suy ra: `isNearbyActive === (sort === "distance")`. */
  isNearbyActive: boolean
  setCategory: (value: PlaceCategory | "all") => void
  setDistrict: (value: string) => void
  /** Bật/tắt "Gần đây" — cùng một đường ghi với Select "Gần tôi". */
  setIsNearbyActive: (value: boolean) => void
  /** Xoá toàn bộ bộ lọc (kể cả từ khoá, "Gần đây", giá và sort). */
  resetAll: () => void
  activeFilterCount: number
}

/**
 * Bộ lọc của màn hình khám phá, lưu trên URL
 * (`?category=&district=&q=&priceMax=&sort=`).
 *
 * Đặt trên URL thay vì state cục bộ để `/discover` và `/map` là **hai cách nhìn
 * của cùng một bộ lọc**: chuyển trang, tải lại, hay gửi link đều giữ nguyên
 * search + filter. Ô nhập giữ bản nháp riêng và chỉ ghi URL sau 300 ms — gõ
 * không làm rối lịch sử trình duyệt (cùng cách với `useSearchQuerySync`).
 */
export function useDiscoverFilters(): DiscoverFiltersState {
  const [params, setParams] = useSearchParams()

  const rawCategory = params.get("category") ?? "all"
  const category = VALID_CATEGORIES.includes(rawCategory as PlaceCategory)
    ? (rawCategory as PlaceCategory)
    : "all"
  const district = params.get("district") ?? "all"
  const query = params.get("q") ?? ""

  const rawSort = params.get("sort")
  const sort: DiscoverSort =
    rawSort && VALID_SORTS.includes(rawSort as DiscoverSort) ? (rawSort as DiscoverSort) : "newest"

  const rawPriceMax = Number(params.get("priceMax"))
  const priceMax: 1 | 2 | 3 | "all" = [1, 2, 3].includes(rawPriceMax)
    ? (rawPriceMax as 1 | 2 | 3)
    : "all"

  // Tương thích ngược: `?nearby=1` (link cũ) → `sort=distance`; `sort` thắng
  // khi cả hai cùng xuất hiện. Chuẩn hoá ngay bằng `replace` để URL sạch.
  const hasLegacyNearby = params.get("nearby") === "1"
  useEffect(() => {
    if (!hasLegacyNearby) return
    const updated = new URLSearchParams(params)
    updated.delete("nearby")
    if (!updated.get("sort")) updated.set("sort", "distance")
    setParams(updated, { replace: true })
  }, [hasLegacyNearby, params, setParams])

  const effectiveSort: DiscoverSort = sort === "newest" && hasLegacyNearby ? "distance" : sort
  const isNearbyActive = effectiveSort === "distance"

  /** Ghi nhiều khoá cùng lúc; giá trị rỗng/"all" thì xoá khỏi URL cho gọn. */
  const patch = useCallback(
    (next: Record<string, string | null>) => {
      setParams(
        (prev) => {
          const updated = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(next)) {
            if (value === null || value === "" || value === "all") updated.delete(key)
            else updated.set(key, value)
          }
          return updated
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const [draftQuery, setDraftQuery] = useState(query)
  const debouncedDraft = useDebouncedValue(draftQuery, 300)
  /** Giá trị cuối cùng hook này tự ghi — phân biệt "mình vừa ghi" với "URL đổi từ ngoài". */
  const lastWritten = useRef(query)

  // URL đổi từ bên ngoài (back/forward, link chia sẻ) → nạp lại ô nhập.
  useEffect(() => {
    if (query === lastWritten.current) return
    lastWritten.current = query
    setDraftQuery(query)
  }, [query])

  useEffect(() => {
    if (debouncedDraft !== draftQuery) return
    const trimmed = draftQuery.trim()
    if (trimmed === query) return
    lastWritten.current = trimmed
    patch({ q: trimmed })
  }, [debouncedDraft, draftQuery, query, patch])

  /**
   * Ghi sort — ĐƯỜNG GHI DUY NHẤT cho cả Select "Gần tôi" lẫn toggle "Gần
   * đây". Tắt "Gần đây" về `newest` (không nhớ sort cũ — một luật đơn giản,
   * không có state ẩn "sort cũ là gì"). Dọn luôn `nearby` nếu còn sót.
   */
  const setSort = useCallback(
    (value: DiscoverSort) => patch({ sort: value === "newest" ? null : value, nearby: null }),
    [patch],
  )

  /** Ghi toạ độ lên URL (4 chữ số); bỏ trống khi `null`. Bỏ qua nếu không đổi. */
  const setCoords = useCallback(
    (coords: { lat: number; lng: number } | null) => {
      const lat = coords ? coords.lat.toFixed(4) : null
      const lng = coords ? coords.lng.toFixed(4) : null
      if ((params.get("lat") ?? null) === lat && (params.get("lng") ?? null) === lng) return
      patch({ lat, lng })
    },
    [patch, params],
  )

  const activeFilterCount = useMemo(
    () =>
      (category === "all" ? 0 : 1) +
      (district === "all" ? 0 : 1) +
      (query.trim() ? 1 : 0) +
      (priceMax === "all" ? 0 : 1) +
      (isNearbyActive ? 1 : 0),
    [category, district, query, priceMax, isNearbyActive],
  )

  return {
    category,
    district,
    query,
    draftQuery,
    setDraftQuery,
    priceMax,
    setPriceMax: (value) => patch({ priceMax: value === "all" ? null : String(value) }),
    sort: effectiveSort,
    setSort,
    setCoords,
    isNearbyActive,
    setCategory: (value) => patch({ category: value }),
    setDistrict: (value) => patch({ district: value }),
    setIsNearbyActive: (value) => setSort(value ? "distance" : "newest"),
    resetAll: () => {
      lastWritten.current = ""
      setDraftQuery("")
      patch({
        category: null,
        district: null,
        q: null,
        priceMax: null,
        sort: null,
        nearby: null,
        lat: null,
        lng: null,
      })
    },
    activeFilterCount,
  }
}
