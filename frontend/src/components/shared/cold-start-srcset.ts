const COLD_START_PREFIX = "/data/cold-start/images/"

export interface ColdStartSrcSet {
  srcSet: string
  sizes: string
}

export function coldStartSrcSet(src: string, sizes: string): ColdStartSrcSet | undefined {
  if (!src.startsWith(COLD_START_PREFIX)) return undefined
  const dot = src.lastIndexOf(".")
  if (dot < COLD_START_PREFIX.length) return undefined
  const base = src.slice(0, dot)
  return {
    srcSet: `${base}-400.webp 400w, ${base}-800.webp 800w, ${src} 1200w`,
    sizes,
  }
}
