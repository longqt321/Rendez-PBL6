import { join } from "node:path"
import {
  ConsecutiveBreaker,
  ExponentialBackoff,
  TimeoutStrategy,
  circuitBreaker,
  handleAll,
  retry,
  timeout,
  wrap,
} from "cockatiel"
import { Hono } from "hono"
import { LRUCache } from "lru-cache"
import sharp from "sharp"
import { createStorage } from "unstorage"
import fsLiteDriver from "unstorage/drivers/fs-lite"
import type { AppEnv } from "../app"
import { logger } from "../lib/logger"
import { registerCircuitBreaker } from "../lib/metrics"
import { recordExternalTiming } from "../lib/request-context"

const TILE_CACHE_DIR = join(import.meta.dir, "../../data/tile-cache")
const TILE_FILE_RE = /^(\d+)\.png$/u
const MIN_ZOOM = 10
const MAX_ZOOM = 19

const tileMemoryCache = new LRUCache<string, Uint8Array>({
  max: 500,
  ttl: 1000 * 60 * 60 * 24,
})

const tileDiskCache = createStorage({
  driver: fsLiteDriver({ base: TILE_CACHE_DIR }),
})

// Hai circuit breaker độc lập cho OSM Primary và CartoDB Secondary
const osmBreaker = circuitBreaker(handleAll, {
  halfOpenAfter: 30_000,
  breaker: new ConsecutiveBreaker(3),
})
registerCircuitBreaker("tiles-osm", osmBreaker)

const osmPolicy = wrap(
  retry(handleAll, {
    maxAttempts: 2,
    backoff: new ExponentialBackoff({ initialDelay: 150, maxDelay: 600 }),
  }),
  osmBreaker,
  timeout(3_500, TimeoutStrategy.Aggressive),
)

const cartoBreaker = circuitBreaker(handleAll, {
  halfOpenAfter: 30_000,
  breaker: new ConsecutiveBreaker(3),
})
registerCircuitBreaker("tiles-carto", cartoBreaker)

const cartoPolicy = wrap(cartoBreaker, timeout(3_500, TimeoutStrategy.Aggressive))

let offlineFallbackPngPromise: Promise<Uint8Array> | null = null

function getOfflineFallbackTile(): Promise<Uint8Array> {
  if (!offlineFallbackPngPromise) {
    // Tạo 1 tile 256x256 PNG màu giấy ấm đồng bộ nền bản đồ Rendez kèm lưới nhẹ
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
      <rect width="256" height="256" fill="#f5f1e8"/>
      <path d="M 64 0 V 256 M 128 0 V 256 M 192 0 V 256 M 0 64 H 256 M 0 128 H 256 M 0 192 H 256" stroke="#eae3d5" stroke-width="1"/>
    </svg>`
    offlineFallbackPngPromise = sharp(Buffer.from(svg))
      .png()
      .toBuffer()
      .then((buf) => new Uint8Array(buf))
  }
  return offlineFallbackPngPromise
}

async function fetchUpstreamTile(url: string, signal?: AbortSignal): Promise<Uint8Array> {
  const startedAt = performance.now()
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Rendez-Danang-Culinary-Guide/1.0 (+https://rendez.local)",
        Accept: "image/png,image/*;q=0.9",
      },
      signal,
    })
    if (!res.ok) {
      throw new Error(`Tile upstream trả HTTP ${res.status} (${url})`)
    }
    const buf = new Uint8Array(await res.arrayBuffer())
    if (buf.byteLength < 64) {
      throw new Error(`Tile upstream rỗng (${url})`)
    }
    return buf
  } finally {
    recordExternalTiming(performance.now() - startedAt)
  }
}

async function readDiskTile(storageKey: string): Promise<Uint8Array | null> {
  try {
    if (!(await tileDiskCache.hasItem(storageKey))) return null
    const raw = await tileDiskCache.getItemRaw<Uint8Array | Buffer | null>(storageKey)
    return raw ? new Uint8Array(raw) : null
  } catch {
    return null
  }
}

async function fetchTileWithFallback(
  z: number,
  x: number,
  y: number,
): Promise<{ bytes: Uint8Array; source: "osm" | "carto" | "offline" }> {
  try {
    const bytes = await osmPolicy.execute(({ signal }) =>
      fetchUpstreamTile(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`, signal),
    )
    return { bytes, source: "osm" }
  } catch (osmErr) {
    logger.warn({ err: osmErr, z, x, y }, "OSM tile upstream lỗi — chuyển sang CartoDB Voyager")
  }

  try {
    const bytes = await cartoPolicy.execute(({ signal }) =>
      fetchUpstreamTile(
        `https://a.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`,
        signal,
      ),
    )
    return { bytes, source: "carto" }
  } catch (cartoErr) {
    logger.warn({ err: cartoErr, z, x, y }, "CartoDB tile upstream lỗi — dùng offline grid tile")
  }

  return { bytes: await getOfflineFallbackTile(), source: "offline" }
}

function pngResponse(bytes: Uint8Array, cacheControl: string): Response {
  const body = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": cacheControl,
      "Cross-Origin-Resource-Policy": "cross-origin",
    },
  })
}

export function createTilesRouter() {
  const router = new Hono<AppEnv>()

  router.get("/tiles/:z/:x/:file", async (c) => {
    const zStr = c.req.param("z")
    const xStr = c.req.param("x")
    const file = c.req.param("file")
    const fileMatch = TILE_FILE_RE.exec(file)
    if (!fileMatch || !/^\d+$/u.test(zStr) || !/^\d+$/u.test(xStr)) {
      return c.json({ message: "Toạ độ tile không hợp lệ" }, 400)
    }

    const z = Number(zStr)
    const x = Number(xStr)
    const y = Number(fileMatch[1])
    const maxCoord = 1 << z

    if (z < MIN_ZOOM || z > MAX_ZOOM || x < 0 || x >= maxCoord || y < 0 || y >= maxCoord) {
      return c.json({ message: "Zoom hoặc toạ độ tile ngoài phạm vi" }, 400)
    }

    const cacheKey = `${z}:${x}:${y}.png`

    // Tầng 1: Memory LRU
    const memHit = tileMemoryCache.get(cacheKey)
    if (memHit) {
      c.set("cacheHit", true)
      return pngResponse(memHit, "public, max-age=604800, stale-while-revalidate=2592000")
    }

    // Tầng 2: Persistent Disk Cache (unstorage fs-lite)
    const diskHit = await readDiskTile(cacheKey)
    if (diskHit) {
      tileMemoryCache.set(cacheKey, diskHit)
      c.set("cacheHit", true)
      return pngResponse(diskHit, "public, max-age=604800, stale-while-revalidate=2592000")
    }

    // Tầng 3: Multi-CDN Failover (OSM -> CartoDB -> Offline Grid)
    const result = await fetchTileWithFallback(z, x, y)
    if (result.source !== "offline") {
      tileMemoryCache.set(cacheKey, result.bytes)
      tileDiskCache.setItemRaw(cacheKey, Buffer.from(result.bytes)).catch((err) => {
        logger.warn({ err, cacheKey }, "Lưu disk tile cache thất bại")
      })
      return pngResponse(result.bytes, "public, max-age=604800, stale-while-revalidate=2592000")
    }

    // Tile dự phòng offline chỉ giữ ngắn hạn trong HTTP cache để khi có mạng tự tải lại tile thật.
    return pngResponse(result.bytes, "public, max-age=60")
  })

  return router
}
