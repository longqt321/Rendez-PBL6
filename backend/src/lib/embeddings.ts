import type { FeatureExtractionPipeline } from "@huggingface/transformers"
import {
  ConsecutiveBreaker,
  TimeoutStrategy,
  circuitBreaker,
  handleAll,
  timeout,
  wrap,
} from "cockatiel"
import { createHash } from "node:crypto"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { LRUCache } from "lru-cache"
import { getRedis } from "./redis"
import { logger } from "./logger"
import { registerCircuitBreaker } from "./metrics"
import { recordEmbedTiming } from "./request-context"

const MODEL_ID = "Xenova/multilingual-e5-small"
const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL?.trim() || ""

const encodeBreaker = circuitBreaker(handleAll, {
  halfOpenAfter: 30_000,
  breaker: new ConsecutiveBreaker(3),
})
registerCircuitBreaker("embeddings", encodeBreaker)

const encodePolicy = wrap(encodeBreaker, timeout(3_000, TimeoutStrategy.Aggressive))

const QUERY_CACHE_MAX = 100

let extractor: FeatureExtractionPipeline | null = null
let initPromise: Promise<FeatureExtractionPipeline | null> | null = null

async function getExtractor(): Promise<FeatureExtractionPipeline | null> {
  if (EMBEDDING_SERVICE_URL) return null
  if (extractor) return extractor
  initPromise ??= import("@huggingface/transformers")
    .then(({ pipeline, env }) => {
      env.cacheDir =
        process.env.TRANSFORMERS_CACHE_DIR ?? join(tmpdir(), "rendez-transformers-cache")
      return pipeline("feature-extraction", MODEL_ID, { dtype: "q8" })
    })
    .then((pipe) => {
      extractor = pipe as FeatureExtractionPipeline
      return extractor
    })
    .catch((err) => {
      logger.warn({ err }, "embeddings: khởi tạo model thất bại")
      initPromise = null // cho phép thử lại ở lần gọi sau
      return null
    })
  return initPromise
}

// Chỉ warm-up ONNX ở tiến trình giữ model; worker HTTP dùng EMBEDDING_SERVICE_URL không nạp ONNX.
if (!EMBEDDING_SERVICE_URL) {
  void (async () => {
    const pipe = await getExtractor()
    if (!pipe) return
    try {
      await embedQuery("warmup")
    } catch {
      /* đã bắt trong embedQuery */
    }
  })()
}

async function encodeRemote(texts: string[]): Promise<Float32Array[] | null> {
  const startedAt = performance.now()
  try {
    const vectors = await encodePolicy.execute(async () => {
      const response = await fetch(`${EMBEDDING_SERVICE_URL}/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts }),
      })
      if (!response.ok) {
        throw new Error(`Embedding service HTTP ${response.status}`)
      }
      const payload = (await response.json()) as { vectors?: number[][] }
      if (!Array.isArray(payload.vectors)) return null
      return payload.vectors.map((row) => new Float32Array(row))
    })
    return vectors
  } catch (err) {
    logger.warn({ err }, "embeddings: gọi embedding service nội bộ thất bại")
    return null
  } finally {
    recordEmbedTiming(performance.now() - startedAt)
  }
}

export async function encode(texts: string[]): Promise<Float32Array[] | null> {
  if (EMBEDDING_SERVICE_URL) {
    return encodeRemote(texts)
  }
  const pipe = await getExtractor()
  if (!pipe) return null
  const startedAt = performance.now()
  try {
    const output = await encodePolicy.execute(() =>
      pipe(texts, {
        pooling: "mean",
        normalize: true,
      }),
    )
    // Kết quả shape [batch, 384] — tách từng dòng.
    const dims = output.dims as number[]
    const batchSize = dims[0] ?? texts.length
    const dim = dims[1] ?? 384
    const data = output.data as Float32Array
    const result: Float32Array[] = []
    for (let i = 0; i < batchSize; i++) {
      result.push(data.slice(i * dim, (i + 1) * dim))
    }
    return result
  } catch (err) {
    logger.warn({ err }, "embeddings: encode thất bại")
    return null
  } finally {
    recordEmbedTiming(performance.now() - startedAt)
  }
}

const queryCache = new LRUCache<string, Float32Array>({ max: QUERY_CACHE_MAX })
const REDIS_QUERY_EMBED_TTL_SECONDS = 24 * 60 * 60

function redisEmbedKey(text: string): string {
  const hash = createHash("sha256").update(text).digest("hex").slice(0, 24)
  return `rendez:emb:q:v1:${hash}`
}

export async function embedQuery(text: string): Promise<Float32Array | null> {
  const cached = queryCache.get(text)
  if (cached) return cached

  const redis = getRedis()
  const rKey = redisEmbedKey(text)
  if (redis) {
    try {
      const raw = await redis.get(rKey)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const vec = new Float32Array(parsed as number[])
          queryCache.set(text, vec)
          return vec
        }
      }
    } catch {
      // Redis cache miss/error không chặn đường tìm kiếm chính
    }
  }

  const vecs = await encode([`query: ${text}`])
  if (!vecs) return null
  try {
    const vec = vecs[0]
    if (vec) {
      queryCache.set(text, vec)
      if (redis) {
        void redis
          .set(rKey, JSON.stringify(Array.from(vec)), "EX", REDIS_QUERY_EMBED_TTL_SECONDS)
          .catch(() => {})
      }
    }
    return vec ?? null
  } catch (err) {
    logger.warn({ err }, "embeddings: embedQuery thất bại")
    return null
  }
}

/**
 * Embed một danh sách passage (prefix `passage: `) — dùng cho backfill script.
 * Trả mảng cùng độ dài đầu vào, phần tử `null` khi lỗi.
 */
export async function embedPassages(texts: string[]): Promise<(Float32Array | null)[]> {
  if (texts.length === 0) return []
  const vecs = await encode(texts.map((text) => `passage: ${text}`))
  if (!vecs) return texts.map(() => null)
  return vecs
}

/** Vector → chuỗi `[a,b,c]` cho cast `::vector` của pgvector. */
export function vectorToLiteral(vec: Float32Array): string {
  return `[${Array.from(vec).join(",")}]`
}
