import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { FlagIcon } from "lucide-react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { MAX_REPORT_DETAIL_LENGTH } from "@/lib/constants"
import { formatNumber } from "@/lib/format"
import { useCreatePlaceReport } from "../hooks/use-create-place-report"
import { REPORT_REASON_META } from "../lib/report-meta"
import { PLACE_REPORT_REASONS, type PlaceReportReason } from "../types/place-report"
import type { Place } from "../types/place"

const reportSchema = z
  .object({
    reason: z.enum(PLACE_REPORT_REASONS),
    detail: z
      .string()
      .trim()
      .max(
        MAX_REPORT_DETAIL_LENGTH,
        `Ghi chú tối đa ${formatNumber(MAX_REPORT_DETAIL_LENGTH)} ký tự`,
      ),
  })
  // "other" không đủ thông tin để kiểm duyệt — bắt buộc mô tả cụ thể.
  .refine((values) => values.reason !== "other" || values.detail.length > 0, {
    message: "Mô tả cụ thể lý do báo cáo",
    path: ["detail"],
  })

type ReportFormValues = z.infer<typeof reportSchema>

interface ReportPlaceDialogProps {
  place: Place
  children: React.ReactElement
}

/**
 * Báo cáo địa điểm cho kiểm duyệt viên (đóng cửa, sai thông tin, trùng…).
 *
 * Báo cáo không làm thay đổi dữ liệu hiển thị ngay — server đưa vào hàng chờ
 * kiểm duyệt, nên gửi xong chỉ cần xác nhận cho người dùng.
 */
export function ReportPlaceDialog({ place, children }: ReportPlaceDialogProps) {
  const [open, setOpen] = useState(false)
  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: { reason: "closed", detail: "" },
  })
  const createReport = useCreatePlaceReport(place.id)
  const detail = useWatch({ control: form.control, name: "detail" })

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      form.reset()
      form.clearErrors()
    }
  }

  function onSubmit(values: ReportFormValues) {
    createReport.mutate(
      { reason: values.reason, detail: values.detail.length > 0 ? values.detail : undefined },
      {
        onSuccess: () => {
          toast.success(`Đã gửi báo cáo về “${place.name}”, cảm ơn bạn!`)
          handleOpenChange(false)
        },
        onError: () => toast.error("Không gửi được báo cáo, thử lại nhé"),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={children} />
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
          className="flex flex-col gap-4"
        >
          <DialogHeader>
            <DialogTitle>Báo cáo {place.name}</DialogTitle>
            <DialogDescription>
              Thông tin sẽ được kiểm duyệt viên xem lại trước khi cập nhật lên bản đồ.
            </DialogDescription>
          </DialogHeader>

          <Field data-invalid={!!form.formState.errors.reason}>
            <FieldLabel>Lý do báo cáo</FieldLabel>
            <Controller
              control={form.control}
              name="reason"
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={(next) => field.onChange(next as PlaceReportReason)}
                  aria-label="Chọn lý do báo cáo"
                  className="gap-2"
                >
                  {PLACE_REPORT_REASONS.map((reason) => (
                    <Label
                      key={reason}
                      className="flex cursor-pointer items-start gap-3 rounded-surface border p-3 font-normal outline-none has-data-checked:border-primary has-data-checked:bg-primary/5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
                    >
                      <RadioGroupItem value={reason} className="mt-0.5" />
                      <span className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">
                          {REPORT_REASON_META[reason].label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {REPORT_REASON_META[reason].description}
                        </span>
                      </span>
                    </Label>
                  ))}
                </RadioGroup>
              )}
            />
            <FieldError errors={[form.formState.errors.reason]} />
          </Field>

          <Field data-invalid={!!form.formState.errors.detail}>
            <FieldLabel htmlFor="report-detail">Ghi chú thêm (không bắt buộc)</FieldLabel>
            <Textarea
              id="report-detail"
              {...form.register("detail")}
              aria-invalid={!!form.formState.errors.detail}
              placeholder="Ví dụ: quán đã chuyển sang đường Nguyễn Chí Thanh từ tháng 10…"
              className="min-h-20 resize-none"
              maxLength={MAX_REPORT_DETAIL_LENGTH}
            />
            <FieldError errors={[form.formState.errors.detail]} />
            <FieldDescription>
              {formatNumber(detail?.length ?? 0)}/{formatNumber(MAX_REPORT_DETAIL_LENGTH)} ký tự
            </FieldDescription>
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={createReport.isPending}
            >
              Huỷ
            </Button>
            <Button type="submit" disabled={createReport.isPending}>
              {createReport.isPending ? <Spinner aria-label="Đang gửi báo cáo" /> : <FlagIcon />}
              Gửi báo cáo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
