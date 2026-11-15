import { MessageCircleIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { ItemGroup, ItemSeparator } from "@/components/ui/item"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { useComments } from "../hooks/use-comments"
import type { Comment, CommentSort } from "../types/comment"
import { CommentItem } from "./comment-item"

interface CommentListProps {
  postId: string
  sort: CommentSort
  onReply: (comment: Comment) => void
  onDelete: (comment: Comment) => void

  className?: string
}

export function CommentList({ postId, sort, onReply, onDelete, className }: CommentListProps) {
  const { data, isPending, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useComments(
    postId,
    sort,
  )

  if (isPending) {
    return (
      <div className="flex flex-col gap-3 px-1 py-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex gap-2.5">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3.5 w-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <Empty className="py-6">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MessageCircleIcon />
          </EmptyMedia>
          <EmptyTitle>Không tải được bình luận</EmptyTitle>
          <EmptyDescription>Đã có lỗi khi lấy dữ liệu. Thử lại sau.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const comments = data.pages.flatMap((page) => page.items)

  if (comments.length === 0) {
    return (
      <Empty className="py-6">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MessageCircleIcon />
          </EmptyMedia>
          <EmptyTitle>Chưa có bình luận</EmptyTitle>
          <EmptyDescription>Hãy là người đầu tiên bình luận cho bài này.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <ScrollArea className={className}>
      <ItemGroup className="gap-0 px-1">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className={
              comment.parentId !== null
                ? "ml-8 border-l border-dashed border-border pl-3"
                : undefined
            }
          >
            <CommentItem comment={comment} onReply={onReply} onDelete={onDelete} />
            <ItemSeparator />
          </div>
        ))}
      </ItemGroup>

      {hasNextPage && (
        <div className="flex justify-center py-2">
          <Button
            variant="link"
            size="sm"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            {isFetchingNextPage ? "Đang tải…" : "Xem thêm bình luận"}
          </Button>
        </div>
      )}
    </ScrollArea>
  )
}
