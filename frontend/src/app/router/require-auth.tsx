import { Navigate, useLocation } from "react-router"
import { ErrorState } from "@/components/shared/error-state"
import { PageLoading } from "@/components/shared/page-loading"
import { useMe } from "@/features/profile/hooks/use-me"
import { isUnauthorizedError } from "@/lib/axios"

/**
 * Chặn route cần đăng nhập (`/profile`, `/settings`).
 *
 * Trước đây guest vào hai trang này thấy "Không tải được hồ sơ — kiểm tra kết
 * nối": lỗi 401 bị trang coi như lỗi mạng. Nay 401 (hoặc chưa có phiên) được
 * hiểu đúng bản chất → chuyển về `/login?next=<path hiện tại>` để đăng nhập
 * xong quay lại đúng chỗ.
 *
 * `next` luôn là path tương đối bắt đầu bằng `/` (chống open redirect: không
 * nhận `//host`, `http://…`); trang đăng nhập chỉ chấp nhận giá trị đó.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { data: me, isPending, isError, error, refetch } = useMe()
  const location = useLocation()

  if (isPending) return <PageLoading />

  if (isError) {
    if (isUnauthorizedError(error)) {
      const next = `${location.pathname}${location.search}`
      return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
    }
    // Lỗi khác 401 (mạng/5xx): phiên có thể vẫn còn — cho thử lại thay vì đá ra
    // trang đăng nhập như thể đã mất phiên.
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <ErrorState title="Không tải được hồ sơ" onRetry={() => void refetch()} />
      </div>
    )
  }

  if (!me) return <PageLoading />

  return <>{children}</>
}
