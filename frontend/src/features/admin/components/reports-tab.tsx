import { useState } from "react"
import type { AdminReport, AdminReportStatus } from "@rendez/schema"
import { FlagIcon } from "lucide-react"
import { Link } from "react-router"
import { ErrorState } from "@/components/shared/error-state"
import { LoadMore } from "@/components/shared/load-more"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { REPORT_REASON_META } from "@/features/places/lib/report-meta"
import { formatRelativeTime } from "@/lib/format"
import type { AdminReportStatusFilter } from "../api/admin-api"
import { useAdminReports, useUpdateAdminReport } from "../hooks/use-admin"

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
  const [status, setStatus] = useState<AdminReportStatusFilter>("pending")
  const [editing, setEditing] = useState<AdminReport | null>(null)
  const reportsQuery = useAdminReports({ status })

  const reports = reportsQuery.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ToggleGroup
          value={[status]}
          onValueChange={(next) => {
            const selected = next[0] as AdminReportStatusFilter | undefined
            if (selected) setStatus(selected)
          }}
          variant="outline"
          size="sm"
          aria-label="Lọc trạng thái báo cáo"
        >
          {REPORT_STATUS_FILTERS.map((item) => (
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

      {reportsQuery.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={`rep-skel-${index}`} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : reportsQuery.isError ? (
        <ErrorState
          variant="plain"
          title="Không tải được danh sách báo cáo"
          onRetry={() => void reportsQuery.refetch()}
        />
      ) : reports.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FlagIcon />
            </EmptyMedia>
            <EmptyTitle>Không có báo cáo nào</EmptyTitle>
            <EmptyDescription>Chưa có phản ánh nào thuộc trạng thái đang chọn.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <ItemGroup className="gap-2">
            {reports.map((report) => (
              <Item key={report.id} variant="outline" className="items-start gap-3">
                <ItemContent className="gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <ItemTitle className="text-sm font-semibold">
                      <Link
                        to={`/discover/${report.placeId}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {report.placeName}
                      </Link>
                    </ItemTitle>
                    <Badge
                      variant={
                        report.status === "pending"
                          ? "destructive"
                          : report.status === "reviewed"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {REPORT_STATUS_LABELS[report.status]}
                    </Badge>
                    <Badge variant="outline">{REPORT_REASON_META[report.reason].label}</Badge>
                  </div>
                  <ItemDescription className="text-xs">
                    Người báo cáo: @{report.reporterHandle} · {formatRelativeTime(report.createdAt)}
                    {!report.placePublished ? " · Quán đang ẩn" : ""}
                    {report.placeStatus === "closed" ? " · Quán đã đóng cửa" : ""}
                  </ItemDescription>
                  {report.detail ? (
                    <p className="mt-1 text-sm text-foreground">{report.detail}</p>
                  ) : null}
                </ItemContent>
                <ItemActions>
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-9 sm:min-h-8"
                    onClick={() => setEditing(report)}
                  >
                    Xử lý
                  </Button>
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>

          <LoadMore
            hasNextPage={reportsQuery.hasNextPage}
            isFetchingNextPage={reportsQuery.isFetchingNextPage}
            onLoadMore={() => reportsQuery.fetchNextPage()}
            loadingLabel="Đang tải thêm báo cáo"
            endMessage="Đã hiển thị hết danh sách báo cáo."
          />
        </>
      )}

      <ReportResolutionDialog
        key={editing?.id ?? "none"}
        report={editing}
        onClose={() => setEditing(null)}
      />
    </div>
  )
}

function ReportResolutionDialog({
  report,
  onClose,
}: Readonly<{
  report: AdminReport | null
  onClose: () => void
}>) {
  const [decision, setDecision] = useState<"reviewed" | "dismissed">("reviewed")
  const [placeAction, setPlaceAction] = useState<"none" | "unpublish" | "close">("none")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const updateReport = useUpdateAdminReport()

  if (!report) return null

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!report) return
    if (note.trim().length > 300) {
      setError("Ghi chú tối đa 300 ký tự")
      return
    }
    setError(null)
    updateReport.mutate(
      {
        reportId: report.id,
        input: {
          status: decision,
          placeAction: decision === "reviewed" ? placeAction : "none",
          moderationNote: note.trim() ? note.trim() : undefined,
        },
      },
      {
        onSuccess: () => onClose(),
      },
    )
  }

  return (
    <Dialog open={report !== null} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Xử lý báo cáo: {report.placeName}</DialogTitle>
            <DialogDescription>
              Lý do: {REPORT_REASON_META[report.reason].label} · @{report.reporterHandle}
            </DialogDescription>
          </DialogHeader>

          <Field>
            <FieldLabel>Kết luận kiểm duyệt</FieldLabel>
            <RadioGroup<"reviewed" | "dismissed">
              value={decision}
              onValueChange={(value) => setDecision(value)}
              className="gap-2"
            >
              <Label className="flex cursor-pointer items-center gap-2 rounded-surface border p-2.5 font-normal">
                <RadioGroupItem value="reviewed" />
                <span>Xác nhận và đánh dấu đã xử lý</span>
              </Label>
              <Label className="flex cursor-pointer items-center gap-2 rounded-surface border p-2.5 font-normal">
                <RadioGroupItem value="dismissed" />
                <span>Bỏ qua báo cáo</span>
              </Label>
            </RadioGroup>
          </Field>

          {decision === "reviewed" ? (
            <Field>
              <FieldLabel>Tác động lên địa điểm</FieldLabel>
              <RadioGroup<"none" | "unpublish" | "close">
                value={placeAction}
                onValueChange={(value) => setPlaceAction(value)}
                className="gap-2"
              >
                <Label className="flex cursor-pointer items-center gap-2 rounded-surface border p-2.5 font-normal">
                  <RadioGroupItem value="none" />
                  <span>Chỉ ghi nhận báo cáo</span>
                </Label>
                <Label className="flex cursor-pointer items-center gap-2 rounded-surface border p-2.5 font-normal">
                  <RadioGroupItem value="unpublish" />
                  <span>Gỡ khỏi Khám phá (ẩn quán)</span>
                </Label>
                <Label className="flex cursor-pointer items-center gap-2 rounded-surface border p-2.5 font-normal">
                  <RadioGroupItem value="close" />
                  <span>Đánh dấu quán đã đóng cửa</span>
                </Label>
              </RadioGroup>
            </Field>
          ) : null}

          <Field data-invalid={!!error}>
            <FieldLabel htmlFor="report-moderation-note">Ghi chú kiểm duyệt</FieldLabel>
            <Textarea
              id="report-moderation-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ghi chú lý do xử lý (không bắt buộc)…"
              className="min-h-20 resize-none"
              maxLength={300}
              aria-invalid={!!error}
              aria-describedby={error ? "report-moderation-note-error" : undefined}
            />
            {error ? <FieldError id="report-moderation-note-error">{error}</FieldError> : null}
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={updateReport.isPending}
            >
              Huỷ
            </Button>
            <Button type="submit" disabled={updateReport.isPending}>
              {updateReport.isPending ? <Spinner aria-label="Đang lưu xử lý" /> : null}
              Lưu kết quả
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
