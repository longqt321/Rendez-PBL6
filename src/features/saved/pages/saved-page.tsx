import { useState } from "react"
import { Link } from "react-router"
import { BookmarkIcon, FolderPlusIcon, MapIcon, MapPinIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"
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
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePosts } from "@/features/social/hooks/use-posts"
import { PostCard } from "@/features/social/components/post-card"
import { useCollections } from "@/features/collections/hooks/use-collection"
import { CollectionCard } from "@/features/collections/components/collection-card"
import { useTrips } from "@/features/trips/hooks/use-trips"
import { TripCard } from "@/features/trips/components/trip-card"
import { TripFormDialog } from "@/features/trips/components/trip-form-dialog"
import type { Trip } from "@/features/trips/types/trip"

/**
 * Trang bài đã lưu — `/saved`.
 *
 * Tab "Bài đăng" dùng `GET /posts?filter=saved` (server lọc `savedByMe`). Tab "Bộ sưu
 * tập" là danh sách bộ sưu tập của người dùng (xem chi tiết tại /collections/:id).
 * Tab "Chuyến đi" là danh sách chuyến đi lưu ở localStorage (xem chi tiết tại
 * /trips/:id), tạo/sửa qua TripFormDialog và xoá qua AlertDialog.
 */
export function SavedPage() {
  const { data: postsData, isPending } = usePosts({ filter: "saved" })
  const savedPosts = postsData?.items ?? []
  const { data: collections, isPending: collectionsPending } = useCollections()
  const { trips, createTrip, updateTrip, deleteTrip } = useTrips()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Trip | null>(null)
  const [deleting, setDeleting] = useState<Trip | null>(null)

  function openCreateForm() {
    setEditing(null)
    setFormOpen(true)
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts">Bài đăng</TabsTrigger>
          <TabsTrigger value="places">Địa điểm</TabsTrigger>
          <TabsTrigger value="collections">Bộ sưu tập</TabsTrigger>
          <TabsTrigger value="trips">Chuyến đi</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4">
          {isPending ? (
            <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-64 w-full rounded-md" />
              ))}
            </div>
          ) : savedPosts.length === 0 ? (
            <Empty className="mt-2">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BookmarkIcon />
                </EmptyMedia>
                <EmptyTitle>Chưa lưu bài nào</EmptyTitle>
                <EmptyDescription>
                  Nhấn biểu tượng Lưu trên bài đăng để thấy nó ở đây.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
              {savedPosts.map((post) => (
                <li key={post.id}>
                  <PostCard post={post} />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="places" className="mt-4">
          <Empty className="mt-2">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MapPinIcon />
              </EmptyMedia>
              <EmptyTitle>Chưa lưu địa điểm nào</EmptyTitle>
              <EmptyDescription>
                Dùng nút “Lưu vào bộ sưu tập” trên trang địa điểm để lưu. Xem{" "}
                <Link to="/discover" className="underline underline-offset-2">
                  Khám phá
                </Link>{" "}
                để tìm địa điểm mới.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </TabsContent>

        <TabsContent value="collections" className="mt-4">
          {collectionsPending ? (
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-40 w-full rounded-md" />
              ))}
            </div>
          ) : collections && collections.length > 0 ? (
            <ul className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {collections.map((collection) => (
                <li key={collection.id}>
                  <CollectionCard collection={collection} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty className="mt-2">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FolderPlusIcon />
                </EmptyMedia>
                <EmptyTitle>Chưa có bộ sưu tập nào</EmptyTitle>
                <EmptyDescription>
                  Mở một địa điểm và nhấn “Lưu vào bộ sưu tập” để tạo bộ sưu tập đầu tiên.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </TabsContent>

        <TabsContent value="trips" className="mt-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Chuyến đi của bạn</h2>
            <Button size="sm" onClick={openCreateForm}>
              <PlusIcon aria-hidden="true" />
              Tạo chuyến đi
            </Button>
          </div>

          {trips.length === 0 ? (
            <Empty className="mt-2">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MapIcon />
                </EmptyMedia>
                <EmptyTitle>Chưa có chuyến đi nào</EmptyTitle>
                <EmptyDescription>
                  Lên kế hoạch từng ngày cho chuyến thăm Đà Nẵng của bạn.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={openCreateForm}>Tạo chuyến đi</Button>
              </EmptyContent>
            </Empty>
          ) : (
            <ul className="mt-3 grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trips.map((trip) => (
                <li key={trip.id}>
                  <TripCard
                    trip={trip}
                    onEdit={(target) => {
                      setEditing(target)
                      setFormOpen(true)
                    }}
                    onDelete={setDeleting}
                  />
                </li>
              ))}
            </ul>
          )}

          <TripFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            trip={editing ?? undefined}
            onSubmit={(input) => {
              if (editing) {
                updateTrip(editing.id, input)
                toast.success("Đã cập nhật chuyến đi")
              } else {
                createTrip(input)
                toast.success("Đã tạo chuyến đi")
              }
              setFormOpen(false)
            }}
          />

          {deleting ? (
            <AlertDialog
              open
              onOpenChange={(open) => {
                if (!open) setDeleting(null)
              }}
            >
              <AlertDialogContent className="sm:max-w-sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>Xoá chuyến đi?</AlertDialogTitle>
                  <AlertDialogDescription>
                    “{deleting.name}” và kế hoạch các ngày sẽ bị xoá vĩnh viễn.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Giữ lại</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      deleteTrip(deleting.id)
                      toast.success("Đã xoá chuyến đi")
                      setDeleting(null)
                    }}
                  >
                    Xoá chuyến đi
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  )
}
