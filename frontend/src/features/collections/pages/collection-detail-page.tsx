import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import {
  ArrowLeftIcon,
  LockIcon,
  LogInIcon,
  MessageCircleIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UsersIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"
import { PageContainer, SurfaceCard } from "@/components/layout/page-primitives"
import { ErrorState } from "@/components/shared/error-state"
import { ShareButton } from "@/components/shared/share-button"
import { SendToFriendDialog } from "@/features/messages/components/send-to-friend-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { PlaceCard } from "@/features/places/components/place-card"
import { PlaceCardSkeleton } from "@/features/places/components/place-card-skeleton"
import { usePlace } from "@/features/places/hooks/use-place"
import { useMe } from "@/features/profile/hooks/use-me"
import { isNotFoundError, isUnauthorizedError } from "@/lib/axios"
import { CollectionLikeButton } from "../components/collection-like-button"
import { EditCollectionDialog } from "../components/edit-collection-dialog"
import { SortableCollectionPlaces } from "../components/sortable-collection-places"
import { useCollection, useUpdateCollectionPlaceNote } from "../hooks/use-collection"
import { useDeleteCollection, useSetCollectionPlace } from "../hooks/use-collections"
import type { Place } from "@/features/places/types/place"
import type { Collection } from "../types/collection"

interface CollectionPlaceItemProps {
  readonly placeId: string
  readonly initialPlace?: Place
  readonly canRemove: boolean
  readonly collectionId: string
}

function CollectionPlaceItem({
  placeId,
  initialPlace,
  canRemove,
  collectionId,
}: CollectionPlaceItemProps) {
  const { data: fetchedPlace, isPending } = usePlace(initialPlace ? "" : placeId)
  const place = initialPlace ?? fetchedPlace
  const setPlace = useSetCollectionPlace()
  const updateNoteMutation = useUpdateCollectionPlaceNote(collectionId)

  const [editingNote, setEditingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState(place?.note ?? "")

  if (!initialPlace && isPending) {
    return <PlaceCardSkeleton imageHeight={200} />
  }
  if (!place) return null

  function handleRemove() {
    setPlace.mutate(
      { id: collectionId, placeId, member: false },
      {
        onSuccess: () => toast.success(`Đã bỏ “${place?.name}” khỏi bộ sưu tập`),
        onError: () => toast.error("Không bỏ được, thử lại nhé"),
      },
    )
  }

  function handleSaveNote() {
    updateNoteMutation.mutate(
      { placeId, note: noteDraft.trim() || null },
      {
        onSuccess: () => {
          setEditingNote(false)
        },
      },
    )
  }

  const currentNote = place.note

  return (
    <div className="relative flex h-full flex-col">
      <div className="relative">
        <PlaceCard place={place} />
        {canRemove ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="absolute top-2.5 right-2.5 z-10 bg-background/90 backdrop-blur"
                  aria-label={`Bỏ ${place.name} khỏi bộ sưu tập`}
                  disabled={setPlace.isPending}
                  onClick={handleRemove}
                />
              }
            >
              {setPlace.isPending ? <Spinner aria-label="Đang bỏ địa điểm" /> : <XIcon />}
            </TooltipTrigger>
            <TooltipContent>Bỏ khỏi bộ sưu tập</TooltipContent>
          </Tooltip>
        ) : null}
      </div>

      {currentNote ? (
        <div className="mt-2 rounded-control border border-border/60 bg-muted/40 p-2.5 text-xs text-muted-foreground">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-foreground">Ghi chú Food Tour:</span>
            {canRemove ? (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  setNoteDraft(currentNote)
                  setEditingNote((prev) => !prev)
                }}
                aria-label="Sửa ghi chú"
              >
                <PencilIcon className="size-3" />
              </Button>
            ) : null}
          </div>
          <p className="mt-1 leading-relaxed whitespace-pre-line">{currentNote}</p>
        </div>
      ) : canRemove && !editingNote ? (
        <Button
          variant="ghost"
          size="sm"
          className="mt-1.5 h-6 justify-start px-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => {
            setNoteDraft("")
            setEditingNote(true)
          }}
        >
          <PlusIcon className="mr-1 size-3" />
          Thêm ghi chú food tour
        </Button>
      ) : null}

      {editingNote ? (
        <div className="mt-2 space-y-1.5 rounded-control border border-border bg-card p-2">
          <Input
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="VD: Món nên thử, ghé lúc 15h, gửi xe đối diện..."
            className="h-8 text-xs"
          />
          <div className="flex justify-end gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => setEditingNote(false)}
            >
              Huỷ
            </Button>
            <Button
              size="sm"
              className="h-6 text-xs"
              onClick={handleSaveNote}
              disabled={updateNoteMutation.isPending}
            >
              {updateNoteMutation.isPending ? <Spinner aria-label="Đang lưu" /> : null}
              Lưu
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function CollectionNotFound() {
  return (
    <PageContainer size="wide">
      <h1 className="sr-only">Không tìm thấy bộ sưu tập</h1>
      <Empty className="mt-8">
        <EmptyHeader>
          <EmptyTitle>Không tìm thấy bộ sưu tập</EmptyTitle>
          <EmptyDescription>Bộ sưu tập có thể đã bị xoá hoặc link không đúng.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </PageContainer>
  )
}

interface CollectionHeaderCardProps {
  readonly collection: Collection
  readonly onDeleteClick: () => void
}

function CollectionHeaderCard({ collection, onDeleteClick }: CollectionHeaderCardProps) {
  const [shareFriendOpen, setShareFriendOpen] = useState(false)
  return (
    <SurfaceCard variant="accent" padding="lg" className="mt-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {collection.name}
            </h1>
            {collection.isPrivate ? (
              <Badge variant="secondary" className="gap-1 text-xs">
                <LockIcon className="size-3" aria-hidden="true" />
                Riêng tư
              </Badge>
            ) : null}
          </div>
          {collection.description ? (
            <p className="max-w-2xl text-sm leading-relaxed break-words whitespace-pre-line text-muted-foreground">
              {collection.description}
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground tabular-nums">
            <span className="font-semibold text-foreground">{collection.placeIds.length}</span> địa
            điểm ·{" "}
            {collection.isMine ? (
              collection.owner.name
            ) : (
              <Link
                to={`/u/${collection.owner.handle}`}
                className="underline underline-offset-2 hover:text-foreground"
              >
                {collection.owner.name}
              </Link>
            )}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {collection.placeIds.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              render={
                <Link
                  to={`/rooms/new?places=${encodeURIComponent(collection.placeIds.join(","))}`}
                />
              }
            >
              <UsersIcon className="size-4" />
              Lập phòng nhóm từ bộ sưu tập
            </Button>
          ) : null}
          <CollectionLikeButton collection={collection} />
          <ShareButton
            title={`Bộ sưu tập “${collection.name}”`}
            url={`/collections/${collection.id}`}
          />
          <Button variant="outline" size="sm" onClick={() => setShareFriendOpen(true)}>
            <MessageCircleIcon className="size-4" />
            Gửi cho bạn bè
          </Button>
          <SendToFriendDialog
            open={shareFriendOpen}
            onOpenChange={setShareFriendOpen}
            attachment={{
              type: "collection",
              id: collection.id,
              title: collection.name,
              subtitle: collection.description || `${collection.placeIds.length} địa điểm`,
            }}
          />
          {collection.isMine ? (
            <>
              <EditCollectionDialog collection={collection}>
                <Button variant="outline" size="sm">
                  <PencilIcon />
                  Sửa
                </Button>
              </EditCollectionDialog>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={onDeleteClick}
              >
                <Trash2Icon />
                Xoá
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </SurfaceCard>
  )
}

function CollectionPlacesList({ collection }: Readonly<{ collection: Collection }>) {
  if (collection.placeIds.length === 0) {
    return (
      <Empty className="mt-8 border border-dashed border-border">
        <EmptyHeader>
          <EmptyTitle>Bộ sưu tập đang trống</EmptyTitle>
          <EmptyDescription>
            Mở một{" "}
            <Link to="/discover" className="underline underline-offset-2">
              địa điểm
            </Link>{" "}
            và nhấn “Lưu vào bộ sưu tập”.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }
  const placesById = new Map((collection.places ?? []).map((p) => [p.id, p]))
  return (
    <SortableCollectionPlaces
      collectionId={collection.id}
      placeIds={collection.placeIds}
      canReorder={collection.isMine}
      renderItem={(placeId) => (
        <CollectionPlaceItem
          placeId={placeId}
          initialPlace={placesById.get(placeId)}
          canRemove={collection.isMine}
          collectionId={collection.id}
        />
      )}
    />
  )
}

export function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: collection, isPending, isError, error, refetch } = useCollection(id ?? "")
  const deleteCollection = useDeleteCollection()
  const [confirming, setConfirming] = useState(false)
  const { data: me, error: meError } = useMe()
  const isGuest = !me && isUnauthorizedError(meError)

  if (!id) return <CollectionNotFound />

  if (isPending) {
    return (
      <PageContainer size="wide">
        <h1 className="sr-only">Chi tiết bộ sưu tập</h1>
        <p className="py-16 text-center text-sm text-muted-foreground">
          <Spinner aria-label="Đang tải bộ sưu tập" /> Đang tải bộ sưu tập…
        </p>
      </PageContainer>
    )
  }

  if (isError || !collection) {
    const notFound = isNotFoundError(error) || (!isError && !collection)
    return (
      <PageContainer size="wide">
        <h1 className="sr-only">{notFound ? "Không tìm thấy bộ sưu tập" : "Lỗi tải bộ sưu tập"}</h1>
        <ErrorState
          className="mt-8"
          title={notFound ? "Không tìm thấy bộ sưu tập" : "Không tải được bộ sưu tập"}
          description={notFound ? "Bộ sưu tập có thể đã bị xoá hoặc link không đúng." : undefined}
          onRetry={
            notFound
              ? undefined
              : () => {
                  refetch().catch(() => {})
                }
          }
        />
      </PageContainer>
    )
  }

  const collectionId = collection.id

  function handleDelete() {
    deleteCollection.mutate(collectionId, {
      onSuccess: () => {
        toast.success(`Đã xoá bộ sưu tập “${collection?.name}”`)
        void navigate("/saved")
      },
      onError: () => toast.error("Không xoá được, thử lại nhé"),
    })
  }

  const targetPath = `/collections/${collection.id}`
  const loginNextUrl = `/login?next=${encodeURIComponent(targetPath)}`

  return (
    <PageContainer size="wide">
      {isGuest ? null : (
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link to="/saved" />}>Đã lưu</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{collection.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )}

      <CollectionHeaderCard collection={collection} onDeleteClick={() => setConfirming(true)} />

      <CollectionPlacesList collection={collection} />

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá bộ sưu tập?</AlertDialogTitle>
            <AlertDialogDescription>
              “{collection.name}” và danh sách địa điểm trong đó sẽ bị xoá vĩnh viễn. Các địa điểm
              vẫn còn nguyên ở Khám phá.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Giữ lại</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteCollection.isPending}
            >
              {deleteCollection.isPending ? (
                <Spinner aria-label="Đang xoá bộ sưu tập" />
              ) : (
                <Trash2Icon />
              )}
              Xoá bộ sưu tập
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isGuest ? (
        <Button variant="outline" size="sm" className="mt-6" render={<Link to={loginNextUrl} />}>
          <LogInIcon />
          Đăng nhập để lưu bộ sưu tập
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="mt-6"
          onClick={() => {
            void navigate("/saved")
          }}
        >
          <ArrowLeftIcon />
          Về trang Đã lưu
        </Button>
      )}
    </PageContainer>
  )
}
