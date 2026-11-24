import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { PlusCircleIcon } from "lucide-react"
import {
  createPlaceSubmissionInputSchema,
  type CreatePlaceSubmissionInput,
  type PlaceCategory,
} from "@rendez/schema"
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { DANANG_DISTRICTS } from "../lib/danang-districts"
import { CATEGORY_META, categoryLabel } from "../lib/category-meta"
import { useCreatePlaceSubmission } from "../hooks/use-create-place-submission"

interface SuggestPlaceDialogProps {
  readonly children?: React.ReactElement
}

const CATEGORY_KEYS = Object.keys(CATEGORY_META) as PlaceCategory[]

export function SuggestPlaceDialog({ children }: SuggestPlaceDialogProps) {
  const [open, setOpen] = useState(false)
  const [imageUrlDraft, setImageUrlDraft] = useState("")
  const submissionMutation = useCreatePlaceSubmission()

  const form = useForm<CreatePlaceSubmissionInput>({
    resolver: zodResolver(createPlaceSubmissionInputSchema),
    defaultValues: {
      name: "",
      address: "",
      city: "Đà Nẵng",
      district: "Hải Châu",
      category: "cafe",
      priceLevel: 1,
      openingHours: "",
      phone: "",
      description: "",
      imageUrls: [],
      tags: [],
    },
  })

  function onSubmit(values: CreatePlaceSubmissionInput) {
    const urls = imageUrlDraft.trim() ? [imageUrlDraft.trim()] : []
    submissionMutation.mutate(
      {
        ...values,
        imageUrls: urls,
      },
      {
        onSuccess: () => {
          form.reset()
          setImageDraft("")
          setOpen(false)
        },
      },
    )
  }

  function setImageDraft(val: string) {
    setImageUrlDraft(val)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          children ?? (
            <Button variant="outline" size="sm">
              <PlusCircleIcon className="size-4 text-primary" />
              Đề xuất địa điểm
            </Button>
          )
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Đề xuất địa điểm mới</DialogTitle>
          <DialogDescription>
            Gửi thông tin quán mới tại Đà Nẵng để kiểm duyệt và bổ sung lên bản đồ.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-3.5">
          <Field data-invalid={Boolean(form.formState.errors.name)}>
            <FieldLabel htmlFor="suggest-name">Tên địa điểm *</FieldLabel>
            <Input
              id="suggest-name"
              placeholder="VD: Cà phê Muối Chú Long, Mì Quảng Bà Mua..."
              {...form.register("name")}
            />
            {form.formState.errors.name ? (
              <FieldError>{form.formState.errors.name.message}</FieldError>
            ) : null}
          </Field>

          <Field data-invalid={Boolean(form.formState.errors.address)}>
            <FieldLabel htmlFor="suggest-address">Địa chỉ *</FieldLabel>
            <Input
              id="suggest-address"
              placeholder="VD: 123 Trần Phú..."
              {...form.register("address")}
            />
            {form.formState.errors.address ? (
              <FieldError>{form.formState.errors.address.message}</FieldError>
            ) : null}
          </Field>

          <Field>
            <FieldLabel>Quận / Huyện</FieldLabel>
            <Controller
              control={form.control}
              name="district"
              render={({ field }) => (
                <ToggleGroup
                  value={field.value ? [field.value] : []}
                  onValueChange={(next) => field.onChange(next[0])}
                  variant="outline"
                  size="sm"
                  className="flex-wrap"
                >
                  {DANANG_DISTRICTS.map((item) => (
                    <ToggleGroupItem
                      key={item}
                      value={item}
                      className="min-h-8 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                    >
                      {item}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              )}
            />
          </Field>

          <Field>
            <FieldLabel>Loại hình</FieldLabel>
            <Controller
              control={form.control}
              name="category"
              render={({ field }) => (
                <ToggleGroup
                  value={field.value ? [field.value] : []}
                  onValueChange={(next) => {
                    const cat = next[0] as PlaceCategory | undefined
                    if (cat) field.onChange(cat)
                  }}
                  variant="outline"
                  size="sm"
                  className="flex-wrap"
                >
                  {CATEGORY_KEYS.map((cat) => (
                    <ToggleGroupItem
                      key={cat}
                      value={cat}
                      className="min-h-8 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                    >
                      {categoryLabel(cat)}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              )}
            />
          </Field>

          <Field>
            <FieldLabel>Mức giá dự kiến</FieldLabel>
            <Controller
              control={form.control}
              name="priceLevel"
              render={({ field }) => (
                <ToggleGroup
                  value={field.value ? [String(field.value)] : []}
                  onValueChange={(next) => {
                    const val = next[0] ? (Number(next[0]) as 1 | 2 | 3) : null
                    field.onChange(val)
                  }}
                  variant="outline"
                  size="sm"
                  className="justify-start gap-1.5"
                >
                  <ToggleGroupItem
                    value="1"
                    size="sm"
                    className="px-3 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                  >
                    $ (Dưới 50k)
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="2"
                    size="sm"
                    className="px-3 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                  >
                    $$ (50k - 150k)
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="3"
                    size="sm"
                    className="px-3 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                  >
                    $$$ (Trên 150k)
                  </ToggleGroupItem>
                </ToggleGroup>
              )}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="suggest-hours">Giờ mở cửa</FieldLabel>
              <Input
                id="suggest-hours"
                placeholder="VD: 07:00 - 22:00"
                {...form.register("openingHours")}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="suggest-phone">Số điện thoại</FieldLabel>
              <Input
                id="suggest-phone"
                placeholder="VD: 0905 123 456"
                {...form.register("phone")}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="suggest-image">Link ảnh bìa (tuỳ chọn)</FieldLabel>
            <Input
              id="suggest-image"
              type="url"
              placeholder="https://..."
              value={imageUrlDraft}
              onChange={(e) => setImageDraft(e.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="suggest-desc">Mô tả / Lưu ý thêm</FieldLabel>
            <Textarea
              id="suggest-desc"
              placeholder="Điểm đặc sắc, món nên thử hoặc lưu ý gửi xe..."
              rows={3}
              {...form.register("description")}
            />
          </Field>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submissionMutation.isPending}
            >
              Huỷ
            </Button>
            <Button type="submit" disabled={submissionMutation.isPending}>
              {submissionMutation.isPending ? <Spinner aria-label="Đang gửi đề xuất" /> : null}
              Gửi đề xuất
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
