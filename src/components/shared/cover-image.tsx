import { ImageOffIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { PlacePlaceholder } from "@/components/shared/place-placeholder"
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
  children?: React.ReactNode
}

/**
 * Ảnh bìa địa điểm.
 *
 * Có ảnh thật (`src`) thì dùng ảnh thật. Không có thì hiện **ảnh minh hoạ hệ
 * thống** theo loại quán, kèm nhãn "Ảnh minh hoạ" để người dùng không nhầm với
 * ảnh thật (quyết định D-050). Mọi quán cùng loại dùng chung một hình.
 */
export function CoverImage({
  src,
  placeholder,
  height,
  className,
  alt,
  children,
}: CoverImageProps) {
  const isIllustration = !src && placeholder !== undefined

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
      ) : isIllustration ? (
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
          <span className="text-xs">Chưa có ảnh</span>
        </div>
      )}
      {children}
    </div>
  )
}
