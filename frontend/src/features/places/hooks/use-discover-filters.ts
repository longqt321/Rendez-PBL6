import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
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

export interface DiscoverFiltersState {
  category: PlaceCategory | "all"
  /** `"all"` = không lọc quận. */
  district: string
  /** Từ khoá đã ghi vào URL (đã debounce) — dùng để gọi API. */
  query: string
  /** Giá trị ô nhập hiện tại, cập nhật ngay theo từng ký tự. */
  draftQuery: string
  setDraftQuery: (value: string) => void
  isNearbyActive: boolean
  setCategory: (value: PlaceCategory | "all") => void
  setDistrict: (value: string) => void
  setIsNearbyActive: (value: boolean) => void
  /** Xoá toàn bộ bộ lọc (kể cả từ khoá và "Gần đây"). */
  resetAll: () => void
  activeFilterCount: number
}

/**
 * Bộ lọc của màn hình khám phá, lưu trên URL (`?category=&district=&q=&nearby=1`).
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
  const isNearbyActive = params.get("nearby") === "1"

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

  const activeFilterCount = useMemo(
    () =>
      (category === "all" ? 0 : 1) +
      (district === "all" ? 0 : 1) +
      (query.trim() ? 1 : 0) +
      (isNearbyActive ? 1 : 0),
    [category, district, query, isNearbyActive],
  )

  return {
    category,
    district,
    query,
    draftQuery,
    setDraftQuery,
    isNearbyActive,
    setCategory: (value) => patch({ category: value }),
    setDistrict: (value) => patch({ district: value }),
    setIsNearbyActive: (value) => patch({ nearby: value ? "1" : null }),
    resetAll: () => {
      lastWritten.current = ""
      setDraftQuery("")
      patch({ category: null, district: null, q: null, nearby: null })
    },
    activeFilterCount,
  }
}
