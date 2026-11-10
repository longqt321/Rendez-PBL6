#!/usr/bin/env node
/**
 * Pha E — kiểm chứng dataset cold-start sau tái sinh.
 *
 * Kiểm: schema trường bắt buộc, địa chỉ có số nhà, toạ độ trong địa giới Đà Nẵng,
 * ảnh tồn tại trên đĩa, không trùng tên/toạ độ, phân bố quận. Exit 1 nếu vi phạm
 * để dùng được trong CI.
 *
 * Chạy: node scripts/cold-start/validate.mjs
 */
import { readFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "../..")
const dataDir = join(root, "data/cold-start")
const data = JSON.parse(await readFile(join(dataDir, "places.json"), "utf8"))
const places = data.places

const BOUNDS = { minLat: 15.93, maxLat: 16.16, minLng: 107.9, maxLng: 108.3 }
const REQUIRED = ["id", "name", "category", "district", "address", "lat", "lng", "tier"]
const errors = []
const warnings = []

function normalizeName(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

const ids = new Set()
/** Khoảng cách Euclid thô trên toạ độ (đủ để so trùng < 120m). */
function distanceMeters(a, b) {
  const dLat = (a.lat - b.lat) * 111_320
  const dLng = (a.lng - b.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180)
  return Math.hypot(dLat, dLng)
}

const byDistrict = {}

for (const p of places) {
  for (const key of REQUIRED) {
    if (p[key] === undefined || p[key] === null || p[key] === "") {
      errors.push(`${p.id ?? "(không id)"}: thiếu trường ${key}`)
    }
  }
  if (ids.has(p.id)) errors.push(`${p.id}: id trùng`)
  ids.add(p.id)

  if (!/\d/.test(p.address ?? "")) errors.push(`${p.id}: địa chỉ không có số nhà — "${p.address}"`)

  if (
    p.lat < BOUNDS.minLat ||
    p.lat > BOUNDS.maxLat ||
    p.lng < BOUNDS.minLng ||
    p.lng > BOUNDS.maxLng
  ) {
    errors.push(`${p.id}: toạ độ ngoài Đà Nẵng (${p.lat}, ${p.lng})`)
  }

  if (p.image && !existsSync(join(dataDir, p.image))) {
    errors.push(`${p.id}: ảnh không tồn tại — ${p.image}`)
  }
  if (!p.image) warnings.push(`${p.id}: chưa có ảnh`)

  const key = normalizeName(p.name)
  const prev = places.find((q) => normalizeName(q.name) === key && q !== p)
  if (prev) {
    // Cùng tên chỉ là trùng khi cùng vị trí (< 120m); xa nhau là chi nhánh khác.
    if (prev.lat != null && distanceMeters(prev, p) < 120) {
      errors.push(`${p.id}: trùng lặp với ${prev.id} — "${p.name}" (< 120m)`)
    } else {
      warnings.push(`${p.id}: cùng tên "${p.name}" với ${prev.id} — chi nhánh khác, giữ lại`)
    }
  }

  byDistrict[p.district] = (byDistrict[p.district] ?? 0) + 1
}

// Phân bố: quận dưới 15 địa điểm là cảnh báo (mục tiêu cân bằng).
for (const [district, count] of Object.entries(byDistrict)) {
  if (count < 15) warnings.push(`quận ${district} chỉ có ${count} địa điểm`)
}

const imageCount = places.filter((p) => p.image).length
const distinctImages = new Set(places.map((p) => p.image).filter(Boolean)).size

console.log(
  `Tổng: ${places.length} địa điểm | có ảnh: ${imageCount} | ảnh distinct: ${distinctImages}`,
)
console.log("Theo quận:", JSON.stringify(byDistrict, null, 1))
console.log(
  "Theo tier:",
  JSON.stringify(places.reduce((acc, p) => ({ ...acc, [p.tier]: (acc[p.tier] ?? 0) + 1 }), {})),
)

if (warnings.length > 0) {
  console.log(`\n⚠️  Cảnh báo (${warnings.length}):`)
  for (const w of warnings.slice(0, 20)) console.log("  -", w)
  if (warnings.length > 20) console.log(`  … và ${warnings.length - 20} cảnh báo khác`)
}

if (errors.length > 0) {
  console.error(`\n❌ Lỗi (${errors.length}):`)
  for (const e of errors.slice(0, 30)) console.error("  -", e)
  if (errors.length > 30) console.error(`  … và ${errors.length - 30} lỗi khác`)
  process.exit(1)
}

console.log("\n✅ Dataset hợp lệ")
