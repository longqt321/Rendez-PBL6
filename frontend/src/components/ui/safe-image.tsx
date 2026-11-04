import { useState } from "react";
import { ImageOff } from "lucide-react";
import { clsx } from "clsx";

export function SafeImage({
  sources,
  alt,
  ratio,
  className,
  eager = false,
  width,
  height,
  sizes,
}: {
  sources: (string | null | undefined)[];
  alt: string;
  ratio?: string;
  className?: string;
  eager?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
}) {
  const candidates = sources.filter((url): url is string => Boolean(url));
  const [failed, setFailed] = useState<string[]>([]);
  const current = candidates.find((url) => !failed.includes(url));

  if (!current) {
    return (
      <div
        className={clsx(
          "media-frame relative overflow-hidden bg-neutral-100 dark:bg-neutral-800 rounded-md flex flex-col items-center justify-center gap-1.5 text-neutral-400 text-xs text-center p-4",
          className,
        )}
        style={ratio ? { aspectRatio: ratio } : undefined}
      >
        <ImageOff size={20} aria-hidden />
        <span>Chưa có ảnh</span>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "media-frame relative overflow-hidden bg-neutral-100 dark:bg-neutral-800 rounded-md [&>img]:w-full [&>img]:h-full [&>img]:object-cover",
        className,
      )}
      style={ratio ? { aspectRatio: ratio } : undefined}
    >
      <img
        src={current}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={eager ? "high" : "auto"}
        onError={() => setFailed((previous) => [...previous, current])}
      />
    </div>
  );
}
