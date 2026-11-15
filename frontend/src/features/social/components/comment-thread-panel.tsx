import { useState } from "react"
import type { Comment } from "../types/comment"
import { CommentComposer } from "./comment-composer"
import { CommentDeleteDialog } from "./comment-delete-dialog"
import { CommentList } from "./comment-list"
import { CommentSortToggle } from "./comment-sort-toggle"

interface CommentThreadPanelProps {
  postId: string

  listClassName?: string
}

export function CommentThreadPanel({ postId, listClassName }: CommentThreadPanelProps) {
  const [sort, setSort] = useState<"new" | "top">("new")
  const [replyTo, setReplyTo] = useState<Comment | null>(null)
  const [deleting, setDeleting] = useState<Comment | null>(null)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-4 pt-2">
        <CommentSortToggle value={sort} onValueChange={setSort} />
      </div>

      <CommentList
        postId={postId}
        sort={sort}
        onReply={setReplyTo}
        onDelete={setDeleting}
        className={listClassName ?? "min-h-0 flex-1 px-3 py-2"}
      />

      <div className="border-t p-3">
        <CommentComposer postId={postId} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />
      </div>

      <CommentDeleteDialog postId={postId} comment={deleting} onClose={() => setDeleting(null)} />
    </div>
  )
}
