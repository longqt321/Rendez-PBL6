import { useState } from "react"
import { MessageCircleIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { useMediaQuery } from "@base-ui/react/unstable-use-media-query"
import type { Post } from "../types/post"
import type { Comment } from "../types/comment"
import { CommentDeleteDialog } from "./comment-delete-dialog"
import { CommentComposer } from "./comment-composer"
import { CommentList } from "./comment-list"
import { CommentSortToggle } from "./comment-sort-toggle"

interface CommentThreadProps {
  post: Post
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Thread đầy đủ: PC dùng `Dialog` 2 cột, mobile dùng `Drawer` kéo xuống để đóng. */
export function CommentThread({ post, open, onOpenChange }: CommentThreadProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)", { noSsr: true })

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle className="flex items-center gap-2 text-base">
              <MessageCircleIcon className="size-4" aria-hidden="true" />
              Bình luận ({post.commentCount})
            </DialogTitle>
            <DialogDescription className="sr-only">
              Toàn bộ bình luận của bài đăng này.
            </DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[70vh] grid-cols-2">
            <div className="min-w-0 border-r p-4">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Bài đăng</p>
              <p className="line-clamp-6 text-sm leading-relaxed">{post.caption}</p>
            </div>

            <CommentThreadPanel postId={post.id} />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent className="max-h-[85dvh]">
        <DrawerHeader className="border-b">
          <DrawerTitle className="flex items-center justify-between text-base">
            Bình luận ({post.commentCount})
            <DrawerClose render={<Button variant="ghost" size="icon-sm" aria-label="Đóng" />}>
              <XIcon />
            </DrawerClose>
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            Toàn bộ bình luận của bài đăng này.
          </DrawerDescription>
        </DrawerHeader>

        <CommentThreadPanel postId={post.id} />
      </DrawerContent>
    </Drawer>
  )
}

/** Vùng cuộn + sort + composer — dùng chung cho cả Dialog và Drawer. */
function CommentThreadPanel({ postId }: { postId: string }) {
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
        isMe
        onReply={setReplyTo}
        onDelete={setDeleting}
        className="min-h-0 flex-1 px-3 py-2"
      />

      <div className="border-t p-3">
        <CommentComposer postId={postId} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />
      </div>

      <CommentDeleteDialog postId={postId} comment={deleting} onClose={() => setDeleting(null)} />
    </div>
  )
}
