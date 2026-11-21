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
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { MAX_COLLECTION_NAME_LENGTH } from "@/lib/constants"
import { useCollections } from "../hooks/use-collection"
import { useCreateCollection, useSetCollectionPlace } from "../hooks/use-collections"
import type { CollectionSummary } from "../types/collection"

interface SaveToCollectionDialogProps {
  readonly placeId: string
  readonly placeName: string
  readonly children: React.ReactElement
}

interface CollectionDialogListProps {
  readonly isPending: boolean
  readonly collections?: CollectionSummary[]
  readonly isSetPlacePending: boolean
  readonly onToggle: (collection: CollectionSummary, member: boolean) => void
}

function CollectionDialogList({
  isPending,
  collections,
  isSetPlacePending,
  onToggle,
}: CollectionDialogListProps) {
  if (isPending) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        <Spinner aria-label="Đang tải bộ sưu tập" /> Đang tải bộ sưu tập…
      </p>
    )
  }
  if (!collections || collections.length === 0) {
    return (
      <Empty className="border border-dashed border-border">
        <EmptyHeader>
          <EmptyTitle>Chưa có bộ sưu tập nào. Hãy tạo bên dưới.</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }
  return (
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
              if (!isSetPlacePending) {
                onToggle(collection, !active)
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
                disabled={isSetPlacePending}
                onCheckedChange={(checked) => onToggle(collection, checked)}
              />
            </ItemActions>
          </Item>
        )
      })}
    </ItemGroup>
  )
}

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

  function handleCreate() {
    const name = newName.trim()
    if (name.length === 0) return
    createCollection.mutate(
      { name, isPrivate: newPrivate },
      {
        onSuccess: (collection) => {
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
        },
        onError: () => toast.error("Không tạo được bộ sưu tập, thử lại nhé"),
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

        <div className="max-h-64 overflow-y-auto">
          <CollectionDialogList
            isPending={isPending}
            collections={collections}
            isSetPlacePending={setPlace.isPending}
            onToggle={handleToggle}
          />
        </div>

        <div className="flex flex-col gap-2 rounded-md border p-3">
          <Field>
            <FieldLabel htmlFor="new-collection-name">Tạo bộ sưu tập mới</FieldLabel>
            <div className="flex items-center gap-2">
              <Input
                id="new-collection-name"
                value={newName}
                onChange={(event) =>
                  setNewName(event.target.value.slice(0, MAX_COLLECTION_NAME_LENGTH))
                }
                placeholder="Ví dụ: Quán hẹn hò"
                maxLength={MAX_COLLECTION_NAME_LENGTH}
              />
              <Button
                type="button"
                variant="outline"
                disabled={newName.trim().length === 0 || createCollection.isPending}
                onClick={handleCreate}
              >
                {createCollection.isPending ? (
                  <Spinner aria-label="Đang tạo bộ sưu tập" />
                ) : (
                  <PlusIcon />
                )}
                Tạo
              </Button>
            </div>
          </Field>
          <Field orientation="horizontal">
            <FieldLabel
              htmlFor="new-collection-private"
              className="flex-1 text-sm text-muted-foreground"
            >
              Riêng tư (không hiện ở trang cá nhân)
            </FieldLabel>
            <Switch
              id="new-collection-private"
              checked={newPrivate}
              onCheckedChange={setNewPrivate}
            />
          </Field>
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
