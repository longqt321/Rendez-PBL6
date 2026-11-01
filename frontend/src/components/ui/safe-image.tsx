import { useState } from "react";
import { ImageOff } from "lucide-react";
import { clsx } from "clsx";

/**
 * Image with a real fallback.
 *
 * The fallback is rendered when every candidate URL fails, so a broken media
 * request never leaves an empty box or a broken-image glyph. Candidates are
 * tried in order: the first that loads wins.
 */
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
  /** Ordered candidate URLs. Empty/undefined entries are skipped. */
  sources: (string | null | undefined)[];
  alt: string;
  /** CSS aspect-ratio, e.g. "4 / 5". Keeps layout stable before load. */
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
        className={clsx("media-frame media-frame--empty", className)}
        style={ratio ? { aspectRatio: ratio } : undefined}
      >
        <ImageOff size={22} aria-hidden />
        <span>Chưa có ảnh</span>
      </div>
    );
  }

  return (
    <div
      className={clsx("media-frame", className)}
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

/** Ratio string from real pixel dimensions, with a stable fallback. */
export function ratioOf(
  width: number | null | undefined,
  height: number | null | undefined,
  fallback = "4 / 5",
): string {
  if (!width || !height) return fallback;
  return `${width} / ${height}`;
}
