import { AlertTriangleIcon, CheckCircle2Icon, ShieldAlertIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { AdminObservability } from "../../api/admin-api"
import {
  ADMIN_UI,
  describeApiRoute,
  findDominantTimingStage,
  type TimingSnapshot,
} from "../../lib/admin-constants"

export function SystemHealthBanner({ data }: Readonly<{ data: AdminObservability }>) {
  const { latency, summary, events } = data

  const slowestEndpoint = [...latency.byEndpoint].sort((a, b) => b.p95Ms - a.p95Ms)[0]
  const aggregateTiming = events.reduce<TimingSnapshot>(
    (acc, ev) => {
      if (!ev.timing) return acc
      return {
        dbMs: acc.dbMs + ev.timing.dbMs,
        redisMs: acc.redisMs + ev.timing.redisMs,
        embedMs: acc.embedMs + ev.timing.embedMs,
        externalMs: acc.externalMs + ev.timing.externalMs,
        appMs: acc.appMs + ev.timing.appMs,
      }
    },
    { dbMs: 0, redisMs: 0, embedMs: 0, externalMs: 0, appMs: 0 },
  )
  const dominantStage = findDominantTimingStage(aggregateTiming)

  const openBreakers =
    data.infrastructure?.circuitBreakers?.filter((b) => b.state !== "closed") ?? []
  const failedJobs = data.infrastructure?.queue?.failed ?? 0

  const hasErrors =
    summary.errorCount > 0 ||
    (latency.errors5xx ?? 0) > 0 ||
    openBreakers.length > 0 ||
    failedJobs > 0
  const hasSlowness =
    summary.slowCount > 0 ||
    latency.p95LatencyMs >= ADMIN_UI.OBSERVABILITY_SLOW_P95_MS ||
    (data.infrastructure?.dbPool.waiting ?? 0) > 0 ||
    (data.infrastructure?.eventLoopLagMs ?? 0) >= 100

  const statusTone = hasErrors ? "danger" : hasSlowness ? "warning" : "healthy"

  const title =
    statusTone === "danger"
      ? `Phát hiện ${formatNumber(summary.errorCount)} sự cố cần xử lý`
      : statusTone === "warning"
        ? "Hệ thống có một số điểm phản hồi chậm"
        : "Hệ thống hoạt động ổn định"

  const hints: string[] = []
  if (slowestEndpoint && slowestEndpoint.p95Ms >= ADMIN_UI.OBSERVABILITY_WARN_P95_MS) {
    hints.push(
      `Chậm nhất: ${describeApiRoute(slowestEndpoint.route)} (${formatNumber(slowestEndpoint.p95Ms)}ms)`,
    )
  }
  if (dominantStage) {
    hints.push(`Khâu tốn thời gian nhất: ${dominantStage.label} (${dominantStage.percent}%)`)
  }
  if (hints.length === 0) {
    hints.push(
      `95% lượt tải hoàn tất trong ${formatNumber(latency.p95LatencyMs)}ms · Chưa ghi nhận lỗi.`,
    )
  }

  return (
    <Alert
      variant={statusTone === "danger" ? "destructive" : "default"}
      className={cn(
        statusTone === "healthy" && "border-open/35 bg-open/8 text-foreground",
        statusTone === "warning" && "border-star/45 bg-star/10 text-foreground",
      )}
    >
      {statusTone === "danger" ? (
        <ShieldAlertIcon className="size-4" aria-hidden="true" />
      ) : statusTone === "warning" ? (
        <AlertTriangleIcon className="size-4 text-star" aria-hidden="true" />
      ) : (
        <CheckCircle2Icon className="size-4 text-open" aria-hidden="true" />
      )}
      <AlertTitle className="flex flex-wrap items-center justify-between gap-2">
        <span>{title}</span>
        <Badge
          variant={
            statusTone === "danger"
              ? "destructive"
              : statusTone === "warning"
                ? "outline"
                : "secondary"
          }
          className="text-xs"
        >
          {statusTone === "danger"
            ? "Cần kiểm tra ngay"
            : statusTone === "warning"
              ? "Cần theo dõi"
              : "Bình thường"}
        </Badge>
      </AlertTitle>
      <AlertDescription className="text-xs">{hints.join(" · ")}</AlertDescription>
    </Alert>
  )
}
