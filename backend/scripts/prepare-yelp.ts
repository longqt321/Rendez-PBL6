/**
 * Chuẩn bị Yelp Open Dataset cho benchmark: lọc theo thành phố, xuất JSONL.
 *
 * Vì sao lọc thay vì import cả 150k business / 7M review:
 * - Import toàn bộ cần embedding 150k venue (hàng chục giờ CPU) trong khi mục đích
 *   của track A là *so sánh được với literature*, không phải tối đa quy mô.
 * - 2 thành phố (~15–25k business) đủ cho thống kê và vẫn import/embed trong thời
 *   gian hợp lý.
 *
 * Đọc trực tiếp từ ZIP bằng stream 2 tầng: `unzip -p ... yelp_dataset.tar` →
 * `tar -xzO -` — không giải nén 10GB ra đĩa.
 *
 * Cấu trúc dataset thực tế (đã verify bằng unzip -l / tar -tzvf):
 *   Yelp-JSON.zip
 *   └─ "Yelp JSON/yelp_dataset.tar"  (4.34GB, là tar.gz)
 *      └─ yelp_academic_dataset_business.json  (~119MB JSONL)
 *         yelp_academic_dataset_review.json    (~5.34GB JSONL)
 *
 * Chạy:
 *   bun run scripts/prepare-yelp.ts                       # dùng thành phố mặc định
 *   bun run scripts/prepare-yelp.ts --cities "Portland,Austin"
 *   YELP_ZIP=/path/to/Yelp-JSON.zip bun run scripts/prepare-yelp.ts
 */
import { createWriteStream, existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import { createInterface } from "node:readline"
import { Readable } from "node:stream"

/**
 * Thành phố mặc định — chọn theo tiêu chí: đủ lớn cho thống kê, đa dạng loại hình
 * (cafe/restaurant/bar/bakery/street-food).
 *
 * LƯU Ý (đã verify bằng histogram 50k business đầu tiên, 2026-11-13): Yelp round
 * hiện tại KHÔNG chứa Portland/Austin nữa — top thành phố là Philadelphia, Tucson,
 * Tampa, Indianapolis, Nashville, New Orleans, Reno... Nên chọn Philadelphia
 * (~14.5k business, lớn nhất) + Tucson (~9k).
 */
const DEFAULT_CITIES = ["Philadelphia", "Tucson"]

const TAR = process.env["YELP_TAR"] ?? "/home/longtran/datasets/yelp/yelp_dataset.tar"
const OUT_DIR = process.env["YELP_DATA_DIR"] ?? join(import.meta.dir, "..", "data", "yelp")

function parseCities(): string[] {
  const idx = process.argv.indexOf("--cities")
  if (idx === -1) return DEFAULT_CITIES
  const raw = process.argv[idx + 1]
  if (!raw) throw new Error('--cities cần giá trị, ví dụ --cities "Portland,Austin"')
  return raw
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
}

/** Đọc từng dòng JSON từ một entry trong tar.gz, không giải nén JSONL ra đĩa. */
async function* readZipEntry(entry: string): AsyncGenerator<string> {
  // tar tự nhận diện nén (gzip) và ghi entry ra stdout với -O.
  const proc = Bun.spawn(["tar", "-xzOf", TAR, entry], {
    stdout: "pipe",
    stderr: "pipe",
  })
  const nodeStream = Readable.fromWeb(proc.stdout as import("node:stream/web").ReadableStream)
  const rl = createInterface({ input: nodeStream, crlfDelay: Infinity })
  for await (const line of rl) {
    if (line.trim().length > 0) yield line
  }
  const code = await proc.exited
  if (code !== 0) throw new Error(`unzip -p ${entry} thoát với mã ${code}`)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

async function main(): Promise<void> {
  if (!existsSync(TAR)) {
    throw new Error(
      `Không thấy ${TAR}. Giải nén Yelp-JSON.zip trước (unzip -o Yelp-JSON.zip "Yelp JSON/yelp_dataset.tar") rồi đặt YELP_TAR=<đường dẫn tar>.`,
    )
  }
  const cities = parseCities()
  const citySet = new Set(cities)
  mkdirSync(OUT_DIR, { recursive: true })

  console.log(`TAR: ${TAR}`)
  console.log(`Thành phố: ${cities.join(", ")}`)

  // --- Bước 1: lọc business theo thành phố ---
  const businessOut = join(OUT_DIR, "business.jsonl")
  const out = createWriteStream(businessOut)
  const keptIds = new Set<string>()
  let read = 0
  let kept = 0
  for await (const line of readZipEntry("yelp_academic_dataset_business.json")) {
    read++
    let parsed: unknown
    try {
      parsed = JSON.parse(line)
    } catch {
      continue
    }
    if (!isRecord(parsed)) continue
    const city = typeof parsed["city"] === "string" ? parsed["city"] : ""
    const id = typeof parsed["business_id"] === "string" ? parsed["business_id"] : ""
    if (!citySet.has(city) || !id) continue
    keptIds.add(id)
    kept++
    out.write(`${line}\n`)
  }
  await new Promise<void>((resolve) => out.end(resolve))
  console.log(`business: đọc ${read}, giữ ${kept} (${cities.join("+")})`)

  // --- Bước 2: lọc review theo business đã giữ ---
  const reviewOut = join(OUT_DIR, "review.jsonl")
  const rout = createWriteStream(reviewOut)
  let rRead = 0
  let rKept = 0
  for await (const line of readZipEntry("yelp_academic_dataset_review.json")) {
    rRead++
    let parsed: unknown
    try {
      parsed = JSON.parse(line)
    } catch {
      continue
    }
    if (!isRecord(parsed)) continue
    const bid = typeof parsed["business_id"] === "string" ? parsed["business_id"] : ""
    if (!keptIds.has(bid)) continue
    rKept++
    rout.write(`${line}\n`)
  }
  await new Promise<void>((resolve) => rout.end(resolve))
  console.log(`review: đọc ${rRead}, giữ ${rKept}`)
  console.log(`\nĐã ghi:\n  ${businessOut}\n  ${reviewOut}`)
  console.log(`\nBước tiếp: bun run scripts/import-yelp.ts`)
}

void main()
