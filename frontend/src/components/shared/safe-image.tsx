import { useState } from "react"
import { ImageOffIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface SafeImageProps {
  src: string
  alt: string

  className?: string

  imgClassName?: string
}

export function SafeImage({ src, alt, className, imgClassName }: Readonly<SafeImageProps>) {
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
