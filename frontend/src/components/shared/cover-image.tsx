import { useState } from "react"
import { ImageOffIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { PlacePlaceholder } from "@/components/shared/place-placeholder"
import { coldStartSrcSet } from "@/components/shared/cold-start-srcset"
import type { PlaceCategory } from "@/features/places/types/place"
import { cn } from "@/lib/utils"

interface CoverImageProps {
  /** URL ảnh THẬT (cold-start/venue). Không có thì hiện ảnh minh hoạ hệ thống. */
  src?: string
  /**
   * Loại địa điểm — quyết định hình minh hoạ khi thiếu ảnh thật.
   * Bỏ trống (ví dụ ảnh bìa hồ sơ) thì hiện khung trung tính, không minh hoạ.
   */
  placeholder?: PlaceCategory
  /** Chiều cao cố định cho masonry; bỏ trống thì theo tỉ lệ khung */
  height?: number
  className?: string
  /** Mô tả ảnh cho trình đọc màn hình */
  alt?: string
  /**
   * `sizes` cho `srcset` — theo ngữ cảnh render (card, hero), không hardcode
   * trong component này. Bỏ trống thì không gửi `sizes`.
   */
  sizes?: string
  /**
   * Ảnh ưu tiên LCP (hero trang chi tiết): tải ngay (`eager` + `fetchpriority
   * high`) thay vì `lazy`. Card giữ `lazy` như cũ.
   */
  priority?: boolean
  children?: React.ReactNode
}

/**
 * Ảnh bìa địa điểm.
 *
 * Có ảnh thật (`src`) thì dùng ảnh thật. Không có — hoặc ảnh HỎNG (lỗi tải,
 * R2 gặp sự cố, ảnh bị xoá khỏi bucket) — thì hiện **ảnh minh hoạ hệ thống**
 * theo loại quán, kèm nhãn "Ảnh minh hoạ" để người dùng không nhầm với ảnh
 * thật (quyết định D-050). Mọi quán cùng loại dùng chung một hình.
 *
 * Ảnh hỏng không được để lộ icon ảnh vỡ + alt text thô: `onError` chuyển hẳn
 * sang nhánh minh hoạ, như thể ảnh chưa từng có.
 */
export function CoverImage({
  src,
  placeholder,
  height,
  className,
  alt,
  sizes,
  priority = false,
  children,
}: CoverImageProps) {
  const [failed, setFailed] = useState(false)
  // Reset khi đổi ảnh (cùng component mount lại với URL mới, ví dụ sửa hồ sơ).
  const showImage = src !== undefined && !failed
  // Chỉ dataset cold-start có biến thể; ảnh R2 dùng `src` gốc.
  const responsive =
    src !== undefined && sizes !== undefined ? coldStartSrcSet(src, sizes) : undefined

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)} style={{ height }}>
      {showImage ? (
        <img
          src={src}
          {...(responsive ? { srcSet: responsive.srcSet, sizes: responsive.sizes } : {})}
          alt={alt ?? ""}
          loading={priority ? "eager" : "lazy"}
          {...(priority ? { fetchPriority: "high" as const } : {})}
          decoding="async"
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : placeholder !== undefined ? (
        <>
          <PlacePlaceholder category={placeholder} label={alt} />
          <Badge
            variant="outline"
            className="absolute bottom-2 left-2 border-border/70 bg-background/85 text-[11px] font-medium text-muted-foreground backdrop-blur"
          >
            Ảnh minh hoạ
          </Badge>
        </>
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-1 text-muted-foreground">
          <ImageOffIcon className="size-5" aria-hidden="true" />
          <span className="text-xs">{failed ? "Không tải được ảnh" : "Chưa có ảnh"}</span>
        </div>
      )}
      {children}
    </div>
  )
}
