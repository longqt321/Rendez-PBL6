import { cn } from "@/lib/utils"
import { seedToGradient } from "@/lib/seed-color"

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
 * Ảnh placeholder tự sinh bằng CSS gradient — không gọi mạng, không cần asset.
 * Khi nối backend, thay bằng `<img src={place.coverUrl} loading="lazy" />`.
 */
export function SeedImage({ seed, height, className, alt, children }: SeedImageProps) {
  return (
    <div
      role="img"
      aria-label={alt ?? "Ảnh minh hoạ địa điểm"}
      className={cn("relative overflow-hidden bg-muted", className)}
      style={{ backgroundImage: seedToGradient(seed), height }}
    >
      {/* Lớp hoạ tiết in ấn: chấm nhỏ li ti, tạo cảm giác giấy cũ */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.9) 1px, transparent 0)",
          backgroundSize: "7px 7px",
        }}
      />
      {children}
    </div>
  )
}
