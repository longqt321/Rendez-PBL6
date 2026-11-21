import { useState } from "react"
import { useDebounce } from "@uidotdev/usehooks"
import {
  ActivityIcon,
  AlertTriangleIcon,
  CopyIcon,
  DatabaseIcon,
  GaugeIcon,
  RefreshCwIcon,
  SearchIcon,
} from "lucide-react"
import { toast } from "sonner"
import { ErrorState } from "@/components/shared/error-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatNumber, formatRelativeTime } from "@/lib/format"
import type { ObservabilityEventKind } from "../api/admin-api"
import { useAdminObservability } from "../hooks/use-admin"

const KIND_FILTERS: { value: ObservabilityEventKind; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "slow_request", label: "Request chậm" },
  { value: "server_error", label: "Lỗi Server" },
  { value: "client_error", label: "Lỗi Client" },
  { value: "web_vital", label: "Web Vitals" },
]

function kindBadge(kind: Exclude<ObservabilityEventKind, "all">) {
  switch (kind) {
    case "server_error":
      return <Badge variant="destructive">5xx Server</Badge>
    case "client_error":
      return <Badge variant="destructive">Client Error</Badge>
    case "slow_request":
      return <Badge variant="secondary">Slow &gt;500ms</Badge>
    case "web_vital":
      return <Badge variant="outline">Web Vital</Badge>
  }
}

