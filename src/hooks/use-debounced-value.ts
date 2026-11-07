import { useEffect, useState } from "react"

/**
 * Trả về giá trị chỉ cập nhật sau khi người dùng ngừng thay đổi `delay` ms.
 *
 * Dùng để tránh gọi API theo từng ký tự khi người dùng đang gõ.
 */
export function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
