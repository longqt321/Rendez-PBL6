import type { PlaceCategory } from "@rendez/schema"
import { ActivityIcon, FlagIcon, MapPinIcon, UsersIcon } from "lucide-react"
import { ErrorState } from "@/components/shared/error-state"
import { Skeleton } from "@/components/ui/skeleton"
import { formatNumber } from "@/lib/format"
import { useAdminOverview, useAdminReports, useAuditLogs } from "../hooks/use-admin"
import { ADMIN_UI } from "../lib/admin-constants"
import { ActivityTrendChart } from "./overview/activity-trend-chart"
import { CategoryDonutChart } from "./overview/category-donut-chart"
import { DevRuntimeCard } from "./overview/dev-runtime-card"
import { OverviewRecentPanel } from "./overview/overview-recent-panel"
import { VenueQualityChart } from "./overview/venue-quality-chart"
import { useAdminRuntime } from "./shared/admin-env-store"
import { AdminKpiCard } from "./shared/admin-kpi-card"

export type AdminTabKey = "overview" | "reports" | "places" | "users" | "observability" | "logs"

interface OverviewTabProps {
  readonly onSelectTab: (tab: AdminTabKey) => void
  readonly onNavigateToPlaces?: (filters?: {
    category?: PlaceCategory
    district?: string
    visibility?: "published" | "unpublished" | "closed"
  }) => void
  readonly isAdmin?: boolean
}

export function OverviewTab({ onSelectTab, onNavigateToPlaces, isAdmin = true }: OverviewTabProps) {
  const overviewQuery = useAdminOverview()
  const pendingReportsQuery = useAdminReports({ status: "pending" })
  const recentLogsQuery = useAuditLogs({})
  const { isProd, runtime } = useAdminRuntime()

  if (overviewQuery.isPending) {
    return (
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={`admin-kpi-${index}`} className="h-32 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <Skeleton className="h-80 w-full rounded-xl xl:col-span-8" />
          <Skeleton className="h-80 w-full rounded-xl xl:col-span-4" />
        </div>
      </div>
    )
  }

  const data = overviewQuery.data
  if (overviewQuery.isError || !data) {
    return (
      <ErrorState
        variant="plain"
        title="Không tải được tổng quan"
        onRetry={() => void overviewQuery.refetch()}
      />
    )
  }

  const pendingReports =
    pendingReportsQuery.data?.pages
      .flatMap((page) => page.items)
      .slice(0, ADMIN_UI.OVERVIEW_RECENT_ITEMS_LIMIT) ?? []
  const recentLogs =
    recentLogsQuery.data?.pages
      .flatMap((page) => page.items)
      .slice(0, ADMIN_UI.OVERVIEW_RECENT_ITEMS_LIMIT) ?? []

  const cacheHitPercent = Math.round(data.cacheHitRatio * ADMIN_UI.PERCENT_SCALE)
  const publishedPercent =
    data.venues.total > 0
      ? Math.round((data.venues.published / data.venues.total) * ADMIN_UI.PERCENT_SCALE)
      : 0
  const resolvedReportsPercent =
    data.reports.total > 0
      ? Math.round(
          ((data.reports.reviewed + data.reports.dismissed) / data.reports.total) *
            ADMIN_UI.PERCENT_SCALE,
        )
      : ADMIN_UI.PERCENT_SCALE

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard
          label="Địa điểm hiển thị"
          value={formatNumber(data.venues.published)}
          icon={MapPinIcon}
          tone="success"
          badge={{ label: `${publishedPercent}%`, variant: "secondary" }}
          progress={{ value: publishedPercent, label: "Tỷ lệ địa điểm hiển thị" }}
          subtitle={`${formatNumber(data.venues.total)} tổng · ${formatNumber(data.venues.unpublished)} ẩn · ${formatNumber(data.venues.closed)} đóng cửa`}
          onClick={() => onSelectTab("places")}
          actionLabel="Mở Địa điểm"
        />

        <AdminKpiCard
          label="Báo cáo chờ duyệt"
          value={formatNumber(data.reports.pending)}
          icon={FlagIcon}
          tone={data.reports.pending > 0 ? "danger" : "success"}
          badge={{
            label: data.reports.pending > 0 ? "Cần xử lý" : "Đã xử lý hết",
            variant: data.reports.pending > 0 ? "destructive" : "secondary",
          }}
          progress={{ value: resolvedReportsPercent, label: "Tỷ lệ báo cáo đã xử lý" }}
          subtitle={`${formatNumber(data.reports.reviewed)} đã xử lý · ${formatNumber(data.reports.dismissed)} bỏ qua`}
          onClick={() => onSelectTab("reports")}
          actionLabel="Mở Báo cáo"
        />

        <AdminKpiCard
          label="Người dùng"
          value={formatNumber(data.users.total)}
          icon={UsersIcon}
          tone="default"
          badge={
            data.users.banned > 0
              ? { label: `${formatNumber(data.users.banned)} khoá`, variant: "destructive" }
              : {
                  label: `${data.users.admins + data.users.moderators} vận hành`,
                  variant: "outline",
                }
          }
          subtitle={`${formatNumber(data.users.active)} hoạt động · ${formatNumber(data.users.admins)} quản trị · ${formatNumber(data.users.moderators)} kiểm duyệt`}
          onClick={isAdmin ? () => onSelectTab("users") : undefined}
          actionLabel="Mở Người dùng"
        />

        <AdminKpiCard
          label="Tương tác 24 giờ"
          value={formatNumber(data.activity.interactionEvents24h)}
          icon={ActivityIcon}
          tone="warning"
          badge={{ label: `Cache ${cacheHitPercent}%`, variant: "outline" }}
          progress={{ value: cacheHitPercent, label: "Tỷ lệ cache hit" }}
          subtitle={`${formatNumber(data.activity.auditLogs24h)} nhật ký · TB ${formatNumber(Math.round(data.avgLatencyMs))}ms`}
          onClick={isAdmin ? () => onSelectTab("observability") : () => onSelectTab("logs")}
          actionLabel={isAdmin ? "Mở Hiệu suất" : "Mở Nhật ký"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <ActivityTrendChart trends={data.trends14d} className="xl:col-span-8" />
        <CategoryDonutChart
          categories={data.venuesByCategory}
          onSelectCategory={(category) => onNavigateToPlaces?.({ category })}
          className="xl:col-span-4"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <VenueQualityChart venues={data.venues} className="xl:col-span-5" />
        <OverviewRecentPanel
          pendingCount={data.reports.pending}
          pendingReports={pendingReports}
          recentLogs={recentLogs}
          onSelectTab={onSelectTab}
          className="xl:col-span-7"
        />
      </div>

      {!isProd ? <DevRuntimeCard runtime={runtime} uptimeMs={data.uptimeMs} /> : null}
    </div>
  )
}
