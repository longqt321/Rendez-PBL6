import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch, type UseFormReturn } from "react-hook-form"
import { z } from "zod"
import { CalendarIcon, CheckIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useMediaQuery } from "@base-ui/react/unstable-use-media-query"
import { MAX_TRIP_BASE_LABEL_LENGTH, MAX_TRIP_DAYS, MAX_TRIP_NAME_LENGTH } from "@/lib/constants"
import { formatDate, formatNumber } from "@/lib/format"
import { DANANG_DISTRICTS } from "@/features/places/lib/danang-districts"
import { parseLocalDate, toLocalDateString } from "../lib/trip"
import type { Trip, TripInput } from "../types/trip"

/** Định dạng ngày của form: `yyyy-MM-dd` (khớp `toLocalDateString` và `datetime-local`). */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const tripFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Tên chuyến đi không được để trống")
      .max(MAX_TRIP_NAME_LENGTH, `Tên tối đa ${MAX_TRIP_NAME_LENGTH} ký tự`),
    startDate: z.string().regex(DATE_PATTERN, "Chọn ngày đến"),
    endDate: z.string().regex(DATE_PATTERN, "Chọn ngày đi"),
    arrivalAt: z.string().optional(),
    departureAt: z.string().optional(),
    baseDistrict: z.string().optional(),
    baseLabel: z
      .string()
      .max(MAX_TRIP_BASE_LABEL_LENGTH, `Nhãn tối đa ${MAX_TRIP_BASE_LABEL_LENGTH} ký tự`)
      .optional(),
  })
  // Bỏ qua refine khi còn thiếu ngày — lỗi regex của từng trường đã đủ rõ.
  .refine((v) => v.startDate === "" || v.endDate === "" || v.endDate >= v.startDate, {
    message: "Ngày đi phải sau hoặc trùng ngày đến",
    path: ["endDate"],
  })
  .refine(
    (v) => {
      if (v.startDate === "" || v.endDate === "") return true
      const start = new Date(`${v.startDate}T00:00:00Z`)
      const end = new Date(`${v.endDate}T00:00:00Z`)
      const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
      return days <= MAX_TRIP_DAYS
    },
    {
      message: `Chuyến đi tối đa ${MAX_TRIP_DAYS} ngày`,
      path: ["endDate"],
    },
  )

type TripFormValues = z.infer<typeof tripFormSchema>

interface TripFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Có trip = chế độ sửa (nạp defaultValues từ trip); không có = tạo mới. */
  trip?: Trip
  /** Gọi khi form hợp lệ; parent tự đóng dialog + toast. */
  onSubmit: (input: TripInput) => void
}

/** Giá trị form mặc định: tạo mới → rỗng, sửa → nạp từ trip. */
function createDefaultValues(trip?: Trip): TripFormValues {
  return {
    name: trip?.name ?? "",
    startDate: trip?.startDate ?? "",
    endDate: trip?.endDate ?? "",
    arrivalAt: trip?.arrivalAt ?? "",
    departureAt: trip?.departureAt ?? "",
    baseDistrict: trip?.baseDistrict ?? "",
    baseLabel: trip?.baseLabel ?? "",
  }
}

/**
 * Dialog tạo/chỉnh sửa chuyến đi: tên, khoảng ngày, giờ đến/đi và nơi ở.
 *
 * Desktop dùng `Dialog`, mobile dùng `Drawer` — nội dung form là một component
 * con dùng chung. Ràng buộc khớp server: tên 1–80 ký tự, tối đa 30 ngày.
 * Không tự đóng dialog hay toast — parent quyết định qua `onSubmit`.
 */
export function TripFormDialog({ open, onOpenChange, trip, onSubmit }: TripFormDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)", { noSsr: true })

  const form = useForm<TripFormValues>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: createDefaultValues(trip),
  })

  useEffect(() => {
    if (open) {
      // Mở lại thì nạp đúng dữ liệu hiện tại, kể cả khi lần trước bấm Huỷ.
      form.reset(createDefaultValues(trip))
    }
  }, [open, trip, form])

  const handleSubmit = form.handleSubmit((values) => {
    onSubmit({
      name: values.name.trim(),
      startDate: values.startDate,
      endDate: values.endDate,
      arrivalAt: values.arrivalAt || undefined,
      departureAt: values.departureAt || undefined,
      baseDistrict: values.baseDistrict || undefined,
      baseLabel: values.baseLabel?.trim() || undefined,
    })
  })

  const title = trip ? "Sửa chuyến đi" : "Chuyến đi mới"
  const description = "Đặt tên, chọn ngày và nơi ở để bắt đầu xếp lịch."

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <TripFormFields form={form} />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Huỷ
              </Button>
              <Button type="submit">
                <CheckIcon aria-hidden="true" />
                Lưu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
            <TripFormFields form={form} />
          </div>
          <DrawerFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Huỷ
            </Button>
            <Button type="submit">
              <CheckIcon aria-hidden="true" />
              Lưu
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  )
}

