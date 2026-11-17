import { Navigate, useLocation } from "react-router"
import { ErrorState } from "@/components/shared/error-state"
import { PageLoading } from "@/components/shared/page-loading"
import { useMe } from "@/features/profile/hooks/use-me"
import { isUnauthorizedError } from "@/lib/axios"

export function RequireAuth({ children }: Readonly<{ children: React.ReactNode }>) {
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
