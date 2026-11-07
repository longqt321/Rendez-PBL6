import { HeartIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { formatCount } from "@/lib/format"
import { useSetCollectionLike } from "../hooks/use-collections"
import type { Collection } from "../types/collection"

interface CollectionLikeButtonProps {
  collection: Collection
}

/**
 * Nút thả tim bộ sưu tập.
 *
 * Bộ sưu tập của chính mình thì chỉ hiện số tim (không bấm được) — server cũng
 * từ chối tự thả tim. Optimistic nên số đổi ngay khi bấm.
 */
export function CollectionLikeButton({ collection }: CollectionLikeButtonProps) {
  const setLike = useSetCollectionLike(collection.id)

  if (collection.isMine) {
    return (
      <span
        className="flex items-center gap-1.5 text-sm text-muted-foreground"
        aria-label={`${collection.likeCount} lượt thích`}
      >
        <HeartIcon className="size-4" aria-hidden="true" />
        {formatCount(collection.likeCount)}
      </span>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      aria-pressed={collection.likedByMe}
      disabled={setLike.isPending}
      onClick={() =>
        setLike.mutate(
          { liked: !collection.likedByMe },
          {
            onError: () => toast.error("Không thả tim được, thử lại nhé"),
          },
        )
      }
    >
      <HeartIcon className={collection.likedByMe ? "fill-current text-destructive" : undefined} />
      {collection.likedByMe ? "Đã thích" : "Thích"}
      <span className="text-xs text-muted-foreground">{formatCount(collection.likeCount)}</span>
    </Button>
  )
}
