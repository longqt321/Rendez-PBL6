import { useState } from "react"
import { Link } from "react-router"
import { BookmarkIcon, HeartIcon, MapPinIcon, MessageCircleIcon, SparklesIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Toggle } from "@/components/ui/toggle"
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
    <Card className="gap-0 py-0 shadow-(--shadow-soft)">
      <header className="flex items-center gap-3 px-4 py-3">
        <Avatar size="lg">
          <AvatarFallback className="bg-accent text-sm font-bold text-accent-foreground">
            {post.author.initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base leading-tight font-semibold">
            <Link to={`/post/${post.id}`} className="outline-none hover:underline">
              {post.author.name}
            </Link>
          </p>
          <p className="truncate text-sm text-muted-foreground">
            @{post.author.handle} · {formatRelativeTime(post.createdAt)}
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-3 p-4">
        <p className="text-base leading-relaxed whitespace-pre-line">{post.caption}</p>

        {/* Ảnh bài đăng (G5b): 1 ảnh full, ≥2 lưới 2 cột — rỗng thì không render gì. */}
        {post.images.length > 0 ? (
          <div
            className={cn("grid gap-1", post.images.length === 1 ? "grid-cols-1" : "grid-cols-2")}
          >
            {post.images.map((url, index) => (
              <Link
                key={`${post.id}-${index}`}
                to={`/post/${post.id}`}
                className="block overflow-hidden rounded-md"
              >
                <img
                  src={url}
                  alt={`Ảnh ${index + 1}/${post.images.length} của bài đăng`}
                  loading="lazy"
                  className="aspect-square h-full w-full object-cover"
                />
              </Link>
            ))}
          </div>
        ) : null}

        {place ? (
          <div className="flex items-center gap-2.5 rounded-md border border-border/70 bg-muted/70 px-3 py-2">
            <MapPinIcon className="size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{place.name}</span>
              <span className="block truncate text-sm text-muted-foreground">{place.address}</span>
            </span>
            <Badge
              variant={place.isPublished ? "secondary" : "outline"}
              className="h-6 shrink-0 text-sm"
            >
              {place.isPublished ? "Trên Khám phá" : categoryLabel(place.category)}
            </Badge>
          </div>
        ) : (
          <Alert className="flex items-center gap-2 border-dashed">
            <SparklesIcon className="size-4 shrink-0" aria-hidden="true" />
            <AlertDescription>Chưa gắn địa điểm — hệ thống sẽ đề xuất cho bạn.</AlertDescription>
          </Alert>
        )}

        <footer className="flex items-center gap-1.5 pt-0.5">
          <Toggle
            aria-label={post.likedByMe ? "Bỏ thích" : "Thích"}
            pressed={post.likedByMe}
            onPressedChange={(pressed) => setLiked.mutate({ postId: post.id, liked: pressed })}
            className={cn(post.likedByMe && "text-primary")}
          >
            <HeartIcon className={cn(post.likedByMe && "fill-current")} />
            {formatCount(post.likeCount)}
          </Toggle>

          <Button variant="ghost" aria-label="Bình luận" onClick={() => setCommentsOpen(true)}>
            <MessageCircleIcon />
            {formatCount(post.commentCount)}
          </Button>

          <Toggle
            aria-label={post.savedByMe ? "Bỏ lưu" : "Lưu bài"}
            pressed={post.savedByMe}
            onPressedChange={(pressed) => setSaved.mutate({ postId: post.id, saved: pressed })}
            className={cn("ml-auto", post.savedByMe && "text-accent")}
          >
            <BookmarkIcon className={cn(post.savedByMe && "fill-current")} />
          </Toggle>
        </footer>
      </div>

      <PostCommentsInline post={post} />

      {/* Thread đầy đủ — nút Bình luận ở footer cũng mở cùng thread. */}
      <CommentThread post={post} open={commentsOpen} onOpenChange={setCommentsOpen} />
    </Card>
  )
}
