import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { MAX_COLLECTION_DESCRIPTION_LENGTH, MAX_COLLECTION_NAME_LENGTH } from "@rendez/schema"
import { ResponsiveModal } from "@/components/shared/responsive-modal"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useCreateCollection } from "../hooks/use-collections"

const createCollectionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Tên bộ sưu tập không được để trống")
    .max(MAX_COLLECTION_NAME_LENGTH, `Tối đa ${MAX_COLLECTION_NAME_LENGTH} ký tự`),
  description: z
    .string()
    .trim()
    .max(MAX_COLLECTION_DESCRIPTION_LENGTH, `Tối đa ${MAX_COLLECTION_DESCRIPTION_LENGTH} ký tự`),
  isPrivate: z.boolean(),
})

type CreateCollectionValues = z.infer<typeof createCollectionSchema>

interface CreateCollectionDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

export function CreateCollectionDialog({ open, onOpenChange }: CreateCollectionDialogProps) {
  const createCollection = useCreateCollection()
  const form = useForm<CreateCollectionValues>({
    resolver: zodResolver(createCollectionSchema),
    defaultValues: { name: "", description: "", isPrivate: false },
  })

  useEffect(() => {
    if (open) {
      form.reset({ name: "", description: "", isPrivate: false })
    }
  }, [open, form])

  function onSubmit(values: CreateCollectionValues) {
    createCollection.mutate(
      {
        name: values.name,
        description: values.description || undefined,
        isPrivate: values.isPrivate,
      },
      {
        onSuccess: (created) => {
          toast.success(`Đã tạo bộ sưu tập “${created.name}”`)
          onOpenChange(false)
        },
        onError: () => toast.error("Không tạo được bộ sưu tập, thử lại nhé"),
      },
    )
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Tạo bộ sưu tập mới"
      description="Gom các quán yêu thích thành danh sách theo chủ đề"
    >
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="flex flex-col gap-4">
        <Field data-invalid={Boolean(form.formState.errors.name)}>
          <FieldLabel htmlFor="create-collection-name">Tên bộ sưu tập</FieldLabel>
          <Input
            id="create-collection-name"
            placeholder="Ví dụ: Cà phê học bài Hải Châu"
            aria-invalid={Boolean(form.formState.errors.name)}
            aria-describedby={form.formState.errors.name ? "create-collection-name-err" : undefined}
            {...form.register("name")}
          />
          <FieldError id="create-collection-name-err" errors={[form.formState.errors.name]} />
        </Field>

        <Field data-invalid={Boolean(form.formState.errors.description)}>
          <FieldLabel htmlFor="create-collection-desc">Mô tả (tuỳ chọn)</FieldLabel>
          <Textarea
            id="create-collection-desc"
            rows={3}
            placeholder="Ghi chú ngắn cho danh sách này..."
            aria-invalid={Boolean(form.formState.errors.description)}
            aria-describedby={
              form.formState.errors.description ? "create-collection-desc-err" : undefined
            }
            {...form.register("description")}
          />
          <FieldError
            id="create-collection-desc-err"
            errors={[form.formState.errors.description]}
          />
        </Field>

        <div className="flex items-center justify-between rounded-control border border-border px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">Riêng tư</p>
            <p className="text-xs text-muted-foreground">Chỉ mình bạn nhìn thấy bộ sưu tập này</p>
          </div>
          <Controller
            control={form.control}
            name="isPrivate"
            render={({ field }) => (
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-label="Đặt bộ sưu tập ở chế độ riêng tư"
              />
            )}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button type="submit" disabled={createCollection.isPending}>
            {createCollection.isPending ? <Spinner aria-label="Đang tạo bộ sưu tập" /> : null}
            Tạo bộ sưu tập
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  )
}
