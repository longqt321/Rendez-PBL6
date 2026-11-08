import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { ArrowLeftIcon, LockIcon, PencilIcon, Trash2Icon, XIcon } from "lucide-react"
import { toast } from "sonner"
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
import { Card, CardContent } from "@/components/ui/card"
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
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Item, ItemGroup } from "@/components/ui/item"
import { Spinner } from "@/components/ui/spinner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ShareButton } from "@/components/shared/share-button"
import { PlaceCard } from "@/features/places/components/place-card"
import { usePlace } from "@/features/places/hooks/use-place"
import { useCollection } from "../hooks/use-collection"
import { useDeleteCollection, useSetCollectionPlace } from "../hooks/use-collections"
import { CollectionLikeButton } from "../components/collection-like-button"
import { EditCollectionDialog } from "../components/edit-collection-dialog"

interface CollectionPlaceItemProps {
  placeId: string
  /** Chỉ chủ sở hữu mới có nút bỏ địa điểm khỏi bộ sưu tập. */
  canRemove: boolean
  collectionId: string
}

/** Một địa điểm trong bộ sưu tập — tra riêng qua cache địa điểm. */
function CollectionPlaceItem({ placeId, canRemove, collectionId }: CollectionPlaceItemProps) {
  const { data: place, isPending } = usePlace(placeId)
  const setPlace = useSetCollectionPlace()

  if (isPending) {
    return (
      <div className="flex h-72 items-center justify-center rounded-md border bg-card text-sm text-muted-foreground">
        <Spinner /> Đang tải…
      </div>
    )
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
                className="absolute top-2 right-2 z-10 bg-background/90 backdrop-blur"
                aria-label={`Bỏ ${place.name} khỏi bộ sưu tập`}
                disabled={setPlace.isPending}
                onClick={handleRemove}
              />
            }
          >
            {setPlace.isPending ? <Spinner /> : <XIcon />}
          </TooltipTrigger>
          <TooltipContent>Bỏ khỏi bộ sưu tập</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  )
}

/** Trạng thái không tìm thấy bộ sưu tập — dùng chung cho thiếu `id` và lỗi tải. */
function CollectionNotFound() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
      <Empty className="mt-8">
        <EmptyHeader>
          <EmptyTitle>Không tìm thấy bộ sưu tập</EmptyTitle>
          <EmptyDescription>Bộ sưu tập có thể đã bị xoá hoặc link không đúng.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}

/** Trang chi tiết bộ sưu tập — `/collections/:id`. */
export function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: collection, isPending, isError } = useCollection(id ?? "")
  const deleteCollection = useDeleteCollection()
  const [confirming, setConfirming] = useState(false)

  if (!id) return <CollectionNotFound />

  if (isPending) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
        <p className="py-16 text-center text-sm text-muted-foreground">
          <Spinner /> Đang tải bộ sưu tập…
        </p>
      </div>
    )
  }

  if (isError || !collection) return <CollectionNotFound />

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

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
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

      <Card className="mt-4">
        <CardContent className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <h1 className="flex flex-wrap items-center gap-2 font-heading text-2xl font-bold tracking-tight">
              {collection.name}
              {collection.isPrivate ? (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <LockIcon className="size-3" aria-hidden="true" />
                  Riêng tư
                </Badge>
              ) : null}
            </h1>
            {collection.description ? (
              <p className="text-sm whitespace-pre-line text-muted-foreground">
                {collection.description}
              </p>
            ) : null}
            <p className="text-sm text-muted-foreground">
              {collection.placeIds.length} địa điểm ·{" "}
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
                  onClick={() => setConfirming(true)}
                >
                  <Trash2Icon />
                  Xoá
                </Button>
              </>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {collection.placeIds.length === 0 ? (
        <Empty className="mt-8">
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
      ) : (
        <ItemGroup className="mt-6 grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collection.placeIds.map((placeId) => (
            <Item key={placeId} role="listitem" className="h-full border-0 p-0 [&>*]:w-full">
              <CollectionPlaceItem
                placeId={placeId}
                canRemove={collection.isMine}
                collectionId={collection.id}
              />
            </Item>
          ))}
        </ItemGroup>
      )}

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
              {deleteCollection.isPending ? <Spinner /> : <Trash2Icon />}
              Xoá bộ sưu tập
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button variant="ghost" size="sm" className="mt-6" onClick={() => void navigate("/saved")}>
        <ArrowLeftIcon />
        Về trang Đã lưu
      </Button>
    </div>
  )
}
