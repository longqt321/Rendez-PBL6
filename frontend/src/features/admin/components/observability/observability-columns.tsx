import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { formatNumber, formatRelativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { AdminObservability, ObservabilityEventItem } from "../../api/admin-api"
import {
  ADMIN_UI,
  WEB_VITAL_META,
  describeApiRoute,
  findDominantTimingStage,
} from "../../lib/admin-constants"
import type { AdminColumnDef } from "../shared/admin-data-table"
import { ObservabilityKindBadge } from "./event-inspector-sheet"

export type EndpointMetricRow = AdminObservability["latency"]["byEndpoint"][number] & {
  featureLabel: string
  cacheHitPct: number
}

function speedStatusBadge(p95Ms: number) {
  if (p95Ms >= ADMIN_UI.OBSERVABILITY_SLOW_P95_MS) {
    return <Badge variant="destructive">Chậm</Badge>
  }
  if (p95Ms >= ADMIN_UI.OBSERVABILITY_WARN_P95_MS) {
    return (
      <Badge variant="outline" className="border-star/50 text-star">
        Cần theo dõi
      </Badge>
    )
  }
  return <Badge variant="secondary">Ổn định</Badge>
}

export const ENDPOINT_COLUMNS: readonly AdminColumnDef<EndpointMetricRow>[] = [
  {
    accessorKey: "featureLabel",
    header: "Chức năng / API",
    cell: ({ row }) => (
      <div className="space-y-0.5">
        <span className="block font-medium text-foreground">{row.original.featureLabel}</span>
        <span className="block font-mono text-xs text-muted-foreground">{row.original.route}</span>
      </div>
    ),
  },
  {
    accessorKey: "count",
    header: "Lượt gọi",
    cell: ({ row }) => (
      <span className="font-mono text-xs tabular-nums">{formatNumber(row.original.count)}</span>
    ),
  },
  {
    accessorKey: "avgMs",
    header: "Trung bình",
    cell: ({ row }) => (
      <span className="font-mono text-xs tabular-nums">{row.original.avgMs} ms</span>
    ),
  },
  {
    accessorKey: "p95Ms",
    header: "Mức chậm (95%)",
    cell: ({ row }) => (
      <span
        className={cn(
          "font-mono text-xs font-semibold tabular-nums",
          row.original.p95Ms >= ADMIN_UI.OBSERVABILITY_SLOW_P95_MS && "text-destructive",
        )}
      >
        {row.original.p95Ms} ms
      </span>
    ),
  },
  {
    accessorKey: "cacheHitPct",
    header: "Bộ nhớ đệm",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Progress
          value={row.original.cacheHitPct}
          aria-label={`Tỷ lệ bộ nhớ đệm ${row.original.featureLabel}`}
          className="h-1.5 w-14"
        />
        <span className="font-mono text-xs tabular-nums">{row.original.cacheHitPct}%</span>
      </div>
    ),
  },
  {
    id: "health",
    accessorKey: "p95Ms",
    header: "Đánh giá",
    cell: ({ row }) => speedStatusBadge(row.original.p95Ms),
  },
]

export const EVENT_COLUMNS: readonly AdminColumnDef<ObservabilityEventItem>[] = [
  {
    accessorKey: "timestamp",
    header: "Thời gian",
    cell: ({ row }) => (
      <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
        {formatRelativeTime(row.original.timestamp)}
      </span>
    ),
  },
  {
    accessorKey: "kind",
    header: "Phân loại",
    cell: ({ row }) => <ObservabilityKindBadge kind={row.original.kind} />,
  },
  {
    id: "target",
    accessorFn: (row) => describeApiRoute(row.route) || row.metric || "",
    header: "Chức năng ảnh hưởng",
    cell: ({ row }) => {
      const ev = row.original
      const title = ev.route
        ? describeApiRoute(ev.route)
        : ev.metric && ev.metric in WEB_VITAL_META
          ? WEB_VITAL_META[ev.metric as keyof typeof WEB_VITAL_META].label
          : (ev.metric ?? "Hệ thống")
      return (
        <div className="max-w-xs space-y-0.5">
          <span className="block truncate text-xs font-medium text-foreground">{title}</span>
          {ev.route ? (
            <span className="block truncate font-mono text-xs text-muted-foreground">
              {ev.method ? `${ev.method} ` : ""}
              {ev.route}
            </span>
          ) : null}
          {ev.message ? (
            <span className="block truncate text-xs text-destructive">{ev.message}</span>
          ) : null}
        </div>
      )
    },
  },
  {
    id: "bottleneck",
    header: "Khâu chậm nhất",
    enableSorting: false,
    cell: ({ row }) => {
      if (!row.original.timing) {
        return <span className="text-xs text-muted-foreground">-</span>
      }
      const dominant = findDominantTimingStage(row.original.timing)
      if (!dominant) return <span className="text-xs text-muted-foreground">-</span>
      return (
        <Badge variant="outline" className="text-xs tabular-nums">
          {dominant.label} ({dominant.percent}%)
        </Badge>
      )
    },
  },
  {
    id: "metricValue",
    accessorFn: (row) => row.durationMs ?? row.value ?? 0,
    header: "Thời gian / Kết quả",
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5 font-mono text-xs tabular-nums">
        {row.original.status !== undefined ? (
          <Badge variant="outline" className="font-mono text-xs">
            HTTP {row.original.status}
          </Badge>
        ) : null}
        {row.original.durationMs !== undefined ? (
          <span className="font-semibold">{formatNumber(row.original.durationMs)} ms</span>
        ) : row.original.value !== undefined && row.original.metric ? (
          <span className="font-semibold">
            {row.original.value}
            {row.original.metric === "CLS" ? "" : "ms"}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </div>
    ),
  },
]
