import { useDebounce } from "@uidotdev/usehooks"

export function useDebouncedValue<T>(value: T, delay = 400): T {
  return useDebounce(value, delay)
}
