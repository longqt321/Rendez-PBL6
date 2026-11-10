#!/usr/bin/env node
/**
 * Dọn ảnh rác phát hiện bằng audit thị giác (2026-11-10).
 *
 * Input: file JSON chứa danh sách đường dẫn ảnh rác tương đối với
 * `data/cold-start/` (vd: ["images/dishes/dish-001.jpg", ...]).
 *
 * Việc làm:
 * 1. Xoá file rác khỏi đĩa (dishes/ và venues/).
 * 2. Gỡ file rác khỏi mảng `images` của mọi địa điểm.
 * 3. Nếu `image` chính của địa điểm là file rác: gán sang ảnh còn lại trong
 *    `images`; hết ảnh thì để null (`imageKind: null`) — `diversify-images.mjs`
 *    sẽ gán lại ảnh món.
 * 4. Đặt lại mọi ảnh `images/dishes/` thành null để diversify gán lại toàn bộ
 *    (vì file dish được tải lại, đánh số mới — gán cũ không còn hợp lệ).
 *
 * Chạy: node scripts/cold-start/clean-images.mjs <junk.json>
 */
import { readFile, writeFile, unlink } from "node:fs/promises"
import { existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "../..")
const dataDir = join(root, "data/cold-start")
const junkFile = process.argv[2]
if (!junkFile) {
  console.error("Cách dùng: node scripts/cold-start/clean-images.mjs <junk.json>")
  process.exit(1)
}

const junk = new Set(JSON.parse(await readFile(junkFile, "utf8")))
const places = JSON.parse(await readFile(join(dataDir, "places.json"), "utf8"))

// Blocklist theo URL nguồn — diversify-images.mjs đọc file này để KHÔNG tải lại
// ảnh rác (xoá file thôi thì lần chạy sau vẫn tải lại từ cache Commons).
const blocklistPath = join(dataDir, ".cache/image-blocklist.json")
const blocklist = existsSync(blocklistPath) ? JSON.parse(await readFile(blocklistPath, "utf8")) : []
const sourcesPath = join(dataDir, ".cache/dish-sources.json")
const sources = existsSync(sourcesPath) ? JSON.parse(await readFile(sourcesPath, "utf8")) : {}
for (const rel of junk) {
  const url = sources[rel]
  if (url && !blocklist.includes(url)) blocklist.push(url)
}
await writeFile(blocklistPath, JSON.stringify([...new Set(blocklist)], null, 2))
console.log(`Blocklist: ${blocklist.length} URL`)

// 1. Xoá file rác.
let deleted = 0
for (const rel of junk) {
  const abs = join(dataDir, rel)
  if (existsSync(abs)) {
    await unlink(abs)
    deleted++
  }
}
console.log(`Đã xoá ${deleted}/${junk.size} file rác`)

// 2+3. Gỡ khỏi dataset; 4. reset toàn bộ ảnh dish.
let venueReassigned = 0
let venueDropped = 0
let dishReset = 0
for (const p of places.places) {
  if (Array.isArray(p.images)) {
    p.images = p.images.filter((img) => !junk.has(img))
  }
  if (p.image?.startsWith("images/dishes/")) {
    p.image = null
    p.imageKind = null
    dishReset++
    continue
  }
  if (junk.has(p.image)) {
    const next = p.images?.find((img) => img !== p.image && existsSync(join(dataDir, img)))
    if (next) {
      p.image = next
      venueReassigned++
    } else {
      p.image = null
      p.imageKind = null
      venueDropped++
    }
  }
}

console.log(
  `Venue: gán lại ${venueReassigned} primary, bỏ ${venueDropped} (hết ảnh thay thế) | reset ${dishReset} ảnh dish chờ gán lại`,
)

await writeFile(join(dataDir, "places.json"), JSON.stringify(places, null, 2))
console.log("Ghi xong places.json")
