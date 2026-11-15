import { HeartIcon } from "lucide-react"
import { toast } from "sonner"
import { Toggle } from "@/components/ui/toggle"
import { formatCount } from "@/lib/format"
import { useSetCollectionLike } from "../hooks/use-collections"
import type { Collection } from "../types/collection"

interface CollectionLikeButtonProps {
  collection: Collection
}

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
    <Toggle
      variant="outline"
      size="sm"
      pressed={collection.likedByMe}
      disabled={setLike.isPending}
      onPressedChange={(pressed) =>
        setLike.mutate(
          { liked: pressed },
          {
            onError: () => toast.error("Không thả tim được, thử lại nhé"),
          },
        )
      }
    >
      <HeartIcon className={collection.likedByMe ? "fill-current text-destructive" : undefined} />
      {collection.likedByMe ? "Đã thích" : "Thích"}
      <span className="text-xs text-muted-foreground">{formatCount(collection.likeCount)}</span>
    </Toggle>
  )
}
