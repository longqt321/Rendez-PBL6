#!/usr/bin/env node
/**
 * Sửa `district` của ứng viên nghiên cứu theo `displayName` Nominatim trả về.
 *
 * Agent nghiên cứu gán quận theo cảm nhận từ snippet nên có thể lệch (ví dụ
 * "Nia café 3/12 Phan Thành Tài" bị gán Cẩm Lệ nhưng thực tế ở Hải Châu).
 * Nominatim trả `display_name` chứa phường/quận thật — đối chiếu với danh sách
 * đơn vị hành chính đang dùng trong dataset và ghi đè khi tìm thấy.
 *
 * Chạy: node scripts/cold-start/fix-districts.mjs
 */
import { readFile, writeFile, readdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "../..")
const dataDir = join(root, "data/cold-start")
const researchDir = join(dataDir, "research")

const data = JSON.parse(await readFile(join(dataDir, "places.json"), "utf8"))
/** Đơn vị hành chính đang dùng trong dataset (phường/xã theo OSM 2025). */
const DISTRICTS = Object.keys(data.stats.byDistrict)

/** Tìm tên đơn vị hành chính xuất hiện trong display_name (bỏ dấu để so). */
function districtFromDisplayName(displayName) {
  if (!displayName) return null
  const normalized = displayName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
  let best = null
  for (const district of DISTRICTS) {
    const needle = district
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
    if (normalized.includes(needle) && (!best || district.length > best.length)) best = district
  }
  return best
}

const files = (await readdir(researchDir)).filter((f) => f.endsWith(".json"))
let changed = 0
for (const file of files) {
  const items = JSON.parse(await readFile(join(researchDir, file), "utf8"))
  for (const item of items) {
    const fromNominatim = districtFromDisplayName(item.displayName)
    if (fromNominatim && fromNominatim !== item.district) {
      console.log(`  ${item.name}: "${item.district}" → "${fromNominatim}"`)
      item.district = fromNominatim
      changed++
    }
  }
  await writeFile(join(researchDir, file), JSON.stringify(items, null, 2))
}
console.log(`Đã sửa ${changed} nhãn quận`)
