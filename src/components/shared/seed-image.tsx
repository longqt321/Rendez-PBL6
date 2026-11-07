import { cn } from "@/lib/utils"

interface SeedImageProps {
  seed: string
  /** Chiều cao cố định cho masonry; bỏ trống thì theo tỉ lệ khung */
  height?: number
  className?: string
  /** Ảnh trang trí hay ảnh nội dung */
  alt?: string
  children?: React.ReactNode
}

/**
 * Ảnh minh hoạ lấy từ picsum.photos — URL tất định theo seed, nên mỗi địa điểm/bài đăng
 * luôn ra cùng một ảnh. Cần mạng; khi nối backend thì đổi `src` sang `place.coverUrl`.
 */
export function SeedImage({ seed, height, className, alt, children }: SeedImageProps) {
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)} style={{ height }}>
      <img
        src={`https://picsum.photos/seed/${seed}/600/${height ?? 600}`}
        alt={alt ?? "Ảnh minh hoạ địa điểm"}
        loading="lazy"
        decoding="async"
        className="size-full object-cover"
      />
      {children}
    </div>
  )
}
