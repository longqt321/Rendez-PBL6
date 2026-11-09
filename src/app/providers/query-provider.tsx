import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { isNotFoundError } from "@/lib/axios"

/**
 * Lỗi 404 không retry: tài nguyên không tồn tại thì thử lại cũng chỉ 404 nữa.
 *
 * Trước đây mọi lỗi đều retry 3 lần (mặc định của TanStack Query) nên trang
 * "không tìm thấy" phải chờ ~7s mới hiển thị — người dùng thấy màn hình loading
 * kéo dài cho một kết luận đã chắc chắn. Lỗi khác (mạng, 5xx) vẫn retry vì có
 * thể thành công ở lần sau.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (isNotFoundError(error)) return false
        return failureCount < 3
      },
    },
  },
})

export function QueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
