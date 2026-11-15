import { useState } from "react"
import { MessageCircleIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ItemGroup, ItemSeparator } from "@/components/ui/item"
import { useComments } from "../hooks/use-comments"
import type { Post } from "../types/post"
import { CommentItem } from "./comment-item"
import { CommentThread } from "./comment-thread"

interface PostCommentsInlineProps {
  post: Post
}

export function PostCommentsInline({ post }: PostCommentsInlineProps) {
  const [threadOpen, setThreadOpen] = useState(false)
  const { data } = useComments(post.id, "new")

  const comments = data?.pages.flatMap((page) => page.items) ?? []
  const preview = comments.slice(0, 2)

  return (
    <div className="border-t border-dashed border-border px-3 py-2">
      {preview.length > 0 && (
        <ItemGroup className="gap-0">
          {preview.map((comment) => (
            <div key={comment.id}>
              <CommentItem
                comment={comment}
                onReply={() => setThreadOpen(true)}
                onDelete={() => setThreadOpen(true)}
              />
              <ItemSeparator />
            </div>
          ))}
        </ItemGroup>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="mt-1 h-7 px-2 text-xs text-muted-foreground"
        onClick={() => setThreadOpen(true)}
      >
        <MessageCircleIcon className="size-3.5" aria-hidden="true" />
        {post.commentCount > 0 ? `Xem tất cả ${post.commentCount} bình luận` : "Viết bình luận"}
      </Button>

      <CommentThread post={post} open={threadOpen} onOpenChange={setThreadOpen} />
    </div>
  )
}
