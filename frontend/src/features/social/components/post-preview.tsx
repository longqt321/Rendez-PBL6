import { useState } from "react"
import { Link } from "react-router"
import { ArrowUpRightIcon, MapPinIcon } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ImageLightbox } from "@/components/shared/image-lightbox"
import { SafeImage } from "@/components/shared/safe-image"
import { formatRelativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Post } from "../types/post"

interface PostPreviewProps {
  post: Post
  footer?: React.ReactNode
}

export function PostPreview({ post, footer }: PostPreviewProps) {
  const place = post.place
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-center gap-2.5">
          <Link to={`/u/${post.author.handle}`} className="shrink-0">
            <Avatar>
              <AvatarFallback className="bg-accent text-xs font-bold text-accent-foreground">
                {post.author.initials}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm leading-tight font-semibold">
              <Link to={`/u/${post.author.handle}`} className="hover:underline">
                {post.author.name}
              </Link>
            </p>
            <p className="truncate text-xs text-muted-foreground">
              @{post.author.handle} · {formatRelativeTime(post.createdAt)}
            </p>
          </div>
        </div>

        <p className="text-base leading-relaxed break-words whitespace-pre-line">{post.caption}</p>

        {post.images.length > 0 ? (
          <div
            className={cn("grid gap-1.5", post.images.length === 1 ? "grid-cols-1" : "grid-cols-2")}
          >
            {post.images.map((url, index) => (
              <button
                key={`${post.id}-${index}`}
                type="button"
                onClick={() => setLightboxIndex(index)}
                aria-label={`Phóng to ảnh ${index + 1}`}
                className="group relative overflow-hidden rounded-control bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <SafeImage
                  src={url}
                  alt={`Ảnh ${index + 1}/${post.images.length} của bài đăng`}
                  className="aspect-square h-full w-full transition-transform duration-300 group-hover:scale-[1.02]"
                />
              </button>
            ))}
          </div>
        ) : null}

        {place ? (
          <Link
            to={`/discover/${place.id}`}
            data-slot="post-place"
            className="group flex items-center gap-2.5 rounded-surface border border-border/80 bg-muted/50 px-3 py-2 transition-colors hover:border-primary/45 hover:bg-primary/5"
          >
            <MapPinIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold group-hover:text-primary">
                {place.name}
              </span>
              <span className="block truncate text-xs text-muted-foreground">{place.address}</span>
            </span>
            <ArrowUpRightIcon
              className="size-4 shrink-0 text-muted-foreground group-hover:text-primary"
              aria-hidden="true"
            />
          </Link>
        ) : null}

        {footer}
      </div>

      <ImageLightbox
        images={post.images}
        index={lightboxIndex ?? 0}
        open={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        altPrefix={`Bài đăng của ${post.author.name}`}
      />
    </div>
  )
}
