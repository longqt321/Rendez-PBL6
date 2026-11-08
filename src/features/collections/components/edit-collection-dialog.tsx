import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"
import { z } from "zod"
import { CheckIcon, LockIcon } from "lucide-react"
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { MAX_COLLECTION_DESCRIPTION_LENGTH, MAX_COLLECTION_NAME_LENGTH } from "@/lib/constants"
import { formatNumber } from "@/lib/format"
import { useUpdateCollection } from "../hooks/use-collections"
import type { Collection } from "../types/collection"

const editCollectionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Tên bộ sưu tập không được để trống")
    .max(MAX_COLLECTION_NAME_LENGTH, `Tên tối đa ${MAX_COLLECTION_NAME_LENGTH} ký tự`),
  description: z
    .string()
    .trim()
    .max(
      MAX_COLLECTION_DESCRIPTION_LENGTH,
      `Mô tả tối đa ${MAX_COLLECTION_DESCRIPTION_LENGTH} ký tự`,
    ),
  isPrivate: z.boolean(),
})

type EditCollectionForm = z.infer<typeof editCollectionSchema>

interface EditCollectionDialogProps {
  collection: Collection
  children: React.ReactElement
}

/**
 * Modal sửa thông tin bộ sưu tập: tên, mô tả, trạng thái công khai.
 *
 * Chỉ chủ sở hữu mới thấy nút mở (trang chi tiết đã chặn bằng `collection.isMine`).
 * Ràng buộc khớp server: tên 1–80 ký tự, mô tả tối đa 400.
 */
export function EditCollectionDialog({ collection, children }: EditCollectionDialogProps) {
  const [open, setOpen] = useState(false)
  const updateCollection = useUpdateCollection(collection.id)

  const form = useForm<EditCollectionForm>({
    resolver: zodResolver(editCollectionSchema),
    defaultValues: {
      name: collection.name,
      description: collection.description,
      isPrivate: collection.isPrivate,
    },
  })
  const name = useWatch({ control: form.control, name: "name" })
  const description = useWatch({ control: form.control, name: "description" })
  const isPrivate = useWatch({ control: form.control, name: "isPrivate" })

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      // Mở lại thì nạp đúng dữ liệu hiện tại, kể cả khi lần trước bấm Huỷ.
      form.reset({
        name: collection.name,
        description: collection.description,
        isPrivate: collection.isPrivate,
      })
    }
  }

  const handleSubmit = form.handleSubmit((values) => {
    updateCollection.mutate(values, {
      onSuccess: () => {
        toast.success("Đã cập nhật bộ sưu tập")
        setOpen(false)
      },
      onError: () => toast.error("Không cập nhật được, thử lại nhé"),
    })
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={children} />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Sửa bộ sưu tập</DialogTitle>
            <DialogDescription>
              Đổi tên, mô tả và quyền riêng tư. Địa điểm trong bộ sưu tập không bị ảnh hưởng.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="collection-name">Tên bộ sưu tập</FieldLabel>
              <Input
                id="collection-name"
                maxLength={MAX_COLLECTION_NAME_LENGTH}
                placeholder="Ví dụ: Quán hẹn hò"
                autoComplete="off"
                aria-invalid={Boolean(form.formState.errors.name)}
                {...form.register("name")}
              />
              <FieldDescription>
                {formatNumber(name.trim().length)}/{formatNumber(MAX_COLLECTION_NAME_LENGTH)} ký tự
              </FieldDescription>
              <FieldError>{form.formState.errors.name?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="collection-description">Mô tả</FieldLabel>
              <Textarea
                id="collection-description"
                maxLength={MAX_COLLECTION_DESCRIPTION_LENGTH}
                rows={3}
                placeholder="Ghi chú ngắn để bạn nhớ vì sao lập bộ sưu tập này…"
                className="min-h-20 resize-none"
                aria-invalid={Boolean(form.formState.errors.description)}
                {...form.register("description")}
              />
              <FieldDescription>
                {formatNumber(description.trim().length)}/
                {formatNumber(MAX_COLLECTION_DESCRIPTION_LENGTH)} ký tự
              </FieldDescription>
              <FieldError>{form.formState.errors.description?.message}</FieldError>
            </Field>

            <Field orientation="horizontal">
              <FieldLabel htmlFor="collection-private" className="flex-1">
                <LockIcon className="size-3.5" aria-hidden="true" />
                Riêng tư
              </FieldLabel>
              {/* base-ui Switch không nhận ref/onChange → bắt buộc đi qua Controller. */}
              <Controller
                control={form.control}
                name="isPrivate"
                render={({ field }) => (
                  <Switch
                    id="collection-private"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-describedby="collection-private-hint"
                  />
                )}
              />
            </Field>
            <p id="collection-private-hint" className="-mt-2 text-xs text-muted-foreground">
              {isPrivate
                ? "Chỉ mình bạn thấy bộ sưu tập này ở trang cá nhân."
                : "Mọi người xem được ở trang cá nhân của bạn."}
            </p>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Huỷ
            </Button>
            <Button type="submit" disabled={updateCollection.isPending}>
              {updateCollection.isPending ? (
                <Spinner aria-label="Đang lưu bộ sưu tập" />
              ) : (
                <CheckIcon />
              )}
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
