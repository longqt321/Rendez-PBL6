import { HeartIcon, MoreHorizontalIcon, TrashIcon } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { formatCount, formatRelativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useSetCommentLiked } from "../hooks/use-set-comment-liked"
import type { Comment } from "../types/comment"

interface CommentItemProps {
  comment: Comment
  /** Người dùng hiện tại — quyết định hiện menu Xoá hay không. */
  isMe: boolean
  onReply: (comment: Comment) => void
  onDelete: (comment: Comment) => void
}

/** Một mục bình luận — dựng bằng `Item` theo đúng mục đích thiết kế của nó. */
export function CommentItem({ comment, isMe, onReply, onDelete }: CommentItemProps) {
  const setLiked = useSetCommentLiked(comment.postId)

  return (
    <Item variant="default" className="border-transparent px-0 py-1">
      <ItemMedia>
        <Avatar size="sm">
          <AvatarFallback className="bg-accent text-[0.6rem] font-bold text-accent-foreground">
            {comment.author.initials}
          </AvatarFallback>
        </Avatar>
      </ItemMedia>

      <ItemContent className="gap-0.5">
        <ItemTitle className="text-xs">
          {comment.author.name}
          <span className="font-normal text-muted-foreground">
            @{comment.author.handle} · {formatRelativeTime(comment.createdAt)}
          </span>
        </ItemTitle>

        <ItemDescription className="whitespace-pre-line">
          {comment.replyTo !== null && (
            <span className="font-medium text-foreground">@{comment.replyTo.handle} </span>
          )}
          {comment.body}
        </ItemDescription>

        <ItemFooter className="mt-1 justify-start gap-1">
          <Button
            variant="ghost"
            size="xs"
            aria-pressed={comment.likedByMe}
            aria-label={comment.likedByMe ? "Bỏ thích bình luận" : "Thích bình luận"}
            onClick={() => setLiked.mutate({ commentId: comment.id, liked: !comment.likedByMe })}
            className={cn("h-6 px-1.5 text-[0.7rem]", comment.likedByMe && "text-primary")}
          >
            <HeartIcon className={cn("size-3", comment.likedByMe && "fill-current")} />
            {formatCount(comment.likeCount)}
          </Button>

          <Button
            variant="ghost"
            size="xs"
            className="h-6 px-1.5 text-[0.7rem]"
            onClick={() => onReply(comment)}
          >
            Trả lời
          </Button>
        </ItemFooter>
      </ItemContent>

      {isMe && (
        <ItemActions>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-xs" aria-label="Tuỳ chọn bình luận">
                  <MoreHorizontalIcon />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(comment)}>
                Xoá bình luận
                <TrashIcon />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ItemActions>
      )}
    </Item>
  )
}
