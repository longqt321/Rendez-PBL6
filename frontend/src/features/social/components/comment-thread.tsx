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
import { useIsDesktop } from "@/hooks/use-breakpoint"
import type { Post } from "../types/post"
import { CommentThreadPanel } from "./comment-thread-panel"
import { PostPreview } from "./post-preview"

interface CommentThreadProps {
  post: Post
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommentThread({ post, open, onOpenChange }: CommentThreadProps) {
  const isDesktop = useIsDesktop()

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
