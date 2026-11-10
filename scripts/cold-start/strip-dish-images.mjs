#!/usr/bin/env node
/**
 * Bỏ toàn bộ ảnh món khỏi dataset (quyết định D-049).
 *
 * Bối cảnh: đợt duyệt tay 2026-11-10 đánh dấu 470/492 địa điểm là `wrong-image`.
 * Ảnh món đại diện theo nhóm (Commons) không giúp người dùng định vị quán, lại
 * lặp giữa các quán. Yêu cầu mới: ảnh phải là ảnh THẬT của quán (biển hiệu, mặt
 * tiền). Quán chưa có ảnh thật thì để trống — KHÔNG thay bằng ảnh minh hoạ.
 *
 * Script làm 4 việc:
 *   1. Địa điểm không có ảnh venue thật → `image: null`, `images: []`,
 *      `imageKind: null`, ghi chú rõ là chưa có ảnh.
 *   2. Loại địa điểm bị duyệt `wrong-address` (không xác minh được địa chỉ).
 *   3. Ghi lại `places.json` + `places.csv`.
 *   4. (tuỳ chọn `--purge-files`) Xoá file ảnh không còn được tham chiếu.
 *
 * Mặc định chỉ báo cáo. Thêm `--apply` mới ghi.
 */
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const dataDir = join(dirname(fileURLToPath(import.meta.url)), "../../data/cold-start")
const apply = process.argv.includes("--apply")
const purgeFiles = process.argv.includes("--purge-files")

const dataset = JSON.parse(readFileSync(join(dataDir, "places.json"), "utf8"))
const reviewState = JSON.parse(readFileSync(join(dataDir, "review-state.json"), "utf8"))
const decisions = reviewState.decisions ?? {}

const NO_IMAGE_NOTE = "Chưa có ảnh thật của quán — ảnh món không dùng làm ảnh đại diện."

const kept = []
const dropped = []
const stripped = []
const keptImages = new Set()

for (const place of dataset.places) {
  const verdict = decisions[place.id]?.verdict
  if (verdict === "wrong-address") {
    dropped.push(place)
    continue
  }

  const images = Array.isArray(place.images) ? place.images : []
  // Người dùng duyệt `wrong-image` thì bỏ ảnh dù là ảnh venue (duyệt tay là chuẩn).
  const isVenue = place.imageKind === "venue" && place.image && images.length > 0 && verdict !== "wrong-image"
  if (isVenue) {
    keptImages.add(place.image)
    for (const file of images) keptImages.add(file)
    kept.push(place)
    continue
  }

  if (place.image || images.length > 0 || place.imageKind) stripped.push(place.id)
  kept.push({
    ...place,
    image: null,
    images: [],
    imageKind: null,
    imageNote: NO_IMAGE_NOTE,
  })
}

const byDistrict = {}
for (const place of kept) {
  const key = place.district ?? "Không rõ"
  byDistrict[key] = (byDistrict[key] ?? 0) + 1
}

const output = {
  ...dataset,
  meta: {
    ...dataset.meta,
    count: kept.length,
    note: `${dataset.meta?.note ?? ""} — 2026-11-10: bỏ ảnh món, chỉ giữ ảnh venue thật (D-049).`,
  },
  stats: { ...dataset.stats, byDistrict },
  places: kept,
}

// Mọi file ảnh không còn được địa điểm nào tham chiếu (ảnh món + ảnh venue mồ côi).
const imagesDir = join(dataDir, "images")
const dishFiles = []
function collectUnreferenced(dir, prefix) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = `${prefix}/${entry.name}`
    if (entry.isDirectory()) {
      collectUnreferenced(join(dir, entry.name), rel)
    } else if (/\.(jpe?g|png|webp)$/i.test(entry.name) && !keptImages.has(rel)) {
      dishFiles.push(rel)
    }
  }
}
collectUnreferenced(imagesDir, "images")

console.log(`Tổng ban đầu: ${dataset.places.length}`)
console.log(`Giữ nguyên ảnh venue: ${kept.filter((p) => p.image).length}`)
console.log(`Bỏ ảnh món: ${stripped.length}`)
console.log(`Loại do wrong-address: ${dropped.map((p) => p.id).join(", ") || "không có"}`)
console.log(`Còn lại: ${kept.length} | có ảnh thật: ${kept.filter((p) => p.image).length}`)
console.log(`File ảnh món sẽ xoá: ${dishFiles.length}`)

if (!apply) {
  console.log("\n(Chưa ghi gì. Chạy lại với --apply [--purge-files].)")
  process.exit(0)
}

writeFileSync(join(dataDir, "places.json"), `${JSON.stringify(output, null, 2)}\n`)

const csvHeader = "id,name,category,district,address,lat,lng,tier,image\n"
const csvBody = kept
  .map((p) =>
    [p.id, p.name, p.category, p.district, p.address, p.lat, p.lng, p.tier, p.image ?? ""]
      .map((v) => `"${String(v).replaceAll('"', '""')}"`)
      .join(","),
  )
  .join("\n")
writeFileSync(join(dataDir, "places.csv"), csvHeader + csvBody)

if (purgeFiles) {
  for (const rel of dishFiles) {
    const abs = join(dataDir, rel)
    if (existsSync(abs)) rmSync(abs)
  }
}

console.log(`\nĐã ghi places.json (${kept.length} địa điểm) + places.csv`)
