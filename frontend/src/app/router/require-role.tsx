import { ShieldAlertIcon } from "lucide-react"
import { Link, Navigate, useLocation } from "react-router"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { ErrorState } from "@/components/shared/error-state"
import { PageLoading } from "@/components/shared/page-loading"
import type { UserRole } from "@rendez/schema"
import { useMe } from "@/features/profile/hooks/use-me"
import { isUnauthorizedError } from "@/lib/axios"

interface RequireRoleProps {
  readonly roles: readonly UserRole[]
  readonly children: React.ReactNode
}

export function RequireRole({ roles, children }: RequireRoleProps) {
  const { data: me, isPending, isError, error, refetch } = useMe()
  const location = useLocation()

  if (isPending) return <PageLoading />

  if (isError) {
    if (isUnauthorizedError(error)) {
      const next = `${location.pathname}${location.search}`
      return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
    }
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <ErrorState title="Không tải được quyền truy cập" onRetry={() => void refetch()} />
      </div>
    )
  }

  if (!me) return <PageLoading />

  if (!me.role || !roles.includes(me.role)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20">
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShieldAlertIcon />
            </EmptyMedia>
            <EmptyTitle>Không có quyền truy cập</EmptyTitle>
            <EmptyDescription>
              Khu vực này chỉ dành cho quản trị viên hoặc kiểm duyệt viên.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button nativeButton={false} render={<Link to="/discover" />}>
              Về trang Khám phá
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    )
  }

  return <>{children}</>
}
