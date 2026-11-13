#!/usr/bin/env node
/**
 * Chép ảnh cold-start từ `data/cold-start/images/` sang `public/data/cold-start/images/`.
 *
 * Vite chỉ phục vụ file tĩnh trong `public/`, nên ảnh phải có mặt ở đó thì dev và
 * bản build mới hiển thị được mà không cần backend. Bản sao KHÔNG commit
 * (xem `.gitignore`) — nguồn sự thật vẫn là `data/cold-start/`.
 *
 * Ngoài thư mục `venues/`, script còn đồng bộ `categories/` (ảnh minh họa AI
 * dùng chung theo nhóm loại hình) và sinh `categories/manifest.json` bằng cách
 * ĐỌC THƯ MỤC THẬT — không hardcode tên file, nên thêm/bớt ảnh không cần sửa code.
 * Thư mục chưa có file nào → manifest rỗng, không lỗi (agent sinh ảnh chạy sau).
 *
 * Chạy tự động qua `predev` / `prebuild`. Idempotent: chỉ chép file thiếu hoặc
 * khác kích thước/sửa đổi gần nhất.
 */
import { copyFile, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const source = join(root, "data/cold-start/images")
const target = join(root, "public/data/cold-start/images")

/**
 * Nhóm ảnh minh họa cho 37 nhãn category của corpus.
 *
 * Đây là nguồn sự thật của map category → group; FE chọn ảnh theo hash(name)
 * trong danh sách file của group tương ứng (manifest.json). Giữ ĐỒNG BỘ với
 * `backend/scripts/build-corpus` khi thêm nhãn mới.
 */
const CATEGORY_IMAGE_GROUP = {
  // Cà phê
  cafe: "cafe",
  // Hải sản
  "hai-san": "hai-san",
  "goi-ca": "hai-san",
  // Bánh mì / bánh
  "banh-mi": "banh-mi",
  banh: "banh-mi",
  "banh-ngot": "banh-mi",
  "banh-xeo": "banh-mi",
  "banh-beo": "banh-mi",
  "banh-khoai": "banh-mi",
  "banh-canh": "banh-mi",
  "banh-trang-thit-heo": "banh-mi",
  // Chay
  chay: "chay",
  // Nhậu
  "quan-nhau": "quan-nhau",
  "nem-lui": "quan-nhau",
  nuong: "quan-nhau",
  lau: "quan-nhau",
  // Giải trí
  karaoke: "giai-tri",
  cinema: "giai-tri",
  arcade: "giai-tri",
  massage: "giai-tri",
  spa: "giai-tri",
  "music-box": "giai-tri",
  bida: "giai-tri",
  bowling: "giai-tri",
  "water-park": "giai-tri",
  // Mua sắm
  "sieu-thi": "mua-sam",
  cho: "mua-sam",
  mall: "mua-sam",
  // Còn lại → quán ăn
  "quan-an": "quan-an",
  "an-vat": "quan-an",
  "viet-nam": "quan-an",
  pho: "quan-an",
  bun: "quan-an",
  com: "quan-an",
  "com-ga": "quan-an",
  "mi-quang": "quan-an",
  "bun-cha-ca": "quan-an",
  "bun-mam": "quan-an",
  "bun-mam-nem": "quan-an",
  "cao-lau": "quan-an",
  chao: "quan-an",
  che: "quan-an",
  "kem-bo": "quan-an",
  "hu-tieu": "quan-an",
  "sinh-to": "quan-an",
  "tra-sua": "quan-an",
  xoi: "quan-an",
  nhat: "quan-an",
  han: "quan-an",
  thai: "quan-an",
  trung: "quan-an",
  "an-do": "quan-an",
  y: "quan-an",
  khac: "quan-an",
}

/** Nhóm ảnh hợp lệ — khớp tên thư mục con của `categories/`. */
const IMAGE_GROUPS = ["cafe", "quan-an", "hai-san", "banh-mi", "chay", "quan-nhau", "giai-tri", "mua-sam"]

/** Đuôi file ảnh được chấp nhận trong manifest. */
const IMAGE_EXT = /\.(webp|png|jpe?g)$/i

/**
 * Biến thể kích thước do `generate-image-variants.sh` sinh (`<tên>-400.webp`,
 * `<tên>-800.webp`). KHÔNG được đưa vào manifest: manifest là danh sách ảnh
 * GỐC, còn `coldStartSrcSet()` tự dựng `-400`/`-800` từ tên gốc. Nếu lọt vào,
 * FE chọn nhầm `cafe-2-800.webp` rồi nối thêm hậu tố → `cafe-2-800-400.webp`
 * (404) → card rơi về SVG placeholder dù ảnh minh hoạ có sẵn (L-033).
 */
const SIZE_VARIANT = /-\d+\.webp$/i

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

/** Liệt kê file trong `dir`; thư mục chưa tồn tại → []. */
async function listDir(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    return entries.filter((entry) => entry.isFile()).map((entry) => entry.name)
  } catch {
    return []
  }
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

/**
 * Sinh manifest `{ group: [file...] }` từ thư mục THẬT.
 * Sắp xếp tên file để thứ tự tất định (hash(name) chọn index ổn định giữa các
 * lần build và giữa các máy). Nhóm không có ảnh → mảng rỗng.
 */
async function writeCategoryManifest(dir) {
  const manifest = {}
  for (const group of IMAGE_GROUPS) {
    const files = (await listDir(join(dir, group)))
      .filter((name) => IMAGE_EXT.test(name) && !SIZE_VARIANT.test(name))
      .sort((a, b) => a.localeCompare(b, "en"))
    manifest[group] = files
  }
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8")
  return manifest
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

  // Xoá file đích không còn ở nguồn (ảnh đã bị loại khỏi dataset) — đồng bộ
  // một chiều, tránh public/ tích tụ ảnh cũ không bao giờ được dùng lại.
  const sourceRel = new Set(files.map((from) => relative(source, from)))
  let removed = 0
  for (const to of await walk(target)) {
    // manifest.json do script tự sinh — không coi là file thừa.
    if (to === join(target, "categories", "manifest.json")) continue
    if (!sourceRel.has(relative(target, to))) {
      await rm(to)
      removed += 1
    }
  }

  // Manifest của ảnh minh họa theo nhóm — đọc từ bản ĐÃ CHÉP trong public/ để
  // FE và script luôn thấy cùng một danh sách.
  const manifest = await writeCategoryManifest(join(target, "categories"))
  const totalCategoryImages = Object.values(manifest).reduce((sum, list) => sum + list.length, 0)

  console.log(
    copied === 0 && removed === 0
      ? `[cold-start] Ảnh đã đồng bộ (${files.length} file).`
      : `[cold-start] Đã chép ${copied}/${files.length} ảnh, xoá ${removed} file cũ ở public/data/cold-start/images.`,
  )
  console.log(
    `[cold-start] Manifest categories: ${totalCategoryImages} ảnh trong ${IMAGE_GROUPS.length} nhóm.`,
  )
}

main().catch((error) => {
  console.error("[cold-start] Không chép được ảnh:", error)
  process.exit(1)
})
