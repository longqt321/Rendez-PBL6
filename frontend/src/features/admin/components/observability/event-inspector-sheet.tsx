import { useCopyToClipboard } from "@uidotdev/usehooks"
import { CopyIcon, FilterIcon } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { formatDateTime, formatNumber } from "@/lib/format"
import type { ObservabilityEventItem, ObservabilityEventKind } from "../../api/admin-api"
import {
  ADMIN_UI,
  TIMING_STAGE_LABELS,
  describeApiRoute,
  findDominantTimingStage,
} from "../../lib/admin-constants"
import { AdminStatGrid } from "../shared/admin-stat-grid"

export function ObservabilityKindBadge({
  kind,
}: Readonly<{ kind: Exclude<ObservabilityEventKind, "all"> }>) {
  switch (kind) {
    case "server_error":
      return <Badge variant="destructive">Lỗi máy chủ</Badge>
    case "client_error":
      return <Badge variant="destructive">Lỗi trình duyệt</Badge>
    case "slow_request":
      return <Badge variant="secondary">Phản hồi chậm</Badge>
    case "web_vital":
      return <Badge variant="outline">Trải nghiệm trang</Badge>
  }
}

export function EventInspectorSheet({
  event,
  onClose,
  onFilterTrace,
}: Readonly<{
  event: ObservabilityEventItem | null
  onClose: () => void
  onFilterTrace: (traceId: string) => void
}>) {
  const [, copyToClipboard] = useCopyToClipboard()
  const dominant = event?.timing ? findDominantTimingStage(event.timing) : null

  return (
    <Sheet open={event !== null} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        {event ? (
          <>
            <SheetHeader>
              <SheetTitle className="flex flex-wrap items-center gap-2">
                <ObservabilityKindBadge kind={event.kind} />
                <span className="text-sm font-semibold">
                  {event.route ? describeApiRoute(event.route) : (event.metric ?? "Sự kiện")}
                </span>
              </SheetTitle>
              <SheetDescription>
                {formatDateTime(event.timestamp)}
                {event.route ? ` · ${event.method ? `${event.method} ` : ""}${event.route}` : ""}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 px-4 pb-6">
              {event.message ? (
                <Alert variant="destructive">
                  <AlertTitle className="text-xs">Thông báo lỗi</AlertTitle>
                  <AlertDescription className="text-xs">{event.message}</AlertDescription>
                </Alert>
              ) : null}

              {dominant ? (
                <Alert className="border-star/40 bg-star/10">
                  <AlertTitle className="text-xs">Khâu chậm nhất: {dominant.label}</AlertTitle>
                  <AlertDescription className="text-xs">
                    Chiếm {dominant.percent}% tổng thời gian ({formatNumber(dominant.ms)} ms).
                  </AlertDescription>
                </Alert>
              ) : null}

              <AdminStatGrid
                items={[
                  {
                    label: "Trạng thái / Đánh giá",
                    value: event.status ? `HTTP ${event.status}` : (event.rating ?? "-"),
                    mono: true,
                  },
                  {
                    label: "Thời gian xử lý",
                    value:
                      event.durationMs !== undefined
                        ? `${formatNumber(event.durationMs)} ms`
                        : event.value !== undefined
                          ? `${event.value}${event.metric === "CLS" ? "" : " ms"}`
                          : "-",
                    mono: true,
                  },
                ]}
              />

              {event.timing ? (
                <div className="space-y-2.5 rounded-surface border p-3">
                  <SheetDescription className="font-semibold text-foreground">
                    Chi tiết từng bước lấy dữ liệu
                  </SheetDescription>
                  {(
                    [
                      {
                        label: `${TIMING_STAGE_LABELS.dbMs} (${event.timing.dbCount} lượt đọc)`,
                        ms: event.timing.dbMs,
                      },
                      { label: TIMING_STAGE_LABELS.embedMs, ms: event.timing.embedMs },
                      { label: TIMING_STAGE_LABELS.redisMs, ms: event.timing.redisMs },
                      { label: TIMING_STAGE_LABELS.externalMs, ms: event.timing.externalMs },
                      { label: TIMING_STAGE_LABELS.appMs, ms: event.timing.appMs },
                    ] as const
                  ).map((seg) => {
                    const total = Math.max(1, event.durationMs ?? 1)
                    const pct = Math.min(
                      ADMIN_UI.PERCENT_SCALE,
                      Math.round((seg.ms / total) * ADMIN_UI.PERCENT_SCALE),
                    )
                    return (
                      <div key={seg.label} className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{seg.label}</span>
                          <span className="font-mono font-medium tabular-nums">
                            {seg.ms} ms ({pct}%)
                          </span>
                        </div>
                        <Progress value={pct} aria-label={seg.label} className="h-1.5" />
                      </div>
                    )
                  })}
                </div>
              ) : null}

              <Separator />

              <div className="space-y-2">
                <SheetDescription className="text-xs font-medium text-muted-foreground">
                  Mã đối chiếu gửi đội kỹ thuật
                </SheetDescription>
                <AdminStatGrid
                  items={[
                    {
                      label: "Mã yêu cầu",
                      value: event.requestId ?? "-",
                      mono: true,
                      fullWidth: true,
                    },
                    {
                      label: "Mã phiên truy vết",
                      value: event.traceId ?? "-",
                      mono: true,
                      fullWidth: true,
                    },
                  ]}
                />
                {event.traceId ? (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => {
                        void copyToClipboard(event.traceId ?? "")
                        toast.success("Đã sao chép mã truy vết")
                      }}
                    >
                      <CopyIcon className="size-3.5" aria-hidden="true" />
                      Sao chép mã
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => {
                        onFilterTrace(event.traceId ?? "")
                        onClose()
                      }}
                    >
                      <FilterIcon className="size-3.5" aria-hidden="true" />
                      Lọc sự kiện liên quan
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