/** Nội dung form dùng chung giữa Dialog (desktop) và Drawer (mobile). */
function TripFormFields({ form }: { form: UseFormReturn<TripFormValues> }) {
  const isDesktop = useMediaQuery("(min-width: 768px)", { noSsr: true })
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  const startDate = useWatch({ control: form.control, name: "startDate" })
  const endDate = useWatch({ control: form.control, name: "endDate" })
  const baseLabel = useWatch({ control: form.control, name: "baseLabel" })

  // `parseLocalDate` trả `Date | null` (chuỗi hỏng) còn `DateRange` cần `Date | undefined`.
  const selectedRange: DateRange | undefined = startDate
    ? {
        from: parseLocalDate(startDate) ?? undefined,
        to: parseLocalDate(endDate) ?? undefined,
      }
    : undefined

  function handleRangeSelect(range: DateRange | undefined) {
    // Chỉ ghi khi range có `from`; `to` có thể undefined → khi đó endDate = startDate.
    if (!range?.from) return
    form.setValue("startDate", toLocalDateString(range.from), { shouldValidate: true })
    form.setValue("endDate", toLocalDateString(range.to ?? range.from), { shouldValidate: true })
  }

  const calendar = (
    <Calendar
      mode="range"
      numberOfMonths={1}
      selected={selectedRange}
      onSelect={handleRangeSelect}
    />
  )

  const dateTrigger = (
    <Button
      type="button"
      variant="outline"
      aria-label="Chọn ngày đến – ngày đi"
      className="w-full justify-start font-normal"
    >
      <CalendarIcon aria-hidden="true" />
      {startDate ? (
        <span>
          {formatDate(startDate)} – {formatDate(endDate || startDate)}
        </span>
      ) : (
        <span className="text-muted-foreground">Chọn ngày đến – ngày đi</span>
      )}
    </Button>
  )

  return (
    <FieldGroup className="gap-4">
      <Field>
        <FieldLabel htmlFor="trip-name">Tên chuyến đi</FieldLabel>
        <Input
          id="trip-name"
          maxLength={MAX_TRIP_NAME_LENGTH}
          placeholder="Ví dụ: Đà Nẵng 3 ngày 2 đêm"
          autoComplete="off"
          aria-invalid={Boolean(form.formState.errors.name)}
          {...form.register("name")}
        />
        <FieldError>{form.formState.errors.name?.message}</FieldError>
      </Field>

      <Field>
        <FieldLabel>Ngày đến – ngày đi</FieldLabel>
        {isDesktop ? (
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger render={dateTrigger} />
            <PopoverContent align="start" className="w-auto p-0">
              {calendar}
            </PopoverContent>
          </Popover>
        ) : (
          <Drawer open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <DrawerTrigger render={dateTrigger} />
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Chọn ngày đến – ngày đi</DrawerTitle>
              </DrawerHeader>
              <div className="flex justify-center pb-2">{calendar}</div>
              <DrawerFooter>
                <Button type="button" onClick={() => setDatePickerOpen(false)}>
                  Xong
                </Button>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        )}
        <FieldError>{form.formState.errors.startDate?.message}</FieldError>
        <FieldError>{form.formState.errors.endDate?.message}</FieldError>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel htmlFor="trip-arrival">Giờ đến</FieldLabel>
          <Input id="trip-arrival" type="datetime-local" {...form.register("arrivalAt")} />
        </Field>
        <Field>
          <FieldLabel htmlFor="trip-departure">Giờ về</FieldLabel>
          <Input id="trip-departure" type="datetime-local" {...form.register("departureAt")} />
        </Field>
      </div>

      <Field>
        <FieldTitle>Nơi ở</FieldTitle>
        <FieldDescription>Khu bạn ở/kết thúc ngày để gợi ý xếp quán</FieldDescription>
        {/* base-ui ToggleGroup không nhận ref/onChange → bắt buộc đi qua Controller. */}
        <Controller
          control={form.control}
          name="baseDistrict"
          render={({ field }) => (
            <ToggleGroup
              value={[field.value || "none"]}
              onValueChange={(next) => {
                const selected = next[0]
                if (selected) {
                  field.onChange(selected === "none" ? "" : selected)
                }
              }}
              variant="outline"
              size="sm"
              aria-label="Chọn quận nơi ở"
              className="flex-wrap"
            >
              <ToggleGroupItem
                value="none"
                className="h-7 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              >
                Chưa chọn
              </ToggleGroupItem>
              {DANANG_DISTRICTS.map((district) => (
                <ToggleGroupItem
                  key={district}
                  value={district}
                  className="h-7 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                >
                  {district}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="trip-base-label">Nhãn nơi ở</FieldLabel>
        <Input
          id="trip-base-label"
          maxLength={MAX_TRIP_BASE_LABEL_LENGTH}
          placeholder="Ví dụ: Khách sạn ABC, Mỹ Khê"
          autoComplete="off"
          aria-invalid={Boolean(form.formState.errors.baseLabel)}
          {...form.register("baseLabel")}
        />
        <FieldDescription>
          {formatNumber((baseLabel ?? "").trim().length)}/{formatNumber(MAX_TRIP_BASE_LABEL_LENGTH)}{" "}
          ký tự
        </FieldDescription>
        <FieldError>{form.formState.errors.baseLabel?.message}</FieldError>
      </Field>
    </FieldGroup>
  )
}