export function ObservabilityTab() {
  const [kind, setKind] = useState<ObservabilityEventKind>("all")
  const [searchText, setSearchText] = useState("")
  const debouncedQ = useDebounce(searchText, 250)

  const query = useAdminObservability({ kind, q: debouncedQ })

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={`obs-skel-${idx}`} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    )
  }

  if (query.isError || !query.data) {
    return (
      <ErrorState
        variant="plain"
        title="Không tải được dữ liệu giám sát hệ thống"
        onRetry={() => void query.refetch()}
      />
    )
  }

  const { latency, webVitals, slowSql, behavior24h, summary, events } = query.data
  const maxBehaviorCount = Math.max(1, ...behavior24h.map((item) => item.count))
  const { errorCount, slowCount } = summary

  return (
    <div className="flex flex-col gap-6">
      {/* Hàng 1: 4 thẻ sức khỏe */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <GaugeIcon className="size-4 text-primary" aria-hidden="true" />
              Độ trễ API (p95)
            </CardDescription>
            <CardTitle className="font-display text-3xl tabular-nums">
              {formatNumber(latency.p95LatencyMs)} ms
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            p50: {formatNumber(latency.p50LatencyMs)}ms · p99: {formatNumber(latency.p99LatencyMs)}
            ms · avg: {formatNumber(latency.avgLatencyMs)}ms
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <ActivityIcon className="size-4 text-primary" aria-hidden="true" />
              Cache Hit &amp; Lưu lượng
            </CardDescription>
            <CardTitle className="font-display text-3xl tabular-nums">
              {Math.round(latency.cacheHitRatio * 100)}%
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {formatNumber(latency.totalQueries)} request · Uptime{" "}
            {formatNumber(Math.round(latency.uptimeMs / 60_000))} phút
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <AlertTriangleIcon className="size-4 text-primary" aria-hidden="true" />
              Sự cố &amp; Request chậm
            </CardDescription>
            <CardTitle className="font-display text-3xl tabular-nums">
              {formatNumber(errorCount)} / {formatNumber(slowCount)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {formatNumber(errorCount)} lỗi (5xx/client) · {formatNumber(slowCount)} chậm &gt;500ms
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Core Web Vitals (p75)</CardDescription>
            <CardTitle className="text-base font-semibold">
              {webVitals.every((v) => v.p75 === null)
                ? "Chưa có mẫu RUM"
                : webVitals
                    .filter((v) => v.p75 !== null)
                    .map((v) => `${v.name}: ${v.p75}${v.name === "CLS" ? "" : "ms"}`)
                    .join(" · ")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
            {webVitals.map((v) => (
              <Badge key={v.name} variant={v.poor > 0 ? "secondary" : "outline"}>
                {v.name} ({v.samples})
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Hàng 2: Live Log Stream */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Luồng sự kiện &amp; Phân rã độ trễ</CardTitle>
            <CardDescription>
              Theo dõi 300 sự kiện gần nhất nối FE ↔ BE qua trace_id và timingBreakdown
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCwIcon
              className={`size-3.5 ${query.isFetching ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Làm mới
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-full sm:w-72">
              <InputGroup>
                <InputGroupAddon>
                  <SearchIcon />
                </InputGroupAddon>
                <InputGroupInput
                  type="search"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Tìm route, trace_id, request_id, lỗi…"
                  aria-label="Tìm kiếm log giám sát"
                />
              </InputGroup>
            </div>

            <ToggleGroup
              value={[kind]}
              onValueChange={(next) => {
                const selected = next[0] as ObservabilityEventKind | undefined
                if (selected) setKind(selected)
              }}
              variant="outline"
              size="sm"
              aria-label="Lọc loại sự kiện giám sát"
            >
              {KIND_FILTERS.map((item) => (
                <ToggleGroupItem
                  key={item.value}
                  value={item.value}
                  className="min-h-11 px-3 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground sm:min-h-8"
                >
                  {item.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {events.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ActivityIcon />
                </EmptyMedia>
                <EmptyTitle>Chưa có sự kiện bất thường</EmptyTitle>
                <EmptyDescription>
                  Request chậm (&gt;500ms), lỗi 5xx, lỗi client hoặc Web Vitals sẽ xuất hiện tại
                  đây.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="divide-y rounded-lg border">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {kindBadge(ev.kind)}
                      <span className="font-mono text-xs font-medium">
                        {ev.method ? `${ev.method} ` : ""}
                        {ev.route ?? ev.metric ?? "-"}
                      </span>
                      {ev.status !== undefined ? (
                        <Badge variant="outline" className="font-mono text-xs">
                          {ev.status}
                        </Badge>
                      ) : null}
                      {ev.durationMs !== undefined ? (
                        <span className="font-mono text-xs font-semibold tabular-nums">
                          {formatNumber(ev.durationMs)} ms
                        </span>
                      ) : null}
                      {ev.value !== undefined && ev.metric ? (
                        <span className="font-mono text-xs font-semibold tabular-nums">
                          {ev.metric}: {ev.value}
                          {ev.metric === "CLS" ? "" : "ms"} ({ev.rating ?? "n/a"})
                        </span>
                      ) : null}
                    </div>

                    {ev.message ? (
                      <p className="truncate text-xs text-destructive">{ev.message}</p>
                    ) : null}

                    {ev.timing ? (
                      <div className="flex flex-wrap gap-3 font-mono text-xs text-muted-foreground">
                        <span>
                          DB: {ev.timing.dbMs}ms ({ev.timing.dbCount}q)
                        </span>
                        <span>Redis: {ev.timing.redisMs}ms</span>
                        <span>ONNX: {ev.timing.embedMs}ms</span>
                        <span>App: {ev.timing.appMs}ms</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatRelativeTime(ev.timestamp)}</span>
                    {ev.traceId ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 font-mono text-xs"
                        onClick={() => {
                          void navigator.clipboard?.writeText(ev.traceId ?? "")
                          toast.success("Đã chép trace_id")
                        }}
                      >
                        <CopyIcon className="size-3" aria-hidden="true" />
                        {ev.traceId.slice(0, 8)}
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hàng 3: Endpoint Latency + SQL chậm + Hành vi 24h */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DatabaseIcon className="size-4 text-primary" aria-hidden="true" />
              Top SQL chậm (pg_stat_statements)
            </CardTitle>
            <CardDescription>10 câu truy vấn có thời gian trung bình cao nhất</CardDescription>
          </CardHeader>
          <CardContent>
            {slowSql.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có dữ liệu pg_stat_statements.</p>
            ) : (
              <div className="divide-y rounded-lg border">
                {slowSql.map((sql, idx) => (
                  <div key={`${idx}-${sql.calls}`} className="space-y-1 px-3 py-2.5 text-xs">
                    <p className="line-clamp-2 font-mono text-foreground">{sql.query}</p>
                    <p className="text-muted-foreground tabular-nums">
                      Mean: <strong>{sql.meanMs}ms</strong> · Total: {sql.totalMs}ms · Calls:{" "}
                      {formatNumber(sql.calls)} · Rows: {formatNumber(sql.rows)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hành vi người dùng (24h)</CardTitle>
            <CardDescription>
              Phân bổ sự kiện từ bảng partitioned interaction_events
            </CardDescription>
          </CardHeader>
          <CardContent>
            {behavior24h.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Chưa có sự kiện tương tác trong 24h qua.
              </p>
            ) : (
              <div className="space-y-2.5">
                {behavior24h.map((item) => {
                  const pct = Math.max(6, Math.round((item.count / maxBehaviorCount) * 100))
                  return (
                    <div key={item.eventType} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-medium">{item.eventType}</span>
                        <span className="font-semibold tabular-nums">
                          {formatNumber(item.count)}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hàng 4: Endpoint breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hiệu suất theo Endpoint</CardTitle>
        </CardHeader>
        <CardContent>
          {latency.byEndpoint.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa ghi nhận request nào.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Route</th>
                    <th className="px-3 py-2 text-right font-medium">Requests</th>
                    <th className="px-3 py-2 text-right font-medium">Avg</th>
                    <th className="px-3 py-2 text-right font-medium">p95</th>
                    <th className="px-3 py-2 text-right font-medium">p99</th>
                    <th className="py-2 pl-3 text-right font-medium">Cache Hits</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {latency.byEndpoint.map((ep) => (
                    <tr key={ep.route}>
                      <td className="py-2 pr-4 font-mono">{ep.route}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatNumber(ep.count)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{ep.avgMs} ms</td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">
                        {ep.p95Ms} ms
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{ep.p99Ms} ms</td>
                      <td className="py-2 pl-3 text-right tabular-nums">
                        {formatNumber(ep.cacheHits)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
