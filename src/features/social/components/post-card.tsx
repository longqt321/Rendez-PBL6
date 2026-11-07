import { useState } from "react"
import { Link } from "react-router"
import { BookmarkIcon, HeartIcon, MapPinIcon, MessageCircleIcon, SparklesIcon } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SeedImage } from "@/components/shared/seed-image"
import { categoryLabel } from "@/features/places/lib/category-meta"
import { formatCount, formatRelativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useSetPostLiked } from "../hooks/use-set-post-liked"
import { useSetPostSaved } from "../hooks/use-set-post-saved"
import { PostCommentsInline } from "./post-comments-inline"
import { CommentThread } from "./comment-thread"
import type { Post } from "../types/post"

interface PostCardProps {
  post: Post
}

export function PostCard({ post }: PostCardProps) {
  const setLiked = useSetPostLiked()
  const setSaved = useSetPostSaved()
  const [commentsOpen, setCommentsOpen] = useState(false)

  // Địa điểm do server nhúng kèm — không tra cứu id ở client.
  const place = post.place

  return (
    <article className="overflow-hidden rounded-[0.25rem] border border-border bg-card shadow-(--shadow-soft)">
      <header className="flex items-center gap-2.5 px-3 py-2.5">
        <Avatar>
          <AvatarFallback className="bg-accent text-[0.75rem] font-bold text-accent-foreground">
            {post.author.initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm leading-tight font-semibold">
            <Link to={`/post/${post.id}`} className="outline-none hover:underline">
              {post.author.name}
            </Link>
          </p>
          <p className="truncate text-[0.78rem] text-muted-foreground">
            @{post.author.handle} · {formatRelativeTime(post.createdAt)}
          </p>
        </div>
      </header>

      <Link to={`/post/${post.id}`} aria-label={`Mở bài đăng của ${post.author.name}`}>
        <SeedImage
          seed={post.imageSeed}
          height={post.imageHeight}
          alt={`Ảnh minh hoạ bài đăng của ${post.author.name}`}
        />
      </Link>

      <div className="flex flex-col gap-2 p-3">
        <p className="text-sm leading-relaxed whitespace-pre-line">{post.caption}</p>

        {place ? (
          <div className="flex items-center gap-2 rounded-[0.2rem] border border-border/70 bg-muted/70 px-2 py-1.5">
            <MapPinIcon className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold">{place.name}</span>
              <span className="block truncate text-[0.75rem] text-muted-foreground">
                {place.address}
              </span>
            </span>
            <Badge variant={place.isPublished ? "secondary" : "outline"} className="shrink-0">
              {place.isPublished ? "Trên Khám phá" : categoryLabel(place.category)}
            </Badge>
          </div>
        ) : (
          <p className="flex items-center gap-1.5 rounded-[0.2rem] border border-dashed border-border px-2 py-1.5 text-[0.78rem] text-muted-foreground">
            <SparklesIcon className="size-3 shrink-0" aria-hidden="true" />
            Chưa gắn địa điểm — hệ thống sẽ đề xuất cho bạn.
          </p>
        )}

        <footer className="flex items-center gap-1 pt-0.5">
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
            aria-label="Bình luận"
            onClick={() => setCommentsOpen(true)}
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
        </footer>
      </div>

      <PostCommentsInline post={post} />

      {/* Thread đầy đủ — nút Bình luận ở footer cũng mở cùng thread. */}
      <CommentThread post={post} open={commentsOpen} onOpenChange={setCommentsOpen} />
    </article>
  )
}
