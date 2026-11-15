import { Link } from "react-router"
import { CameraIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { ErrorState } from "@/components/shared/error-state"
import { Card } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import type { Post } from "@/features/social/types/post"

const POST_SKELETON_HEIGHTS = ["h-65", "h-80", "h-95"] as const

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
      <ul className="grid grid-cols-2 items-start gap-4 md:grid-cols-3">
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
      <Empty className="mt-6">
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
    <ul className="grid grid-cols-2 items-start gap-4 md:grid-cols-3">
      {posts.map((post) => (
        <li key={post.id}>
          <Link
            to={`/post/${post.id}`}
            className="block transition-transform hover:-translate-y-0.5"
          >
            <Card size="sm" className="gap-0 py-0">
              <p className="line-clamp-2 px-2.5 py-2 text-xs leading-snug">{post.caption}</p>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  )
}
