#!/usr/bin/env node
/**
 * Chặn lệch biến thể ảnh cold-start (thiết kế mục 5.3): mỗi ảnh gốc trong
 * `data/cold-start/images/venues/` phải có ĐỦ 2 biến thể WebP
 * (`<tên>-400.webp`, `<tên>-800.webp`). Thiếu → fail kèm hướng dẫn chạy script
 * sinh — tránh "quên sinh lại" âm thầm khiến ảnh mới không có srcset (fallback
 * `src` vẫn chạy nên lỗi không nhìn thấy được).
 *
 * Chạy qua `bun run check:image-variants` (nối trong `pretest`).
 */
import { readdir } from "node:fs/promises"
import { join } from "node:path"

const root = join(import.meta.dirname, "..")
const venuesDir = join(root, "data/cold-start/images/venues")

const files = await readdir(venuesDir)
/** Ảnh gốc = mọi file KHÔNG phải biến thể đã sinh. */
const originals = files.filter((name) => !/-[48]00\.webp$/.test(name))

const missing = []
for (const original of originals) {
  const base = original.replace(/\.[^.]+$/, "")
  for (const width of [400, 800]) {
    const variant = `${base}-${width}.webp`
    if (!files.includes(variant)) missing.push(variant)
  }
}

if (missing.length > 0) {
  console.error(
    `Thiếu ${missing.length} biến thể ảnh cold-start:\n` +
      missing.map((name) => `  - ${name}`).join("\n") +
      `\nChạy: bash scripts/generate-image-variants.sh`,
  )
  process.exit(1)
}

console.log(`OK: ${originals.length} ảnh gốc đều có đủ 2 biến thể WebP (400w/800w).`)
