import { ArrowRightIcon, FlagIcon, MapPinIcon, ScrollTextIcon, UsersIcon } from "lucide-react"
import { ErrorState } from "@/components/shared/error-state"
import { SectionHeading } from "@/components/shared/section-heading"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"
import { Skeleton } from "@/components/ui/skeleton"
import { REPORT_REASON_META } from "@/features/places/lib/report-meta"
import { formatNumber, formatRelativeTime } from "@/lib/format"
import { useAdminOverview, useAdminReports, useAuditLogs } from "../hooks/use-admin"

export type AdminTabKey = "overview" | "reports" | "places" | "users" | "logs"

interface OverviewTabProps {
  readonly onSelectTab: (tab: AdminTabKey) => void
}

export function OverviewTab({ onSelectTab }: OverviewTabProps) {
  const overviewQuery = useAdminOverview()
  const pendingReportsQuery = useAdminReports({ status: "pending" })
  const recentLogsQuery = useAuditLogs({})

  if (overviewQuery.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={`admin-kpi-${index}`} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (overviewQuery.isError || !overviewQuery.data) {
    return (
      <ErrorState
        variant="plain"
        title="Không tải được tổng quan quản trị"
        onRetry={() => void overviewQuery.refetch()}
      />
    )
  }

  const data = overviewQuery.data
  const pendingReports =
    pendingReportsQuery.data?.pages.flatMap((page) => page.items).slice(0, 5) ?? []
  const recentLogs = recentLogsQuery.data?.pages.flatMap((page) => page.items).slice(0, 5) ?? []
  const cacheHitPercent = Math.round(data.cacheHitRatio * 100)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <MapPinIcon className="size-4 text-primary" aria-hidden="true" />
              Địa điểm đang hiển thị
            </CardDescription>
            <CardTitle className="font-display text-3xl tabular-nums">
              {formatNumber(data.venues.published)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Tổng {formatNumber(data.venues.total)} quán · {formatNumber(data.venues.unpublished)}{" "}
            đang ẩn · {formatNumber(data.venues.closed)} đóng cửa
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <FlagIcon className="size-4 text-primary" aria-hidden="true" />
              Báo cáo chờ xử lý
            </CardDescription>
            <CardTitle className="font-display text-3xl tabular-nums">
              {formatNumber(data.reports.pending)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Đã xử lý {formatNumber(data.reports.reviewed)} · Bỏ qua{" "}
            {formatNumber(data.reports.dismissed)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <UsersIcon className="size-4 text-primary" aria-hidden="true" />
              Người dùng
            </CardDescription>
            <CardTitle className="font-display text-3xl tabular-nums">
              {formatNumber(data.users.total)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Hoạt động {formatNumber(data.users.active)} · Đang khoá{" "}
            {formatNumber(data.users.banned)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <ScrollTextIcon className="size-4 text-primary" aria-hidden="true" />
              Hoạt động 24 giờ
            </CardDescription>
            <CardTitle className="font-display text-3xl tabular-nums">
              {formatNumber(data.activity.interactionEvents24h)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {formatNumber(data.activity.auditLogs24h)} nhật ký quản trị · Cache hit{" "}
            {cacheHitPercent}%
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <SectionHeading>Báo cáo mới nhất</SectionHeading>
              <CardDescription>Các phản ánh đang chờ kiểm duyệt viên xem xét.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onSelectTab("reports")}>
              Xem tất cả
              <ArrowRightIcon className="size-3.5" aria-hidden="true" />
            </Button>
          </CardHeader>
          <CardContent>
            {pendingReports.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Không có báo cáo nào đang chờ.</p>
            ) : (
              <ItemGroup className="gap-2">
                {pendingReports.map((report) => (
                  <Item key={report.id} variant="outline" size="sm">
                    <ItemContent>
                      <ItemTitle className="text-sm font-medium">{report.placeName}</ItemTitle>
                      <ItemDescription className="text-xs">
                        @{report.reporterHandle} · {REPORT_REASON_META[report.reason].label} ·{" "}
                        {formatRelativeTime(report.createdAt)}
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <Badge variant="outline">Chờ xử lý</Badge>
                    </ItemActions>
                  </Item>
                ))}
              </ItemGroup>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <SectionHeading>Nhật ký gần đây</SectionHeading>
              <CardDescription>Thay đổi quản trị và sự kiện bảo mật mới ghi nhận.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onSelectTab("logs")}>
              Xem tất cả
              <ArrowRightIcon className="size-3.5" aria-hidden="true" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Chưa có nhật ký hoạt động nào.</p>
            ) : (
              <ItemGroup className="gap-2">
                {recentLogs.map((entry) => (
                  <Item key={entry.id} variant="outline" size="sm">
                    <ItemContent>
                      <ItemTitle className="text-sm font-medium">{entry.action}</ItemTitle>
                      <ItemDescription className="text-xs">
                        {entry.actor ? `@${entry.actor.handle}` : "Hệ thống"} · {entry.entity}
                        {entry.entityId ? ` (${entry.entityId})` : ""} ·{" "}
                        {formatRelativeTime(entry.createdAt)}
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <Badge variant="secondary">{entry.entity}</Badge>
                    </ItemActions>
                  </Item>
                ))}
              </ItemGroup>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
