import { useMemo, useState } from "react"
import { useDebounce } from "@uidotdev/usehooks"
import {
  ActivityIcon,
  AlertTriangleIcon,
  ClockIcon,
  GaugeIcon,
  RefreshCwIcon,
  SearchIcon,
} from "lucide-react"
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs"
import { ErrorState } from "@/components/shared/error-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ObservabilityEventItem, ObservabilityEventKind } from "../api/admin-api"
import { useAdminObservability } from "../hooks/use-admin"
import { ADMIN_UI, describeApiRoute, formatUptime } from "../lib/admin-constants"
import { EventInspectorSheet } from "./observability/event-inspector-sheet"
import {
  BehaviorChart,
  EndpointLatencyChart,
  TimingWaterfallChart,
} from "./observability/observability-charts"
import {
  ENDPOINT_COLUMNS,
  EVENT_COLUMNS,
  type EndpointMetricRow,
} from "./observability/observability-columns"
import { SystemHealthBanner } from "./observability/system-health-banner"
import { WebVitalsCard } from "./observability/web-vitals-card"
import { AdminDataTable } from "./shared/admin-data-table"
import { AdminKpiCard } from "./shared/admin-kpi-card"

const OBS_KINDS = ["all", "slow_request", "server_error", "client_error", "web_vital"] as const

const KIND_FILTERS: { value: ObservabilityEventKind; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "slow_request", label: "Phản hồi chậm" },
  { value: "server_error", label: "Lỗi máy chủ" },
  { value: "client_error", label: "Lỗi trình duyệt" },
  { value: "web_vital", label: "Trải nghiệm trang" },
]

