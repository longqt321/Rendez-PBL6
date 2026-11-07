import { MessageCircleIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"
import { ItemGroup, ItemSeparator } from "@/components/ui/item"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useComments } from "../hooks/use-comments"
import type { Comment, CommentSort } from "../types/comment"
import { CommentItem } from "./comment-item"

interface CommentListProps {
  postId: string
  sort: CommentSort
  isMe: boolean
  onReply: (comment: Comment) => void
  onDelete: (comment: Comment) => void
  /** Chiều cao tối đa của vùng cuộn — khác nhau giữa inline và thread. */
  className?: string
}

/** Danh sách bình luận phẳng theo thứ tự server trả về (reply nằm sau cha). */
export function CommentList({
  postId,
  sort,
  isMe,
  onReply,
  onDelete,
  className,
}: CommentListProps) {
  const { data, isPending, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useComments(
    postId,
    sort,
  )

  if (isPending) {
    return (
      <div
        className="flex items-center justify-center py-8"
        role="status"
        aria-label="Đang tải bình luận"
      >
        <Spinner className="size-5" />
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
                ? "ml-8 border-l-2 border-dashed border-foreground/25 pl-3"
                : undefined
            }
          >
            <CommentItem comment={comment} isMe={isMe} onReply={onReply} onDelete={onDelete} />
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
