import { useState } from "react"
import { Link } from "react-router"
import {
  ArrowUpRightIcon,
  BookmarkIcon,
  HeartIcon,
  MapPinIcon,
  MessageCircleIcon,
  MoreHorizontalIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Toggle } from "@/components/ui/toggle"
import { ImageLightbox } from "@/components/shared/image-lightbox"
import { SafeImage } from "@/components/shared/safe-image"
import { categoryLabel } from "@/features/places/lib/category-meta"
import { useMe } from "@/features/profile/hooks/use-me"
import { formatCount, formatRelativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useSetPostLiked } from "../hooks/use-set-post-liked"
import { useSetPostSaved } from "../hooks/use-set-post-saved"
import type { Post } from "../types/post"
import { CommentThread } from "./comment-thread"
import { AttachPostPlaceDialog } from "./attach-post-place-dialog"
import { PostCommentsInline } from "./post-comments-inline"
import { PostDeleteDialog } from "./post-delete-dialog"

interface PostCardProps {
  post: Post
}

export function PostCard({ post }: PostCardProps) {
  const setLiked = useSetPostLiked()
  const setSaved = useSetPostSaved()
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [attachPlaceOpen, setAttachPlaceOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const { data: me } = useMe()

  const isMine = me !== undefined && post.author.id === me.id
  const place = post.place

  return (
    <Card className="gap-0 overflow-hidden border-border/80 py-0 shadow-(--shadow-soft)">
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Link to={`/u/${post.author.handle}`} className="shrink-0">
          <Avatar size="lg">
            <AvatarFallback className="bg-accent text-sm font-bold text-accent-foreground">
              {post.author.initials}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm leading-tight font-semibold">
            <HoverCard>
              <HoverCardTrigger
                render={
                  <Link to={`/u/${post.author.handle}`} className="outline-none hover:underline">
                    {post.author.name}
                  </Link>
                }
              />
              <HoverCardContent align="start" className="w-64">
                <div className="flex items-center gap-3">
                  <Avatar size="default">
                    <AvatarFallback className="bg-accent text-xs font-bold text-accent-foreground">
                      {post.author.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{post.author.name}</p>
                    <p className="truncate text-xs text-muted-foreground">@{post.author.handle}</p>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="outline"
                    size="xs"
                    render={<Link to={`/u/${post.author.handle}`} />}
                  >
                    Xem hồ sơ
                  </Button>
                </div>
              </HoverCardContent>
            </HoverCard>
          </p>
          <p className="truncate text-xs text-muted-foreground">
            @{post.author.handle} ·{" "}
            <Link to={`/post/${post.id}`} className="hover:underline">
              {formatRelativeTime(post.createdAt)}
            </Link>
          </p>
        </div>
        {isMine ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-xs" aria-label="Tuỳ chọn bài đăng">
                  <MoreHorizontalIcon />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setAttachPlaceOpen(true)}>
                <MapPinIcon />
                {place ? "Đổi địa điểm" : "Gắn địa điểm"}
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                Xoá bài
                <Trash2Icon />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </header>

      <div className="flex flex-col gap-3 p-4 pt-2">
        <p className="text-base leading-relaxed break-words whitespace-pre-line">{post.caption}</p>

        {post.images.length > 0 ? (
          <div
            className={cn("grid gap-1.5", post.images.length === 1 ? "grid-cols-1" : "grid-cols-2")}
          >
            {post.images.map((url, index) => (
              <Button
                key={`${post.id}-${index}`}
                type="button"
                variant="ghost"
                onClick={() => setLightboxIndex(index)}
                aria-label={`Phóng to ảnh ${index + 1}`}
                className="group relative block h-auto w-full overflow-hidden rounded-control bg-muted p-0 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                <SafeImage
                  src={url}
                  alt={`Ảnh ${index + 1}/${post.images.length} của bài đăng`}
                  className={cn(
                    "w-full transition-transform duration-300 group-hover:scale-[1.02]",
                    post.images.length === 1 ? "max-h-96" : "aspect-square",
                  )}
                />
              </Button>
            ))}
          </div>
        ) : null}

        {place ? (
          <Link
            to={`/discover/${place.id}`}
            className="group flex items-center gap-3 rounded-surface border border-border/80 bg-muted/50 px-3.5 py-2.5 transition-colors hover:border-primary/45 hover:bg-primary/5"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-control bg-primary/12 text-primary">
              <MapPinIcon className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold group-hover:text-primary">
                {place.name}
              </span>
              <span className="block truncate text-xs text-muted-foreground">{place.address}</span>
            </span>
            <Badge
              variant={place.isPublished ? "secondary" : "outline"}
              className="h-6 shrink-0 text-xs"
            >
              {place.isPublished ? "Trên Khám phá" : categoryLabel(place.category)}
            </Badge>
            <ArrowUpRightIcon
              className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
              aria-hidden="true"
            />
          </Link>
        ) : (
          <Alert className="flex items-center gap-2 border-dashed">
            <SparklesIcon className="size-4 shrink-0" aria-hidden="true" />
            <AlertDescription className="flex-1">Bài viết chưa gắn địa điểm.</AlertDescription>
            {isMine ? (
              <Button
                type="button"
                variant="outline"
                size="xs"
                className="shrink-0 gap-1"
                onClick={() => setAttachPlaceOpen(true)}
              >
                <MapPinIcon className="size-3.5 text-primary" aria-hidden="true" />
                Gắn địa điểm
              </Button>
            ) : null}
          </Alert>
        )}

        <footer className="flex items-center gap-1.5 pt-0.5">
          <Toggle
            aria-label={post.likedByMe ? "Bỏ thích" : "Thích"}
            pressed={post.likedByMe}
            onPressedChange={(pressed) => setLiked.mutate({ postId: post.id, liked: pressed })}
            className={cn(
              "gap-1.5 transition-transform active:scale-95",
              post.likedByMe && "text-primary",
            )}
          >
            <HeartIcon className={cn(post.likedByMe && "fill-current")} />
            <span className="tabular-nums">{formatCount(post.likeCount)}</span>
          </Toggle>

          <Button
            variant="ghost"
            aria-label="Bình luận"
            className="gap-1.5"
            onClick={() => setCommentsOpen(true)}
          >
            <MessageCircleIcon />
            <span className="tabular-nums">{formatCount(post.commentCount)}</span>
          </Button>

          <Toggle
            aria-label={post.savedByMe ? "Bỏ lưu" : "Lưu bài"}
            pressed={post.savedByMe}
            onPressedChange={(pressed) => setSaved.mutate({ postId: post.id, saved: pressed })}
            className={cn(
              "ml-auto transition-transform active:scale-95",
              post.savedByMe && "text-primary",
            )}
          >
            <BookmarkIcon className={cn(post.savedByMe && "fill-current")} />
          </Toggle>
        </footer>
      </div>

      <PostCommentsInline post={post} />

      <CommentThread post={post} open={commentsOpen} onOpenChange={setCommentsOpen} />

      <PostDeleteDialog postId={post.id} open={deleteOpen} onClose={() => setDeleteOpen(false)} />

      {isMine ? (
        <AttachPostPlaceDialog
          postId={post.id}
          currentPlaceId={place?.id ?? null}
          open={attachPlaceOpen}
          onOpenChange={setAttachPlaceOpen}
        />
      ) : null}

      <ImageLightbox
        images={post.images}
        index={lightboxIndex ?? 0}
        open={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        altPrefix={`Bài đăng của ${post.author.name}`}
      />
    </Card>
  )
}
