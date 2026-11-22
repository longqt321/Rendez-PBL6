import { useMemo, useState } from "react"
import type { AdminReport, AdminReportStatus } from "@rendez/schema"
import { ExternalLinkIcon, FlagIcon } from "lucide-react"
import { parseAsStringLiteral, useQueryState } from "nuqs"
import { Link } from "react-router"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { REPORT_REASON_META } from "@/features/places/lib/report-meta"
import { formatNumber, formatRelativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { AdminReportStatusFilter } from "../api/admin-api"
import { useAdminOverview, useAdminReports } from "../hooks/use-admin"
import { resolveReportSlaUrgency } from "../lib/admin-constants"
import { ReportResolutionSheet } from "./reports/report-resolution-sheet"
import { ReportsCharts } from "./reports/reports-charts"
import { AdminDataTable, type AdminColumnDef } from "./shared/admin-data-table"

const REPORT_STATUS_VALUES = ["pending", "reviewed", "dismissed", "all"] as const

const REPORT_STATUS_LABELS: Record<AdminReportStatus, string> = {
  pending: "Chờ xử lý",
  reviewed: "Đã xử lý",
  dismissed: "Bỏ qua",
}

const REPORT_STATUS_FILTERS: { value: AdminReportStatusFilter; label: string }[] = [
  { value: "pending", label: "Chờ xử lý" },
  { value: "reviewed", label: "Đã xử lý" },
  { value: "dismissed", label: "Bỏ qua" },
  { value: "all", label: "Tất cả" },
]

export function ReportsTab() {
  const [status, setStatus] = useQueryState(
    "rStatus",
    parseAsStringLiteral(REPORT_STATUS_VALUES)
      .withDefault("pending")
      .withOptions({ history: "replace" }),
  )
  const [editing, setEditing] = useState<AdminReport | null>(null)
  const overviewQuery = useAdminOverview()
  const reportsQuery = useAdminReports({ status })

  const reports = useMemo(
    () => reportsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [reportsQuery.data],
  )

  const columns = useMemo<AdminColumnDef<AdminReport>[]>(
    () => [
      {
        accessorKey: "placeName",
        header: "Địa điểm",
        cell: ({ row }) => {
          const item = row.original
          return (
            <div className="max-w-56 space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-medium text-foreground">{item.placeName}</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="size-6 shrink-0"
                  aria-label={`Mở ${item.placeName}`}
                  onClick={(event) => event.stopPropagation()}
                  render={
                    <Link
                      to={`/discover/${item.placeId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                >
                  <ExternalLinkIcon className="size-3" aria-hidden="true" />
                </Button>
              </div>
              {!item.placePublished || item.placeStatus === "closed" ? (
                <span className="block text-[11px] text-muted-foreground">
                  {!item.placePublished ? "Đang ẩn" : ""}
                  {!item.placePublished && item.placeStatus === "closed" ? " · " : ""}
                  {item.placeStatus === "closed" ? "Đóng cửa" : ""}
                </span>
              ) : null}
            </div>
          )
        },
      },
      {
        accessorKey: "reason",
        header: "Lý do",
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs">
            {REPORT_REASON_META[row.original.reason].label}
          </Badge>
        ),
      },
      {
        accessorKey: "reporterHandle",
        header: "Người báo cáo",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">@{row.original.reporterHandle}</span>
        ),
      },
      {
        accessorKey: "detail",
        header: "Nội dung",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="block max-w-60 truncate text-xs text-muted-foreground">
            {row.original.detail ?? "-"}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Thời gian",
        cell: ({ row }) => {
          const urgency = resolveReportSlaUrgency(row.original.status, row.original.createdAt)
          return (
            <span
              className={cn(
                "text-xs whitespace-nowrap tabular-nums",
                urgency === "critical" && "font-semibold text-destructive",
                urgency === "warning" && "font-semibold text-star",
                urgency === "normal" && "text-muted-foreground",
              )}
            >
              {formatRelativeTime(row.original.createdAt)}
            </span>
          )
        },
      },
      {
        accessorKey: "status",
        header: "Trạng thái",
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.status === "pending"
                ? "destructive"
                : row.original.status === "reviewed"
                  ? "secondary"
                  : "outline"
            }
          >
            {REPORT_STATUS_LABELS[row.original.status]}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "Thao tác",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={(event) => {
              event.stopPropagation()
              setEditing(row.original)
            }}
          >
            Xử lý
          </Button>
        ),
      },
    ],
    [],
  )

  return (
    <div className="flex flex-col gap-5">
      <ReportsCharts overview={overviewQuery.data} />

      <AdminDataTable
        columns={columns}
        data={reports}
        getRowId={(row) => row.id}
        isPending={reportsQuery.isPending}
        isError={reportsQuery.isError}
        errorTitle="Không tải được báo cáo"
        onRetry={() => void reportsQuery.refetch()}
        onRowClick={setEditing}
        enableColumnToggle
        ariaLabel="Bảng báo cáo"
        toolbarExtra={
          <ToggleGroup
            value={[status]}
            onValueChange={(next) => {
              const selected = next[0] as AdminReportStatusFilter | undefined
              if (selected) void setStatus(selected)
            }}
            variant="outline"
            size="sm"
            aria-label="Lọc trạng thái báo cáo"
          >
            {REPORT_STATUS_FILTERS.map((item) => {
              const count =
                item.value === "pending"
                  ? overviewQuery.data?.reports.pending
                  : item.value === "reviewed"
                    ? overviewQuery.data?.reports.reviewed
                    : item.value === "dismissed"
                      ? overviewQuery.data?.reports.dismissed
                      : overviewQuery.data?.reports.total
              return (
                <ToggleGroupItem
                  key={item.value}
                  value={item.value}
                  className="min-h-9 gap-1.5 px-3 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground sm:min-h-8"
                >
                  {item.label}
                  {count !== undefined ? (
                    <span className="font-mono text-[11px] tabular-nums opacity-80">
                      ({formatNumber(count)})
                    </span>
                  ) : null}
                </ToggleGroupItem>
              )
            })}
          </ToggleGroup>
        }
        emptyState={
          <Empty className="border border-dashed border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FlagIcon />
              </EmptyMedia>
              <EmptyTitle>Không có báo cáo</EmptyTitle>
              <EmptyDescription>Chưa có phản ánh thuộc trạng thái đang chọn.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
        pagination={{
          hasNextPage: reportsQuery.hasNextPage,
          isFetchingNextPage: reportsQuery.isFetchingNextPage,
          onLoadMore: () => void reportsQuery.fetchNextPage(),
          loadingLabel: "Đang tải thêm",
          endMessage: "Đã hiển thị hết danh sách.",
        }}
      />

      <ReportResolutionSheet
        key={editing?.id ?? "none"}
        report={editing}
        onClose={() => setEditing(null)}
      />
    </div>
  )
}
