import { useRef, type RefObject } from "react"
import { Link, useParams } from "react-router"
import { BookmarkIcon, HeartIcon, ImageOffIcon, MessageCircleIcon, UsersIcon } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Toggle } from "@/components/ui/toggle"
import { SectionHeading } from "@/components/shared/section-heading"
import { formatCount } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Post } from "../types/post"
import { usePost } from "../hooks/use-post"
import { useSetPostLiked } from "../hooks/use-set-post-liked"
import { useSetPostSaved } from "../hooks/use-set-post-saved"
import { CommentThreadPanel } from "../components/comment-thread-panel"
import { PostPreview } from "../components/post-preview"

/**
 * Trang chi tiết một bài đăng — `/post/:id`.
 *
 * PC chia 2 cột: bài đăng bên trái, bình luận bên phải (cuộn riêng). Mobile xếp dọc
 * vì đây là một trang, không phải overlay — không dùng Drawer như thread bình luận.
 */
export function PostDetailPage() {
  const { id } = useParams()
  const postId = id ?? ""
  const { data: post, isPending, isError } = usePost(postId)
  const commentsRef = useRef<HTMLDivElement>(null)

  if (isPending) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8 lg:py-8">
        <Skeleton className="h-4 w-44" />
        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
          <div className="flex flex-col gap-3 rounded-surface border border-border/20 p-4">
            <Skeleton className="h-64 w-full rounded-surface" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="flex flex-col gap-3 rounded-surface border border-border/20 p-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
        </div>
      </div>
    )
  }

  if (isError || !post) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ImageOffIcon />
            </EmptyMedia>
            <EmptyTitle>Không tìm thấy bài đăng</EmptyTitle>
            <EmptyDescription>
              Bài đăng này không tồn tại hoặc đã bị xoá khỏi cộng đồng.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button render={<Link to="/social" />}>Về trang Cộng đồng</Button>
          </EmptyContent>
        </Empty>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8 lg:py-8">
      <h1 className="sr-only">Bài đăng của {post.author.name}</h1>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link to="/social" />} className="flex items-center gap-1.5">
              <UsersIcon className="size-3.5" aria-hidden="true" />
              Cộng đồng
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Bài đăng của {post.author.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <Card className="gap-0 py-0 shadow-(--shadow-soft)">
          <PostPreview post={post} footer={<PostActions post={post} commentsRef={commentsRef} />} />
        </Card>

        <Card
          ref={commentsRef}
          id="binh-luan"
          role="region"
          aria-label={`Bình luận (${post.commentCount})`}
          className="gap-0 py-0 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-7rem)]"
        >
          <SectionHeading
            icon={<MessageCircleIcon className="size-4" aria-hidden="true" />}
            className="border-b px-4 py-2.5"
          >
            Bình luận ({formatCount(post.commentCount)})
          </SectionHeading>

          <CommentThreadPanel postId={post.id} />
        </Card>
      </div>
    </div>
  )
}

/** Ba hành động trên bài — dùng lại đúng hook optimistic của feed, không viết mới. */
function PostActions({
  post,
  commentsRef,
}: {
  post: Post
  commentsRef: RefObject<HTMLDivElement | null>
}) {
  const setLiked = useSetPostLiked()
  const setSaved = useSetPostSaved()

  return (
    <div className="flex items-center gap-1 border-t border-dashed border-border pt-2">
      <Toggle
        size="sm"
        aria-label={post.likedByMe ? "Bỏ thích" : "Thích"}
        pressed={post.likedByMe}
        onPressedChange={(pressed) => setLiked.mutate({ postId: post.id, liked: pressed })}
        className={cn(post.likedByMe && "text-primary")}
      >
        <HeartIcon className={cn(post.likedByMe && "fill-current")} />
        {formatCount(post.likeCount)}
      </Toggle>

      <Button
        variant="ghost"
        size="sm"
        aria-label="Xem bình luận"
        onClick={() => commentsRef.current?.scrollIntoView({ block: "start" })}
      >
        <MessageCircleIcon />
        {formatCount(post.commentCount)}
      </Button>

      <Toggle
        size="sm"
        aria-label={post.savedByMe ? "Bỏ lưu" : "Lưu bài"}
        pressed={post.savedByMe}
        onPressedChange={(pressed) => setSaved.mutate({ postId: post.id, saved: pressed })}
        className={cn("ml-auto", post.savedByMe && "text-accent")}
      >
        <BookmarkIcon className={cn(post.savedByMe && "fill-current")} />
      </Toggle>
    </div>
  )
}
