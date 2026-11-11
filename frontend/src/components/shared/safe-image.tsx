import { useState } from "react"
import { ImageOffIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface SafeImageProps {
  src: string
  alt: string
  /** Class cho khung ngoài — giữ nguyên bố cục khi ảnh hỏng. */
  className?: string
  /** Class cho thẻ `<img>` (ví dụ `object-cover`, bo góc). */
  imgClassName?: string
}

/**
 * Ảnh người dùng đăng (bài đăng…) có fallback khi ảnh hỏng.
 *
 * Ảnh R2 gặp sự cố hoặc bị xoá không được để lộ icon ảnh vỡ + alt text thô:
 * `onError` thay ảnh bằng khung trung tính kèm icon, giữ đúng kích thước khung
 * nên lưới bài đăng không xê dịch. Alt vẫn được công bố qua `role="img"` +
 * `aria-label` để trình đọc màn hình không mất ngữ cảnh.
 */
export function SafeImage({ src, alt, className, imgClassName }: SafeImageProps) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn("flex items-center justify-center bg-muted text-muted-foreground", className)}
      >
        <ImageOffIcon className="size-5" aria-hidden="true" />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn("object-cover", imgClassName, className)}
      onError={() => setFailed(true)}
    />
  )
}
