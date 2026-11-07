import { useState } from "react"
import { CheckIcon, PlusIcon } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { useCollections } from "../hooks/use-collection"
import { useCreateCollection, useSetCollectionPlace } from "../hooks/use-collections"
import type { CollectionSummary } from "../types/collection"

interface SaveToCollectionDialogProps {
  placeId: string
  placeName: string
  children: React.ReactElement
}

/**
 * Dialog chọn bộ sưu tập để lưu/bỏ một địa điểm, kèm form tạo nhanh bộ sưu tập
 * mới. Mỗi mục là một Item với Switch — bật/tắt cập nhật thành viên ngay (idempotent).
 */
export function SaveToCollectionDialog({
  placeId,
  placeName,
  children,
}: SaveToCollectionDialogProps) {
  const [open, setOpen] = useState(false)
  const { data: collections, isPending } = useCollections({ placeId })
  const setPlace = useSetCollectionPlace()
  const createCollection = useCreateCollection()
  const [newName, setNewName] = useState("")
  const [newPrivate, setNewPrivate] = useState(false)

  function reset() {
    setNewName("")
    setNewPrivate(false)
  }

  function handleToggle(collection: CollectionSummary, member: boolean) {
    setPlace.mutate(
      { id: collection.id, placeId, member },
      {
        onSuccess: () => {
          toast.success(
            member ? `Đã lưu vào “${collection.name}”` : `Đã bỏ khỏi “${collection.name}”`,
          )
        },
        onError: () => toast.error("Không lưu được, thử lại nhé"),
      },
    )
  }

  async function handleCreate() {
    const name = newName.trim()
    if (name.length === 0) return
    const collection = await createCollection.mutateAsync({
      name,
      isPrivate: newPrivate,
    })
    setNewName("")
    setNewPrivate(false)
    // Tự động lưu địa điểm đang mở vào bộ sưu tập vừa tạo
    setPlace.mutate(
      { id: collection.id, placeId, member: true },
      {
        onSuccess: () => toast.success(`Đã tạo “${name}” và lưu ${placeName}`),
        onError: () => toast.error(`Đã tạo “${name}” nhưng chưa lưu được địa điểm`),
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger render={children} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lưu “{placeName}” vào bộ sưu tập</DialogTitle>
          <DialogDescription>
            Bật công tắc để lưu, tắt để bỏ khỏi bộ sưu tập. Một địa điểm nằm trong nhiều bộ sưu tập
            được.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-64 flex-col overflow-y-auto" role="list">
          {isPending ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              <Spinner /> Đang tải bộ sưu tập…
            </p>
          ) : collections && collections.length > 0 ? (
            <ItemGroup className="gap-1 p-0">
              {collections.map((collection) => {
                const active = collection.containsPlace ?? false
                const switchId = `collection-switch-${collection.id}`
                return (
                  <Item
                    key={collection.id}
                    role="listitem"
                    variant="muted"
                    size="sm"
                    className="cursor-pointer justify-between transition-colors hover:bg-accent"
                    onClick={() => {
                      if (!setPlace.isPending) {
                        handleToggle(collection, !active)
                      }
                    }}
                  >
                    <ItemContent className="cursor-pointer">
                      <ItemTitle>
                        <Label
                          htmlFor={switchId}
                          className="cursor-pointer font-medium"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {collection.name}
                        </Label>
                        {collection.isPrivate ? (
                          <span className="text-xs text-muted-foreground">(Riêng tư)</span>
                        ) : null}
                      </ItemTitle>
                      <ItemDescription>{collection.placeCount} địa điểm</ItemDescription>
                    </ItemContent>
                    <ItemActions onClick={(event) => event.stopPropagation()}>
                      <Switch
                        id={switchId}
                        checked={active}
                        disabled={setPlace.isPending}
                        onCheckedChange={(checked) => handleToggle(collection, checked)}
                      />
                    </ItemActions>
                  </Item>
                )
              })}
            </ItemGroup>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Chưa có bộ sưu tập nào — tạo bên dưới.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 rounded-md border p-3">
          <Label htmlFor="new-collection-name" className="text-sm">
            Tạo bộ sưu tập mới
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="new-collection-name"
              value={newName}
              onChange={(event) => setNewName(event.target.value.slice(0, 80))}
              placeholder="Ví dụ: Quán hẹn hò"
              maxLength={80}
            />
            <Button
              type="button"
              variant="outline"
              disabled={newName.trim().length === 0 || createCollection.isPending}
              onClick={() => void handleCreate()}
            >
              {createCollection.isPending ? <Spinner /> : <PlusIcon />}
              Tạo
            </Button>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={newPrivate} onCheckedChange={setNewPrivate} />
            Riêng tư (không hiện ở trang cá nhân)
          </label>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            <CheckIcon />
            Xong
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
