import { ImageOffIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface CoverImageProps {
  /** URL ảnh THẬT (cold-start/venue). Không có thì hiện placeholder trung tính. */
  src?: string
  /** Chiều cao cố định cho masonry; bỏ trống thì theo tỉ lệ khung */
  height?: number
  className?: string
  /** Ảnh trang trí hay ảnh nội dung */
  alt?: string
  /** Nhãn dưới icon khi chưa có ảnh */
  placeholderLabel?: string
  children?: React.ReactNode
}

/**
 * Ảnh bìa địa điểm/bài đăng.
 *
 * Chỉ hiển thị ảnh thật có trong dataset. Khi chưa có ảnh, hiện placeholder
 * trung tính — KHÔNG dùng ảnh minh hoạ ngẫu nhiên (picsum/seed), vì ảnh không
 * đúng quán sẽ khiến người dùng hiểu sai về địa điểm (quyết định D-049).
 */
export function CoverImage({
  src,
  height,
  className,
  alt,
  placeholderLabel = "Chưa có ảnh",
  children,
}: CoverImageProps) {
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)} style={{ height }}>
      {src ? (
        <img
          src={src}
          alt={alt ?? ""}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-1 text-muted-foreground">
          <ImageOffIcon className="size-5" aria-hidden="true" />
          <span className="text-xs">{placeholderLabel}</span>
        </div>
      )}
      {children}
    </div>
  )
}
