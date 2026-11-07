import { useState } from "react"
import { MapPinIcon, MessageCircleIcon, XIcon } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { SeedImage } from "@/components/shared/seed-image"
import { formatRelativeTime } from "@/lib/format"
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
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[min(64rem,calc(100%-2rem))]">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle className="flex items-center gap-2 text-base">
              <MessageCircleIcon className="size-4" aria-hidden="true" />
              Bình luận ({post.commentCount})
            </DialogTitle>
            <DialogDescription className="sr-only">
              Toàn bộ bình luận của bài đăng này.
            </DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[75vh] grid-cols-2 grid-rows-1">
            <div className="min-h-0 overflow-y-auto border-r">
              <PostPreview post={post} />
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

/**
 * Bản xem trước bài đăng ở cột trái của thread — đủ ảnh, tác giả, chú thích, địa điểm
 * để người đọc vừa xem bình luận vừa nhớ mình đang bình luận bài nào.
 */
function PostPreview({ post }: { post: Post }) {
  const place = post.place

  return (
    <div className="flex flex-col">
      <SeedImage
        seed={post.imageSeed}
        height={post.imageHeight}
        alt={`Ảnh minh hoạ bài đăng của ${post.author.name}`}
      />

      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-center gap-2.5">
          <Avatar>
            <AvatarFallback className="bg-accent text-[0.65rem] font-bold text-accent-foreground">
              {post.author.initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm leading-tight font-semibold">{post.author.name}</p>
            <p className="truncate text-[0.7rem] text-muted-foreground">
              @{post.author.handle} · {formatRelativeTime(post.createdAt)}
            </p>
          </div>
        </div>

        <p className="text-sm leading-relaxed whitespace-pre-line">{post.caption}</p>

        {place && (
          <div className="flex items-center gap-2 rounded-[0.2rem] border-2 border-foreground/70 bg-muted/70 px-2 py-1.5">
            <MapPinIcon className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold">{place.name}</span>
              <span className="block truncate text-[0.68rem] text-muted-foreground">
                {place.address}
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
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
