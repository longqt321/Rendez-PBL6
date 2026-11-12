/** Tiền tố của dataset ảnh cold-start — chỉ dataset này có biến thể WebP. */
const COLD_START_PREFIX = "/data/cold-start/images/"

export interface ColdStartSrcSet {
  srcSet: string
  sizes: string
}

/**
 * Dựng `srcset`/`sizes` theo quy ước biến thể WebP của dataset cold-start
 * (thiết kế mục 5.4): `venues/<tên>.<ext>` có sẵn `<tên>-400.webp` và
 * `<tên>-800.webp` sinh lúc build (script `scripts/generate-image-variants.sh`).
 *
 * - `srcSet` = 400w + 800w + **ảnh gốc 1200w** (ảnh gốc là ứng viên lớn nhất
 *   cho hero/desktop DPR2, đồng thời là `src` fallback — không cần biến thể
 *   1200w riêng).
 * - Ảnh không thuộc dataset (vd. ảnh người dùng trên R2) → `undefined`: giữ
 *   `src` gốc, không srcset (không có biến thể để trỏ).
 */
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
