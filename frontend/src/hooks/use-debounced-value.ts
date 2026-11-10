import { useDebounce } from "@uidotdev/usehooks"

/**
 * Trả về giá trị chỉ cập nhật sau khi người dùng ngừng thay đổi `delay` ms.
 *
 * Uỷ thác cho `useDebounce` của `@uidotdev/usehooks` (đã cài) — không tự viết
 * `setTimeout` + `useEffect`.
 */
export function useDebouncedValue<T>(value: T, delay = 400): T {
  return useDebounce(value, delay)
}
