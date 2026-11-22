import { useState } from "react"
import type { AdminReport } from "@rendez/schema"
import { ExternalLinkIcon } from "lucide-react"
import { Link } from "react-router"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { REPORT_REASON_META } from "@/features/places/lib/report-meta"
import { formatDateTime } from "@/lib/format"
import { useUpdateAdminReport } from "../../hooks/use-admin"
import { ADMIN_UI } from "../../lib/admin-constants"
import { AdminDangerConfirm } from "../shared/admin-danger-confirm"
import { useAdminRuntime } from "../shared/admin-env-store"

export function ReportResolutionSheet({
  report,
  onClose,
}: Readonly<{ report: AdminReport | null; onClose: () => void }>) {
  const { requiresStrictConfirm } = useAdminRuntime()
  const [decision, setDecision] = useState<"reviewed" | "dismissed">("reviewed")
  const [placeAction, setPlaceAction] = useState<"none" | "unpublish" | "close">("none")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const updateReport = useUpdateAdminReport()

  if (!report) return null

  const effectivePlaceAction = decision === "reviewed" ? placeAction : "none"
  const isDestructive = effectivePlaceAction === "unpublish" || effectivePlaceAction === "close"

  function submitMutation() {
    if (!report) return
    updateReport.mutate(
      {
        reportId: report.id,
        input: {
          status: decision,
          placeAction: effectivePlaceAction,
          moderationNote: note.trim() ? note.trim() : undefined,
        },
      },
      {
        onSuccess: () => {
          setConfirmOpen(false)
          onClose()
        },
      },
    )
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!report) return
    if (note.trim().length > ADMIN_UI.MODERATION_NOTE_MAX_LEN) {
      setError(`Ghi chú tối đa ${ADMIN_UI.MODERATION_NOTE_MAX_LEN} ký tự`)
      return
    }
    if (
      requiresStrictConfirm &&
      isDestructive &&
      note.trim().length < ADMIN_UI.PROD_MIN_REASON_LEN
    ) {
      setError(`Cần nhập lý do tối thiểu ${ADMIN_UI.PROD_MIN_REASON_LEN} ký tự trên Production`)
      return
    }
    setError(null)
    if (isDestructive) {
      setConfirmOpen(true)
      return
    }
    submitMutation()
  }

  return (
    <>
      <Sheet open={report !== null} onOpenChange={(next) => (!next ? onClose() : undefined)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <form onSubmit={handleSubmit} className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>Kiểm duyệt báo cáo</SheetTitle>
              <SheetDescription>
                {report.placeName} · {formatDateTime(report.createdAt)}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-4 px-4 py-2">
              <Item variant="outline" className="flex-col items-stretch gap-2.5 bg-muted/30">
                <div className="flex items-start justify-between gap-2">
                  <ItemContent className="gap-1">
                    <ItemTitle className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline">{REPORT_REASON_META[report.reason].label}</Badge>
                      <Badge variant={report.placePublished ? "secondary" : "destructive"}>
                        {report.placePublished ? "Đang hiển thị" : "Đang ẩn"}
                      </Badge>
                      {report.placeStatus === "closed" ? (
                        <Badge variant="destructive">Đóng cửa</Badge>
                      ) : null}
                    </ItemTitle>
                    <ItemDescription className="text-xs">
                      {report.reporterName} (@{report.reporterHandle})
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 px-2 text-xs"
                      render={
                        <Link
                          to={`/discover/${report.placeId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        />
                      }
                    >
                      Xem quán
                      <ExternalLinkIcon className="size-3" aria-hidden="true" />
                    </Button>
                  </ItemActions>
                </div>
                <ItemDescription className="rounded-control bg-background p-2.5 text-sm text-foreground">
                  {report.detail ?? "Không có mô tả kèm theo."}
                </ItemDescription>
              </Item>

              <Separator />

              <Field>
                <FieldLabel>Kết luận</FieldLabel>
                <RadioGroup<"reviewed" | "dismissed">
                  value={decision}
                  onValueChange={setDecision}
                  className="gap-2"
                >
                  <Label className="flex cursor-pointer items-center gap-2 rounded-surface border p-2.5 font-normal">
                    <RadioGroupItem value="reviewed" />
                    Xác nhận đã xử lý
                  </Label>
                  <Label className="flex cursor-pointer items-center gap-2 rounded-surface border p-2.5 font-normal">
                    <RadioGroupItem value="dismissed" />
                    Bỏ qua báo cáo
                  </Label>
                </RadioGroup>
              </Field>

              {decision === "reviewed" ? (
                <Field>
                  <FieldLabel>Tác động lên địa điểm</FieldLabel>
                  <RadioGroup<"none" | "unpublish" | "close">
                    value={placeAction}
                    onValueChange={setPlaceAction}
                    className="gap-2"
                  >
                    <Label className="flex cursor-pointer items-center gap-2 rounded-surface border p-2.5 font-normal">
                      <RadioGroupItem value="none" />
                      Chỉ ghi nhận
                    </Label>
                    <Label className="flex cursor-pointer items-center gap-2 rounded-surface border p-2.5 font-normal">
                      <RadioGroupItem value="unpublish" />
                      Ẩn khỏi Khám phá
                    </Label>
                    <Label className="flex cursor-pointer items-center gap-2 rounded-surface border p-2.5 font-normal">
                      <RadioGroupItem value="close" />
                      Đánh dấu đóng cửa
                    </Label>
                  </RadioGroup>
                </Field>
              ) : null}

              <Field data-invalid={!!error}>
                <FieldLabel htmlFor="report-moderation-note">
                  Ghi chú{requiresStrictConfirm && isDestructive ? " (bắt buộc)" : ""}
                </FieldLabel>
                <Textarea
                  id="report-moderation-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Lý do xử lý…"
                  className="min-h-24 resize-none"
                  maxLength={ADMIN_UI.MODERATION_NOTE_MAX_LEN}
                  aria-invalid={!!error}
                  aria-describedby={error ? "report-moderation-note-error" : undefined}
                />
                {error ? <FieldError id="report-moderation-note-error">{error}</FieldError> : null}
              </Field>
            </div>

            <SheetFooter className="border-t pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={updateReport.isPending}
              >
                Huỷ
              </Button>
              <Button
                type="submit"
                variant={isDestructive ? "destructive" : "default"}
                disabled={updateReport.isPending}
              >
                {updateReport.isPending ? <Spinner aria-label="Đang lưu" /> : null}
                Lưu kết quả
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AdminDangerConfirm
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={effectivePlaceAction === "close" ? "Đóng cửa địa điểm" : "Ẩn địa điểm"}
        description={`Thao tác ảnh hưởng trực tiếp tới hiển thị công khai của "${report.placeName}".`}
        confirmToken={report.placeName}
        confirmLabel="Nhập tên địa điểm để xác nhận"
        actionLabel={effectivePlaceAction === "close" ? "Đóng cửa" : "Ẩn địa điểm"}
        isPending={updateReport.isPending}
        onConfirm={submitMutation}
      />
    </>
  )
}
