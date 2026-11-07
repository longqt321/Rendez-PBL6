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
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"
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

  if (isPending) {
    return (
      <div
        className="flex items-center justify-center py-24"
        role="status"
        aria-label="Đang tải bài đăng"
      >
        <Spinner className="size-6" />
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
        <article className="overflow-hidden rounded-[0.25rem] border border-border bg-card shadow-(--shadow-soft)">
          <PostPreview post={post} footer={<PostActions post={post} />} />
        </article>

        <section
          id="binh-luan"
          aria-label={`Bình luận (${post.commentCount})`}
          className="flex flex-col overflow-hidden rounded-[0.25rem] border border-border bg-card lg:sticky lg:top-20 lg:max-h-[calc(100dvh-7rem)]"
        >
          <h2 className="flex items-center gap-2 border-b px-4 py-2.5 font-heading text-sm font-bold">
            <MessageCircleIcon className="size-4" aria-hidden="true" />
            Bình luận ({formatCount(post.commentCount)})
          </h2>

          <CommentThreadPanel postId={post.id} />
        </section>
      </div>
    </div>
  )
}

/** Ba hành động trên bài — dùng lại đúng hook optimistic của feed, không viết mới. */
function PostActions({ post }: { post: Post }) {
  const setLiked = useSetPostLiked()
  const setSaved = useSetPostSaved()

  return (
    <div className="flex items-center gap-1 border-t border-dashed border-border pt-2">
      <Button
        variant="ghost"
        size="sm"
        aria-pressed={post.likedByMe}
        aria-label={post.likedByMe ? "Bỏ thích" : "Thích"}
        onClick={() => setLiked.mutate({ postId: post.id, liked: !post.likedByMe })}
        className={cn(post.likedByMe && "text-primary")}
      >
        <HeartIcon className={cn(post.likedByMe && "fill-current")} />
        {formatCount(post.likeCount)}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        aria-label="Xem bình luận"
        onClick={() => document.getElementById("binh-luan")?.scrollIntoView({ block: "start" })}
      >
        <MessageCircleIcon />
        {formatCount(post.commentCount)}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        aria-pressed={post.savedByMe}
        aria-label={post.savedByMe ? "Bỏ lưu" : "Lưu bài"}
        onClick={() => setSaved.mutate({ postId: post.id, saved: !post.savedByMe })}
        className={cn("ml-auto", post.savedByMe && "text-accent")}
      >
        <BookmarkIcon className={cn(post.savedByMe && "fill-current")} />
      </Button>
    </div>
  )
}
