import { MapPinIcon } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-center gap-2.5">
          <Avatar>
            <AvatarFallback className="bg-accent text-xs font-bold text-accent-foreground">
              {post.author.initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm leading-tight font-semibold">{post.author.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              @{post.author.handle} · {formatRelativeTime(post.createdAt)}
            </p>
          </div>
        </div>

        <p className="text-sm leading-relaxed break-words whitespace-pre-line">{post.caption}</p>

        {/* Ảnh bài đăng (G5b) — cùng bố cục với `PostCard`, không bọc link vì
            component này đã nằm trong trang chi tiết. */}
        {post.images.length > 0 ? (
          <div
            className={cn("grid gap-1", post.images.length === 1 ? "grid-cols-1" : "grid-cols-2")}
          >
            {post.images.map((url, index) => (
              <SafeImage
                key={`${post.id}-${index}`}
                src={url}
                alt={`Ảnh ${index + 1}/${post.images.length} của bài đăng`}
                className="aspect-square h-full w-full rounded-md"
              />
            ))}
          </div>
        ) : null}

        {place && (
          <div
            data-slot="post-place"
            className="flex items-center gap-2 rounded-md border border-border/70 bg-muted/70 px-2 py-1.5"
          >
            <MapPinIcon className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold">{place.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{place.address}</span>
            </span>
          </div>
        )}

        {footer}
      </div>
    </div>
  )
}
