import { useQuery } from "@tanstack/react-query"
import { getMe } from "../api/get-me"

/** Hồ sơ người dùng đang đăng nhập. */
export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: getMe })
}
