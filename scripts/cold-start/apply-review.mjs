#!/usr/bin/env node
/**
 * Áp dụng kết quả duyệt tay (D-048) vào pipeline cold-start.
 *
 * Đọc `review-state.json` (overlay do review-server ghi) và sinh:
 * 1. `wrong-image`     → thêm URL nguồn ảnh vào `.cache/image-blocklist.json`
 *                        (diversify-images.mjs sẽ không tải lại ảnh rác).
 * 2. `not-exists`      → đặt `status: "closed"` trong places.json (kèm nguồn
 *                        "manual-review" — an toàn hơn xoá, có thể hoàn tác).
 * 3. `duplicate`       → ghi `.cache/review-duplicates.json` để xử lý tay.
 * 4. `wrong-address`   → ghi `.cache/review-wrong-address.json` (cần sửa toạ độ tay).
 *
 * Mặc định chỉ BÁO CÁO; dùng `--apply` để ghi thay đổi thật.
 * Chạy: node scripts/cold-start/apply-review.mjs [--apply]
 */
import { readFile, writeFile, rename } from "node:fs/promises"
import { existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "../..")
const dataDir = join(root, "data/cold-start")
const cacheDir = join(dataDir, ".cache")
const stateFile = join(dataDir, "review-state.json")
const apply = process.argv.includes("--apply")

if (!existsSync(stateFile)) {
  console.error("Chưa có review-state.json — chạy review-server.mjs và duyệt trước.")
  process.exit(1)
}

const state = JSON.parse(await readFile(stateFile, "utf8"))
const dataset = JSON.parse(await readFile(join(dataDir, "places.json"), "utf8"))
const places = dataset.places
const byId = new Map(places.map((p) => [p.id, p]))

/** file ảnh → URL nguồn Commons (diversify-images.mjs ghi khi tải). */
const sourcesPath = join(cacheDir, "dish-sources.json")
const dishSources = existsSync(sourcesPath)
  ? JSON.parse(await readFile(sourcesPath, "utf8"))
  : {}

const counts = { ok: 0, "wrong-image": 0, "wrong-address": 0, "not-exists": 0, duplicate: 0 }
const newBlocklist = new Set()
const duplicates = []
const wrongAddresses = []
const unknownIds = []

for (const [id, decision] of Object.entries(state.decisions)) {
  counts[decision.verdict] = (counts[decision.verdict] ?? 0) + 1
  const place = byId.get(id)
  if (!place) {
    unknownIds.push(id)
    continue
  }

  if (decision.verdict === "wrong-image") {
    // Ảnh chính + mọi ảnh trong gallery đều block (cùng nguồn rác thường cả bộ).
    for (const img of [place.image, ...(place.images ?? [])]) {
      const url = img && dishSources[img]
      if (url) newBlocklist.add(url)
    }
  } else if (decision.verdict === "duplicate") {
    duplicates.push({ id, name: place.name, duplicateOf: decision.duplicateOf, note: decision.note })
  } else if (decision.verdict === "wrong-address") {
    wrongAddresses.push({ id, name: place.name, address: place.address, note: decision.note })
  }
}

console.log(`Tổng quyết định: ${Object.values(counts).reduce((a, b) => a + b, 0)}`)
for (const [verdict, count] of Object.entries(counts)) {
  if (count) console.log(`  ${verdict}: ${count}`)
}
if (unknownIds.length) console.log(`⚠️  ${unknownIds.length} id không còn trong dataset (bỏ qua)`)

const blocklistPath = join(cacheDir, "image-blocklist.json")
const blocklist = existsSync(blocklistPath)
  ? JSON.parse(await readFile(blocklistPath, "utf8"))
  : []
const merged = [...new Set([...blocklist, ...newBlocklist])]
console.log(`Blocklist: ${blocklist.length} → ${merged.length} URL (+${merged.length - blocklist.length})`)

if (apply) {
  await writeFile(blocklistPath, JSON.stringify(merged, null, 1))

  let closed = 0
  for (const [id, decision] of Object.entries(state.decisions)) {
    const place = byId.get(id)
    if (place && decision.verdict === "not-exists" && place.status !== "closed") {
      place.status = "closed"
      place.sources = [...new Set([...(place.sources ?? []), "manual-review"])]
      closed++
    }
  }
  await writeFile(join(dataDir, "places.json"), JSON.stringify(dataset, null, 2))
  console.log(`Đã áp dụng: blocklist ${merged.length} URL, đóng ${closed} quán`)

  if (duplicates.length) {
    await writeFile(join(cacheDir, "review-duplicates.json"), JSON.stringify(duplicates, null, 2))
    console.log(`Danh sách trùng lặp: .cache/review-duplicates.json (${duplicates.length})`)
  }
  if (wrongAddresses.length) {
    await writeFile(
      join(cacheDir, "review-wrong-address.json"),
      JSON.stringify(wrongAddresses, null, 2),
    )
    console.log(`Danh sách sai địa chỉ: .cache/review-wrong-address.json (${wrongAddresses.length})`)
  }
} else {
  console.log("Chế độ báo cáo — chạy lại với --apply để ghi thay đổi thật.")
}
