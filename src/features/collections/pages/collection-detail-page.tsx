import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { ArrowLeftIcon, LockIcon, PencilIcon, Trash2Icon } from "lucide-react"
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
import { Spinner } from "@/components/ui/spinner"
import { PlaceCard } from "@/features/places/components/place-card"
import { usePlace } from "@/features/places/hooks/use-place"
import { useCollection } from "../hooks/use-collection"
import { useDeleteCollection } from "../hooks/use-collections"

/** Một địa điểm trong bộ sưu tập — tra riêng qua cache địa điểm. */
function CollectionPlaceItem({ placeId }: { placeId: string }) {
  const { data: place, isPending } = usePlace(placeId)

  if (isPending) {
    return (
      <div className="flex h-72 items-center justify-center rounded-md border bg-card text-sm text-muted-foreground">
        <Spinner /> Đang tải…
      </div>
    )
  }
  if (!place) return null
  return <PlaceCard place={place} />
}

/** Trang chi tiết bộ sưu tập — `/collections/:id`. */
export function CollectionDetailPage() {
  const { id } = useParams()
  const collectionId = id ?? ""
  const navigate = useNavigate()
  const { data: collection, isPending, isError } = useCollection(collectionId)
  const deleteCollection = useDeleteCollection()
  const [confirming, setConfirming] = useState(false)

  if (isPending) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
        <p className="py-16 text-center text-sm text-muted-foreground">
          <Spinner /> Đang tải bộ sưu tập…
        </p>
      </div>
    )
  }

  if (isError || !collection) {
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

      <header className="mt-4 flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="flex items-center gap-2 font-heading text-2xl font-bold tracking-tight">
            {collection.name}
            {collection.isPrivate ? (
              <Badge variant="secondary" className="gap-1 text-sm">
                <LockIcon className="size-3.5" aria-hidden="true" />
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
            {collection.placeIds.length} địa điểm · {collection.owner.name}
          </p>
        </div>
        {collection.isMine ? (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled
              title="Sửa thông tin bộ sưu tập sẽ ra mắt sau"
            >
              <PencilIcon />
              Sửa
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirming(true)}
            >
              <Trash2Icon />
              Xoá
            </Button>
          </div>
        ) : null}
      </header>

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
        <ul className="mt-6 grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collection.placeIds.map((placeId) => (
            <li key={placeId}>
              <CollectionPlaceItem placeId={placeId} />
            </li>
          ))}
        </ul>
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
