import { MapPinIcon } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { SeedImage } from "@/components/shared/seed-image"
import { formatRelativeTime } from "@/lib/format"
import type { Post } from "../types/post"

interface PostPreviewProps {
  post: Post
  /** Vùng hành động (thích/lưu…) đặt dưới phần chú thích — khác nhau giữa thread và trang chi tiết. */
  footer?: React.ReactNode
}

/**
 * Khối xem trước một bài đăng: ảnh, tác giả, chú thích, địa điểm.
 *
 * Dùng chung cho cột trái của thread bình luận và trang `/post/:id` để hai nơi
 * không phải tự dựng lại cùng một bố cục.
 */
export function PostPreview({ post, footer }: PostPreviewProps) {
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

        {footer}
      </div>
    </div>
  )
}
