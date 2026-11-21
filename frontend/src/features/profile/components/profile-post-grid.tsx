import { Link } from "react-router"
import { CameraIcon, HeartIcon, ImagesIcon, MapPinIcon, MessageCircleIcon } from "lucide-react"
import { ErrorState } from "@/components/shared/error-state"
import { SafeImage } from "@/components/shared/safe-image"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import type { Post } from "@/features/social/types/post"
import { formatCount } from "@/lib/format"
import { cn } from "@/lib/utils"

const POST_SKELETON_HEIGHTS = ["h-56", "h-64", "h-60"] as const

interface ProfilePostGridProps {
  posts: Post[]
  isPending: boolean
  isError?: boolean
  onRetry?: () => void
  emptyTitle: string
  emptyDescription: string
}

export function ProfilePostGrid({
  posts,
  isPending,
  isError = false,
  onRetry,
  emptyTitle,
  emptyDescription,
}: ProfilePostGridProps) {
  if (isPending) {
    return (
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <li key={index}>
            <Skeleton className={cn("w-full rounded-surface", POST_SKELETON_HEIGHTS[index % 3])} />
          </li>
        ))}
      </ul>
    )
  }

  if (isError) {
    return (
      <ErrorState
        variant="plain"
        className="mt-6"
        title="Không tải được bài đăng"
        onRetry={onRetry}
      />
    )
  }

  if (posts.length === 0) {
    return (
      <Empty className="mt-6 border border-dashed border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CameraIcon />
          </EmptyMedia>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => {
        const firstImage = post.images[0]
        return (
          <li key={post.id} className="h-full">
            <Card className="group relative flex h-full flex-col gap-0 overflow-hidden border-border/80 py-0 shadow-(--shadow-soft) transition-all hover:-translate-y-0.5 hover:shadow-(--shadow-raised)">
              {firstImage ? (
                <div className="relative h-44 w-full overflow-hidden bg-muted">
                  <SafeImage
                    src={firstImage}
                    alt={post.caption.slice(0, 80)}
                    className="size-full transition-transform duration-500 group-hover:scale-105"
                  />
                  {post.images.length > 1 ? (
                    <Badge
                      variant="secondary"
                      className="absolute top-2 right-2 gap-1 bg-background/85 text-xs backdrop-blur-sm"
                    >
                      <ImagesIcon className="size-3" aria-hidden="true" />
                      {post.images.length}
                    </Badge>
                  ) : null}
                </div>
              ) : null}

              <CardContent className="flex flex-1 flex-col gap-2.5 p-4">
                {post.place ? (
                  <span className="inline-flex w-fit max-w-full items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    <MapPinIcon className="size-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">{post.place.name}</span>
                  </span>
                ) : null}

                <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-foreground">
                  <Link
                    to={`/post/${post.id}`}
                    className="outline-none after:absolute after:inset-0 focus-visible:underline"
                  >
                    {post.caption}
                  </Link>
                </p>

                <div className="flex items-center gap-3 border-t border-border/50 pt-2 text-xs text-muted-foreground tabular-nums">
                  <span className="flex items-center gap-1">
                    <HeartIcon className="size-3.5" aria-hidden="true" />
                    {formatCount(post.likeCount)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircleIcon className="size-3.5" aria-hidden="true" />
                    {formatCount(post.commentCount)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
