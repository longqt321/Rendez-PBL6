import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { ArrowLeftIcon, LockIcon, LogInIcon, PencilIcon, Trash2Icon, XIcon } from "lucide-react"
import { toast } from "sonner"
import { PageContainer, SurfaceCard } from "@/components/layout/page-primitives"
import { ErrorState } from "@/components/shared/error-state"
import { ShareButton } from "@/components/shared/share-button"
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
import { useCollection } from "../hooks/use-collection"
import { useDeleteCollection, useSetCollectionPlace } from "../hooks/use-collections"
import type { Collection } from "../types/collection"

interface CollectionPlaceItemProps {
  readonly placeId: string
  readonly canRemove: boolean
  readonly collectionId: string
}

function CollectionPlaceItem({ placeId, canRemove, collectionId }: CollectionPlaceItemProps) {
  const { data: place, isPending } = usePlace(placeId)
  const setPlace = useSetCollectionPlace()

  if (isPending) {
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

  return (
    <div className="relative h-full">
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
          <CollectionLikeButton collection={collection} />
          <ShareButton
            title={`Bộ sưu tập “${collection.name}”`}
            url={`/collections/${collection.id}`}
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
  return (
    <SortableCollectionPlaces
      collectionId={collection.id}
      placeIds={collection.placeIds}
      canReorder={collection.isMine}
      renderItem={(placeId) => (
        <CollectionPlaceItem
          placeId={placeId}
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
