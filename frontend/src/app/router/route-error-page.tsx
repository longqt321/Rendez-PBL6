import { isRouteErrorResponse, Link, useRouteError } from "react-router"
import { TriangleAlertIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { formatNumber } from "@/lib/format"

export function RouteErrorPage() {
  const error = useRouteError()
  const status = isRouteErrorResponse(error) ? error.status : null

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <Empty className="max-w-md">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TriangleAlertIcon />
          </EmptyMedia>
          <EmptyTitle>Đã có lỗi xảy ra</EmptyTitle>
          <EmptyDescription>
            Trang này không tải được. Thử lại hoặc quay về trang Khám phá.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          {status === null ? null : (
            <p className="text-xs text-muted-foreground">Mã lỗi: {formatNumber(status)}</p>
          )}
          <Button render={<Link to="/discover" />}>Về trang Khám phá</Button>
        </EmptyContent>
      </Empty>
    </div>
  )
}
