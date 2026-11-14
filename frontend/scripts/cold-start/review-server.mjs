#!/usr/bin/env node
/**
 * Công cụ duyệt thủ công cold-start data (D-048) — server nhỏ, không dependency.
 *
 * Vì sao tách khỏi app: MSW chạy trong browser không ghi được file, nên route
 * `/dev/review` trong app sẽ phải thêm Vite middleware. Tool độc lập này chỉ
 * đọc `places.json`, ghi `review-state.json` (overlay), và serve ảnh — không
 * đụng code app, không ảnh hưởng production.
 *
 * Chạy: node scripts/cold-start/review-server.mjs [--port 5198]
 *       node scripts/cold-start/review-server.mjs --data ../backend/data/places-expanded.json
 * Mở:  http://localhost:5198
 *
 * `--data` duyệt dataset khác `places.json` (mặc định). Khi dùng `--data`, overlay
 * quyết định mặc định ghi cạnh file đó (`<file>.review-state.json`) để không trộn
 * phán quyết giữa hai bộ dữ liệu; có thể chỉ định rõ bằng `--state <file>`.
 */
import { createServer } from "node:http"
import { readFile, writeFile, rename, stat } from "node:fs/promises"
import { existsSync } from "node:fs"
import { dirname, extname, join, normalize, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

const scriptDir = dirname(fileURLToPath(import.meta.url))
const root = join(scriptDir, "../..")
const dataDir = join(root, "data/cold-start")
const imagesDir = join(dataDir, "images")
const uiFile = join(scriptDir, "review-ui.html")

const portArg = process.argv.indexOf("--port")
const PORT = portArg > -1 ? Number(process.argv[portArg + 1]) : 5198

/**
 * `--data <file>` cho phép duyệt một dataset KHÁC `places.json` — dùng để duyệt
 * corpus đang là nguồn sự thật (`backend/data/places-expanded.json`, 344 place)
 * thay vì dataset cold-start gốc (491). Đường dẫn tương đối tính từ thư mục
 * `frontend/` để giữ thói quen chạy cũ.
 *
 * `--state <file>` tương ứng: quyết định của mỗi dataset phải nằm ở overlay
 * riêng, nếu không hai bộ sẽ ghi đè phán quyết lên nhau theo id trùng.
 */
function argValue(flag) {
  const index = process.argv.indexOf(flag)
  return index > -1 ? process.argv[index + 1] : undefined
}

const dataArg = argValue("--data")
const placesFile = dataArg ? resolve(root, dataArg) : join(dataDir, "places.json")
const stateFile = argValue("--state")
  ? resolve(root, argValue("--state"))
  : dataArg
    ? `${placesFile}.review-state.json`
    : join(dataDir, "review-state.json")

/** Trường client cần để duyệt — bỏ `imageNote`/`collectedAt` cho nhẹ payload. */
const FIELDS = [
  "id",
  "name",
  "category",
  "district",
  "address",
  "lat",
  "lng",
  "tier",
  "status",
  "image",
  "images",
  "imageKind",
  "phone",
  "openingHours",
  "description",
  "sources",
  "venuePageUrl",
]

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
}

const dataset = JSON.parse(await readFile(placesFile, "utf8"))
const places = dataset.places.map((p) => Object.fromEntries(FIELDS.map((k) => [k, p[k]])))

/** Overlay quyết định duyệt — KHÔNG sửa places.json. */
const emptyState = { version: 1, updatedAt: new Date().toISOString(), decisions: {} }
let state = existsSync(stateFile) ? JSON.parse(await readFile(stateFile, "utf8")) : emptyState
state.decisions ??= {}

/** Ghi atomic: file tạm rồi rename — tránh mất dữ liệu nếu tắt giữa chừng. */
async function saveState() {
  state.updatedAt = new Date().toISOString()
  const tmp = `${stateFile}.tmp`
  await writeFile(tmp, JSON.stringify(state, null, 2))
  await rename(tmp, stateFile)
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
  })
  res.end(payload)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on("data", (chunk) => {
      size += chunk.length
      if (size > 1_000_000) reject(new Error("Body quá lớn"))
      else chunks.push(chunk)
    })
    req.on("end", () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {})
      } catch (error) {
        reject(error)
      }
    })
    req.on("error", reject)
  })
}

/** Chỉ serve file trong `data/cold-start/images` — chặn path traversal. */
async function serveImage(res, urlPath) {
  const rel = decodeURIComponent(urlPath.replace(/^\/images\//, ""))
  const abs = normalize(join(imagesDir, rel))
  if (!abs.startsWith(imagesDir + sep)) return sendJson(res, 403, { error: "Ngoài thư mục ảnh" })
  try {
    const info = await stat(abs)
    if (!info.isFile()) throw new Error("không phải file")
    const buf = await readFile(abs)
    res.writeHead(200, {
      "Content-Type": MIME[extname(abs).toLowerCase()] ?? "application/octet-stream",
      "Content-Length": buf.length,
      "Cache-Control": "public, max-age=3600",
    })
    res.end(buf)
  } catch {
    sendJson(res, 404, { error: "Không tìm thấy ảnh" })
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const path = url.pathname

  try {
    if (req.method === "GET" && (path === "/" || path === "/index.html")) {
      const html = await readFile(uiFile, "utf8")
      res.writeHead(200, { "Content-Type": MIME[".html"], "Cache-Control": "no-store" })
      return res.end(html)
    }

    if (req.method === "GET" && path === "/api/places") {
      return sendJson(res, 200, {
        places,
        decisions: state.decisions,
        meta: { count: places.length, updatedAt: state.updatedAt },
      })
    }

    if (req.method === "POST" && path === "/api/decisions") {
      const body = await readBody(req)
      if (!body.id || !body.verdict) return sendJson(res, 400, { error: "Thiếu id/verdict" })
      state.decisions[body.id] = {
        verdict: body.verdict,
        note: body.note ?? "",
        duplicateOf: body.duplicateOf ?? null,
        reviewedAt: new Date().toISOString(),
      }
      await saveState()
      return sendJson(res, 200, { ok: true, decision: state.decisions[body.id] })
    }

    if (req.method === "DELETE" && path === "/api/decisions") {
      const id = url.searchParams.get("id")
      if (!id) return sendJson(res, 400, { error: "Thiếu id" })
      const previous = state.decisions[id] ?? null
      delete state.decisions[id]
      await saveState()
      return sendJson(res, 200, { ok: true, previous })
    }

    if (req.method === "GET" && path.startsWith("/images/")) {
      return serveImage(res, path)
    }

    sendJson(res, 404, { error: "Không tìm thấy" })
  } catch (error) {
    console.error(error)
    sendJson(res, 500, { error: error.message })
  }
})

server.listen(PORT, () => {
  console.log(`Review tool: http://localhost:${PORT}`)
  console.log(`  dataset: ${placesFile}`)
  console.log(`  ${places.length} địa điểm · đã duyệt ${Object.keys(state.decisions).length}`)
  console.log(`  Ctrl+C để dừng (quyết định đã lưu vào ${stateFile})`)
})
