import { FolderIcon } from "lucide-react"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"
import { CollectionCard } from "@/features/collections/components/collection-card"
import { useUserCollections } from "@/features/collections/hooks/use-collection"

interface ProfileCollectionGridProps {
  handle: string
  /** Xem trang của chính mình — đổi câu chữ khi trống. */
  isMe: boolean
}

/**
 * Tab "Bộ sưu tập" ở trang cá nhân.
 *
 * Server đã ẩn bộ sưu tập riêng tư của người khác; ở trang của mình thì thấy cả
 * bộ riêng tư (có badge khoá).
 */
export function ProfileCollectionGrid({ handle, isMe }: ProfileCollectionGridProps) {
  const { data: collections, isPending, isError } = useUserCollections(handle)

  if (isPending) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        <Spinner aria-label="Đang tải bộ sưu tập" /> Đang tải bộ sưu tập…
      </p>
    )
  }

  if (isError) {
    return (
      <Empty className="mt-2">
        <EmptyHeader>
          <EmptyTitle>Không tải được bộ sưu tập</EmptyTitle>
          <EmptyDescription>Kiểm tra kết nối rồi thử lại.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  if (!collections || collections.length === 0) {
    return (
      <Empty className="mt-2">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderIcon />
          </EmptyMedia>
          <EmptyTitle>Chưa có bộ sưu tập công khai</EmptyTitle>
          <EmptyDescription>
            {isMe
              ? "Tạo bộ sưu tập từ trang địa điểm để gom những quán bạn thích."
              : "Người này chưa chia sẻ bộ sưu tập nào."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <ul className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
      {collections.map((collection) => (
        <li key={collection.id}>
          <CollectionCard collection={collection} />
        </li>
      ))}
    </ul>
  )
}
