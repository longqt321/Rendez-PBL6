import { useState } from "react"
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useUpdateCollection } from "../hooks/use-collections"
import type { Collection } from "../types/collection"

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
  const [name, setName] = useState(collection.name)
  const [description, setDescription] = useState(collection.description)
  const [isPrivate, setIsPrivate] = useState(collection.isPrivate)
  const updateCollection = useUpdateCollection(collection.id)

  const trimmedName = name.trim()
  const canSubmit =
    trimmedName.length > 0 &&
    trimmedName.length <= 80 &&
    description.trim().length <= 400 &&
    !updateCollection.isPending

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      // Mở lại thì nạp đúng dữ liệu hiện tại, kể cả khi lần trước bấm Huỷ.
      setName(collection.name)
      setDescription(collection.description)
      setIsPrivate(collection.isPrivate)
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) return

    updateCollection.mutate(
      { name: trimmedName, description: description.trim(), isPrivate },
      {
        onSuccess: () => {
          toast.success("Đã cập nhật bộ sưu tập")
          setOpen(false)
        },
        onError: () => toast.error("Không cập nhật được, thử lại nhé"),
      },
    )
  }

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
                value={name}
                onChange={(event) => setName(event.target.value.slice(0, 80))}
                maxLength={80}
                placeholder="Ví dụ: Quán hẹn hò"
                autoComplete="off"
              />
              <FieldDescription>{name.trim().length}/80 ký tự</FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="collection-description">Mô tả</FieldLabel>
              <Textarea
                id="collection-description"
                value={description}
                onChange={(event) => setDescription(event.target.value.slice(0, 400))}
                maxLength={400}
                rows={3}
                placeholder="Ghi chú ngắn để bạn nhớ vì sao lập bộ sưu tập này…"
                className="min-h-20 resize-none"
              />
              <FieldDescription>{description.trim().length}/400 ký tự</FieldDescription>
            </Field>

            <Field orientation="horizontal">
              <FieldLabel htmlFor="collection-private" className="flex-1">
                <LockIcon className="size-3.5" aria-hidden="true" />
                Riêng tư
              </FieldLabel>
              <Switch
                id="collection-private"
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
                aria-describedby="collection-private-hint"
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
            <Button type="submit" disabled={!canSubmit}>
              {updateCollection.isPending ? <Spinner /> : <CheckIcon />}
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
