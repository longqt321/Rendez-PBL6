#!/usr/bin/env node
/**
 * Pha E — sinh lại README.md + CREDITS cho dataset sau tái sinh.
 *
 * README: quy mô, phân bố theo quận, cách hiểu trường, việc còn lại.
 * CREDITS: chỉ mục ảnh THẬT của quán — ảnh món đã bị loại hẳn khỏi dataset (D-049).
 *
 * Chạy: node scripts/cold-start/update-docs.mjs
 */
import { readFile, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "../..")
const dataDir = join(root, "data/cold-start")
const data = JSON.parse(await readFile(join(dataDir, "places.json"), "utf8"))
const places = data.places

const byDistrict = {}
const byCategory = {}
const byTier = {}
for (const p of places) {
  byDistrict[p.district] = (byDistrict[p.district] ?? 0) + 1
  byCategory[p.category] = (byCategory[p.category] ?? 0) + 1
  byTier[p.tier] = (byTier[p.tier] ?? 0) + 1
}

const images = places.map((p) => p.image).filter(Boolean)
const distinctImages = new Set(images).size
const venueImages = places.filter((p) => p.imageKind === "venue").length

const districtRows = Object.entries(byDistrict)
  .sort((a, b) => b[1] - a[1])
  .map(([district, count]) => `| ${district} | ${count} |`)
  .join("\n")

const categoryRows = Object.entries(byCategory)
  .sort((a, b) => b[1] - a[1])
  .map(([category, count]) => `| ${category} | ${count} |`)
  .join("\n")

const readme = `# Cold-start data — quán ăn & cafe Đà Nẵng

Bộ data **thật** (không mock) dùng để seed khi nối backend. Độc lập với frontend/backend.

## Quy mô (tái sinh 2026-11-09, quyết định D-046)

- **${places.length} địa điểm** — mỗi địa điểm đều có **địa chỉ số nhà + tên đường** và **toạ độ**.
- Theo nguồn: ${Object.entries(byTier)
  .map(([tier, count]) => `${tier} ${count}`)
  .join(" · ")}.
- **${images.length}/${places.length} có ảnh**, ${distinctImages} ảnh khác nhau; ${venueImages} địa điểm có **ảnh thật của quán**.

### Phân bố theo quận/phường (đơn vị hành chính 2025)

| Quận/phường | Số địa điểm |
| --- | --- |
${districtRows}

### Phân bố theo phân loại

| Phân loại | Số địa điểm |
| --- | --- |
${categoryRows}

## Tiêu chuẩn dữ liệu (bắt buộc)

1. **Địa chỉ**: phải có **số nhà + tên đường** (ví dụ \`214 Lương Nhữ Hộc\`). Địa điểm chỉ có
   quận/phường hoặc mô tả tương đối ("đối diện 16 Hoàng Sa", "Lô 02-03…") **bị loại** —
   giữ lại chỉ gây loãng.
2. **Toạ độ**: mọi mục có \`lat\`/\`lng\` nằm trong địa giới TP Đà Nẵng, nguồn ghi ở \`geoSource\`
   (\`osm\` / \`nominatim\` / \`google-maps\`).
3. **Không trùng lặp**: cùng tên chuẩn hoá **và** cách nhau < 120m (cùng tên nhưng xa nhau là
   chi nhánh khác — giữ lại).
4. **Không bịa**: mỗi mục nguồn \`curated-v2\` có \`sources\` là URL nơi thông tin xuất hiện.

## Cách hiểu các trường

- \`tier\`: \`curated\` (báo chí ẩm thực) / \`curated-v2\` (nghiên cứu mạng xã hội 2026-11-09) /
  \`osm\` (POI OpenStreetMap).
- \`status\`: \`open\` / \`closed\` / \`unknown\` — hiện chưa xác minh quán còn hoạt động.
- \`imageKind\`: \`venue\` (ảnh thật quán) / \`dish\` (ảnh món đại diện theo nhóm, **không phải** ảnh quán).
- \`verified\`: luôn \`false\` — phải xác minh trước khi dùng production.

## Quy trình tái sinh (\`scripts/cold-start/\`)

| Script | Việc |
| --- | --- |
| \`enrich-osm.mjs\` | Lấy tag \`addr:*\`/\`phone\`/\`opening_hours\` từ OSM API (Overpass bị chặn) |
| \`geocode-nominatim.mjs\` | Geocode ứng viên nghiên cứu, cache trong \`.cache/\` |
| \`fix-districts.mjs\` | Sửa nhãn quận theo \`display_name\` Nominatim |
| \`rebuild.mjs\` | Lọc mục đạt chuẩn, gộp ứng viên, loại trùng, sinh \`places.csv\` |
| \`diversify-images.mjs\` | Tải ảnh món từ Wikimedia Commons (lọc tiêu đề rác + kiểm chất lượng), gán vòng tròn (tối đa 6 lần/ảnh); \`--rebalance\` gán lại toàn bộ |
| \`clean-images.mjs\` | Xoá ảnh rác do audit thị giác phát hiện, gỡ khỏi dataset |
| \`validate.mjs\` | Kiểm schema/địa chỉ/toạ độ/ảnh/trùng lặp — exit 1 nếu sai |
| \`review-server.mjs\` | Công cụ duyệt tay (D-048): \`bun run review:data\` → http://localhost:5198 |
| \`apply-review.mjs\` | Áp kết quả duyệt tay: blocklist ảnh rác, đóng quán không tồn tại |
| \`update-docs.mjs\` | Sinh lại README + CREDITS |

## Việc còn lại

1. Xác minh \`status\` từng quán (frontend có nút "Báo cáo", backend duyệt rồi mới đổi).
2. Xác minh giờ mở cửa/SĐT (chỉ một phần POI có tag).
3. Bổ sung ảnh thật cho quán \`curated-v2\` (hiện dùng ảnh món đại diện).
4. Giấy phép ảnh quán (Foody/Google Maps) — cần xin phép trước khi phát hành công khai.
`

await writeFile(join(dataDir, "README.md"), readme)

// CREDITS: sinh lại từ dataset — nguồn từng ảnh nằm trong trường `imageCredit`
// (điền 1 lần khi tải ảnh, không đoán lại từ tên file).
const creditsPath = join(dataDir, "CREDITS.md")
const withImage = places.filter((p) => p.image)

const credits = `# CREDITS — Nguồn ảnh

## Ảnh THẬT của quán (images/venues/)

Ảnh người dùng chụp tại quán, lấy từ trang quán trên Foody.vn và Google Maps.
**Chưa xác minh giấy phép** — dùng nội bộ/demo, cần xin phép trước khi phát hành công khai.

| Quán | File | Nguồn |
| --- | --- | --- |
${withImage.map((p) => `| ${p.id} | ${p.image} | ${p.imageCredit ?? "chưa rõ"} |`).join("\n")}
`

await writeFile(creditsPath, credits)
console.log(
  `Đã ghi README.md (${places.length} địa điểm) + CREDITS.md (${withImage.length} ảnh venue)`,
)
