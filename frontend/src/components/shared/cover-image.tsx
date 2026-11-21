import { useState } from "react"
import { ImageOffIcon } from "lucide-react"
import { PlacePlaceholder } from "@/components/shared/place-placeholder"
import { coldStartSrcSet } from "@/components/shared/cold-start-srcset"
import type { PlaceCategory } from "@/features/places/types/place"
import { cn } from "@/lib/utils"

interface CoverImageProps {
  src?: string
  placeholder?: PlaceCategory
  fallbackVariant?: "place" | "profile-cover" | "generic"
  name?: string
  height?: number
  className?: string
  imgClassName?: string
  alt?: string
  sizes?: string
  priority?: boolean
  children?: React.ReactNode
}

function CoastalCoverBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="relative size-full overflow-hidden bg-gradient-to-br from-primary/15 via-secondary to-accent/35"
    >
      <svg
        viewBox="0 0 800 240"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full text-primary/20"
      >
        <path
          d="M0 185 C 160 120, 320 220, 490 150 C 620 95, 720 140, 800 110 L 800 240 L 0 240 Z"
          fill="currentColor"
        />
        <path
          d="M0 135 C 180 85, 340 165, 520 105 C 650 65, 730 95, 800 75"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="6 6"
        />
      </svg>
      <div className="absolute right-6 bottom-4 hidden items-center gap-2 text-xs font-medium tracking-widest text-muted-foreground/80 uppercase sm:flex">
        <span>16°03&apos;N · 108°13&apos;E</span>
        <span>·</span>
        <span>Đà Nẵng</span>
      </div>
    </div>
  )
}

export function CoverImage({
  src,
  placeholder,
  fallbackVariant = "generic",
  name,
  height,
  className,
  imgClassName,
  alt,
  sizes,
  priority = false,
  children,
}: Readonly<CoverImageProps>) {
  const [failed, setFailed] = useState(false)
  const showImage = src !== undefined && !failed
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
        className={cn("size-full object-cover", imgClassName)}
        onError={() => setFailed(true)}
      />
    )
  } else if (placeholder !== undefined) {
    content = <PlacePlaceholder category={placeholder} name={name} label={alt} />
  } else if (fallbackVariant === "profile-cover" && !failed) {
    content = <CoastalCoverBackdrop />
  } else if (failed) {
    content = (
      <div className="flex size-full flex-col items-center justify-center gap-1 text-muted-foreground">
        <ImageOffIcon className="size-5" aria-hidden="true" />
        <span className="text-xs">Không tải được ảnh</span>
      </div>
    )
  } else {
    content = <CoastalCoverBackdrop />
  }

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)} style={{ height }}>
      {content}
      {children}
    </div>
  )
}
