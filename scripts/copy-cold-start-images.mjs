#!/usr/bin/env node
/**
 * Chép ảnh cold-start từ `data/cold-start/images/` sang `public/data/cold-start/images/`.
 *
 * Vite chỉ phục vụ file tĩnh trong `public/`, nên ảnh phải có mặt ở đó thì dev và
 * bản build mới hiển thị được mà không cần backend. Bản sao KHÔNG commit
 * (xem `.gitignore`) — nguồn sự thật vẫn là `data/cold-start/`.
 *
 * Chạy tự động qua `predev` / `prebuild`. Idempotent: chỉ chép file thiếu hoặc
 * khác kích thước/sửa đổi gần nhất.
 */
import { copyFile, mkdir, readdir, stat } from "node:fs/promises"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const source = join(root, "data/cold-start/images")
const target = join(root, "public/data/cold-start/images")

/** Liệt kê đệ quy mọi file trong `dir`. */
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(fullPath)))
    else if (entry.isFile()) files.push(fullPath)
  }
  return files
}

/** File đích đã mới bằng file nguồn chưa? */
async function isUpToDate(from, to) {
  try {
    const [a, b] = await Promise.all([stat(from), stat(to)])
    return a.size === b.size && a.mtimeMs <= b.mtimeMs
  } catch {
    return false
  }
}

async function main() {
  const files = await walk(source)
  let copied = 0

  for (const from of files) {
    const to = join(target, relative(source, from))
    if (await isUpToDate(from, to)) continue
    await mkdir(dirname(to), { recursive: true })
    await copyFile(from, to)
    copied += 1
  }

  console.log(
    copied === 0
      ? `[cold-start] Ảnh đã đồng bộ (${files.length} file).`
      : `[cold-start] Đã chép ${copied}/${files.length} ảnh vào public/data/cold-start/images.`,
  )
}

main().catch((error) => {
  console.error("[cold-start] Không chép được ảnh:", error)
  process.exit(1)
})
