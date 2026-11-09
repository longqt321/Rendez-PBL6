import { cn } from "@/lib/utils"

interface SeedImageProps {
  seed: string
  /** Ảnh thật (nếu có) — khi có thì bỏ qua seed, dùng trực tiếp ảnh này. */
  src?: string
  /** Chiều cao cố định cho masonry; bỏ trống thì theo tỉ lệ khung */
  height?: number
  className?: string
  /** Ảnh trang trí hay ảnh nội dung */
  alt?: string
  children?: React.ReactNode
}

/**
 * Ảnh địa điểm/bài đăng: ưu tiên `src` (ảnh thật từ cold-start), không có thì
 * lấy từ picsum.photos — URL tất định theo seed, nên luôn ra cùng một ảnh.
 * Ảnh seed cần mạng; khi nối backend thì `src` trỏ sang `place.coverUrl`.
 */
export function SeedImage({ seed, src, height, className, alt, children }: SeedImageProps) {
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)} style={{ height }}>
      <img
        src={src ?? `https://picsum.photos/seed/${seed}/600/${height ?? 600}`}
        alt={alt ?? "Ảnh minh hoạ địa điểm"}
        loading="lazy"
        decoding="async"
        className="size-full object-cover"
      />
      {children}
    </div>
  )
}
