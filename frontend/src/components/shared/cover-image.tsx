import { useState } from "react"
import { ImageOffIcon } from "lucide-react"
import { PlacePlaceholder } from "@/components/shared/place-placeholder"
import { coldStartSrcSet } from "@/components/shared/cold-start-srcset"
import type { PlaceCategory } from "@/features/places/types/place"
import { cn } from "@/lib/utils"

interface CoverImageProps {
  src?: string

  placeholder?: PlaceCategory

  name?: string

  height?: number
  className?: string

  alt?: string

  sizes?: string

  priority?: boolean
  children?: React.ReactNode
}

export function CoverImage({
  src,
  placeholder,
  name,
  height,
  className,
  alt,
  sizes,
  priority = false,
  children,
}: Readonly<CoverImageProps>) {
  const [failed, setFailed] = useState(false)
  // Reset khi đổi ảnh (cùng component mount lại với URL mới, ví dụ sửa hồ sơ).
  const showImage = src !== undefined && !failed
  // Chỉ dataset cold-start có biến thể ảnh; ảnh R2 dùng `src` gốc.
  const responsive =
    src !== undefined && sizes !== undefined ? coldStartSrcSet(src, sizes) : undefined

  let content: React.ReactNode
  if (showImage) {
    content = (
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
    )
  } else if (placeholder !== undefined) {
    content = <PlacePlaceholder category={placeholder} name={name} label={alt} />
  } else {
    content = (
      <div className="flex size-full flex-col items-center justify-center gap-1 text-muted-foreground">
        <ImageOffIcon className="size-5" aria-hidden="true" />
        <span className="text-xs">{failed ? "Không tải được ảnh" : "Chưa có ảnh"}</span>
      </div>
    )
  }

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)} style={{ height }}>
      {content}
      {children}
    </div>
  )
}
