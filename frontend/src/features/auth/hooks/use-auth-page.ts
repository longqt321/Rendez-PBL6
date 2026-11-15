import { useEffect } from "react"
import { useMe } from "@/features/profile/hooks/use-me"

export function useAuthPageTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} · Rendez`
  }, [title])
}

/**
 * Người ĐÃ đăng nhập không cần thấy form đăng nhập/đăng ký.
 *
 * Trả path cần điều hướng (`next` đã kiểm an toàn, mặc định `/discover`) hoặc
 * `null` khi chưa đăng nhập. `GET /me` 401 không retry (xem `query-provider`)
 * nên guest không phải chờ.
 */
export function useAuthenticatedRedirect(next?: string | null): string | null {
  const { data: me } = useMe()
  return me ? (next ?? "/discover") : null
}