export function ObservabilityTab() {
  const [kind, setKind] = useQueryState(
    "obsKind",
    parseAsStringLiteral(OBS_KINDS).withDefault("all").withOptions({ history: "replace" }),
  )
  const [searchText, setSearchText] = useQueryState(
    "obsQ",
    parseAsString.withDefault("").withOptions({ history: "replace" }),
  )
  const debouncedQ = useDebounce(searchText, ADMIN_UI.DEBOUNCE_FAST_MS)
  const [selectedEvent, setSelectedEvent] = useState<ObservabilityEventItem | null>(null)

  const query = useAdminObservability({ kind, q: debouncedQ })
  const data = query.data

  const endpointRows = useMemo<EndpointMetricRow[]>(
    () =>
      (data?.latency.byEndpoint ?? []).map((ep) => ({
        ...ep,
        featureLabel: describeApiRoute(ep.route),
        cacheHitPct:
          ep.count > 0 ? Math.round((ep.cacheHits / ep.count) * ADMIN_UI.PERCENT_SCALE) : 0,
      })),
    [data?.latency.byEndpoint],
  )

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={`obs-skel-${idx}`} className="h-32 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    )
  }

  if (query.isError || !data) {
    return (
      <ErrorState
        variant="plain"
        title="Không tải được dữ liệu hiệu suất"
        onRetry={() => void query.refetch()}
      />
    )
  }

  const { latency, webVitals, behavior24h, summary, events } = data
  const cacheHitPercent = Math.round(latency.cacheHitRatio * ADMIN_UI.PERCENT_SCALE)
  const totalRumSamples = webVitals.reduce((sum, item) => sum + item.samples, 0)
  const slowEndpointCount = endpointRows.filter(
    (ep) => ep.p95Ms >= ADMIN_UI.OBSERVABILITY_SLOW_P95_MS,
  ).length

  return (
    <div className="flex flex-col gap-5">
      {/* Vùng 1: Thanh trạng thái tổng thể (Quy tắc 3 giây) */}
      <SystemHealthBanner data={data} />

      {/* Vùng 2: 4 thẻ chỉ số cốt lõi */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard
          label="Tốc độ phản hồi"
          value={`${formatNumber(latency.p95LatencyMs)} ms`}
          icon={GaugeIcon}
          tone={
            latency.p95LatencyMs >= ADMIN_UI.OBSERVABILITY_SLOW_P95_MS
              ? "danger"
              : latency.p95LatencyMs >= ADMIN_UI.OBSERVABILITY_WARN_P95_MS
                ? "warning"
                : "success"
          }
          badge={{
            label:
              latency.p95LatencyMs >= ADMIN_UI.OBSERVABILITY_SLOW_P95_MS
                ? "Chậm"
                : latency.p95LatencyMs >= ADMIN_UI.OBSERVABILITY_WARN_P95_MS
                  ? "Hơi chậm"
                  : "Nhanh",
            variant:
              latency.p95LatencyMs >= ADMIN_UI.OBSERVABILITY_SLOW_P95_MS
                ? "destructive"
                : "secondary",
          }}
          subtitle={`95% lượt tải xong dưới mức này · TB ${formatNumber(latency.avgLatencyMs)}ms`}
        />

        <AdminKpiCard
          label="Dùng bộ nhớ đệm"
          value={`${cacheHitPercent}%`}
          icon={ActivityIcon}
          progress={{ value: cacheHitPercent, label: "Tỷ lệ dùng bộ nhớ đệm" }}
          subtitle={`Giảm tải cho máy chủ · ${formatNumber(latency.totalQueries)} lượt gọi`}
        />

        <AdminKpiCard
          label="Sự cố & Phản hồi chậm"
          value={`${formatNumber(summary.errorCount)} / ${formatNumber(summary.slowCount)}`}
          icon={AlertTriangleIcon}
          tone={summary.errorCount > 0 ? "danger" : summary.slowCount > 0 ? "warning" : "success"}
          subtitle={`${formatNumber(summary.errorCount)} lỗi · ${formatNumber(summary.slowCount)} chậm · ${slowEndpointCount} tuyến chậm`}
        />

        <AdminKpiCard
          label="Thời gian hoạt động"
          value={formatUptime(latency.uptimeMs)}
          icon={ClockIcon}
          badge={{
            label: `${formatNumber(totalRumSamples)} lượt đo thiết bị`,
            variant: "secondary",
          }}
          subtitle="Tính từ lần khởi động gần nhất"
        />
      </div>

      {/* Vùng 3: Chẩn đoán điểm nghẽn (Chức năng chậm & Bước xử lý chậm) */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <EndpointLatencyChart endpoints={latency.byEndpoint} className="xl:col-span-7" />
        <TimingWaterfallChart events={events} className="xl:col-span-5" />
      </div>

      {/* Vùng 4: Trải nghiệm người dùng & Hoạt động 24 giờ */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <WebVitalsCard webVitals={webVitals} className="xl:col-span-6" />
        <BehaviorChart behavior24h={behavior24h} className="xl:col-span-6" />
      </div>

      {/* Vùng 5: Bảng tra cứu chi tiết theo chức năng và nhật ký sự cố */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tốc độ theo từng chức năng / API</CardTitle>
          <CardDescription>Bấm tiêu đề cột để sắp xếp theo mức chậm hoặc lượt dùng</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminDataTable
            columns={ENDPOINT_COLUMNS}
            data={endpointRows}
            getRowId={(row) => row.route}
            initialSorting={[{ id: "p95Ms", desc: true }]}
            ariaLabel="Bảng tốc độ theo chức năng"
            emptyState={
              <CardDescription className="py-6 text-center">Chưa có lượt gọi nào.</CardDescription>
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle className="text-base">Nhật ký sự cố &amp; phản hồi chậm</CardTitle>
            <CardDescription>Bấm vào từng dòng để xem chi tiết bước xử lý chậm</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCwIcon
              className={cn("size-3.5", query.isFetching && "animate-spin")}
              aria-hidden="true"
            />
            Làm mới
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-full sm:w-72">
              <InputGroup>
                <InputGroupAddon>
                  <SearchIcon />
                </InputGroupAddon>
                <InputGroupInput
                  type="search"
                  value={searchText}
                  onChange={(e) => void setSearchText(e.target.value || null)}
                  placeholder="Tìm chức năng, API hoặc mã lỗi…"
                  aria-label="Tìm kiếm sự kiện hiệu suất"
                />
              </InputGroup>
            </div>
            <ToggleGroup
              value={[kind]}
              onValueChange={(next) => {
                const selected = next[0] as ObservabilityEventKind | undefined
                if (selected) void setKind(selected)
              }}
              variant="outline"
              size="sm"
              aria-label="Lọc loại sự kiện"
            >
              {KIND_FILTERS.map((item) => (
                <ToggleGroupItem
                  key={item.value}
                  value={item.value}
                  className="min-h-9 px-3 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground sm:min-h-8"
                >
                  {item.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <AdminDataTable
            columns={EVENT_COLUMNS}
            data={events}
            getRowId={(row) => row.id}
            onRowClick={setSelectedEvent}
            ariaLabel="Bảng nhật ký sự cố và phản hồi chậm"
            emptyState={
              <Empty className="border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ActivityIcon />
                  </EmptyMedia>
                  <EmptyTitle>Chưa có sự cố hay phản hồi chậm</EmptyTitle>
                  <EmptyDescription>
                    Hệ thống đang vận hành trơn tru trong khoảng thời gian gần đây.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            }
          />
        </CardContent>
      </Card>

      <EventInspectorSheet
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onFilterTrace={(traceId) => {
          void setSearchText(traceId || null)
          void setKind("all")
        }}
      />
    </div>
  )
}
