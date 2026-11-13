/**
 * Embedding văn bản bằng `Xenova/multilingual-e5-small` (384 chiều, q8).
 *
 * E5 yêu cầu prefix: `query: ` cho truy vấn tìm kiếm, `passage: ` cho tài liệu
 * (địa điểm). Mean pooling + L2 normalize — chuẩn của pipeline feature-extraction
 * với `pooling: "mean", normalize: true`.
 *
 * Ràng buộc an toàn: KHÔNG BAO GIỜ throw ra ngoài caller — mọi lỗi (model tải
 * thất bại, ONNX runtime lỗi, OOM…) bị nuốt và trả `null`/mảng null; caller
 * (`lib/places.ts`) tự fallback về lexical. Warm-up chạy lúc import để lần
 * request đầu không chịu chi phí tải model (~vài trăm ms).
 */
import { pipeline, type FeatureExtractionPipeline, env } from "@huggingface/transformers"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { logger } from "./logger"

const MODEL_ID = "Xenova/multilingual-e5-small"

/**
 * Thư mục cache model. Mặc định `./.cache` tương đối với bundle — trong image
 * runtime chạy user `bun` nên `/app/backend/.cache` không ghi được (EACCES).
 * Dùng thư mục tạm của hệ điều hành (luôn ghi được) hoặc biến môi trường khi
 * muốn giữ cache qua các lần restart (mount volume).
 */
env.cacheDir = process.env.TRANSFORMERS_CACHE_DIR ?? join(tmpdir(), "rendez-transformers-cache")
/** Cache query embedding — giới hạn để không phình RAM khi traffic lớn. */
const QUERY_CACHE_MAX = 100

let extractor: FeatureExtractionPipeline | null = null
let initPromise: Promise<FeatureExtractionPipeline | null> | null = null

async function getExtractor(): Promise<FeatureExtractionPipeline | null> {
  if (extractor) return extractor
  if (!initPromise) {
    initPromise = pipeline("feature-extraction", MODEL_ID, { dtype: "q8" })
      .then((pipe) => {
        extractor = pipe as FeatureExtractionPipeline
        return extractor
      })
      .catch((err) => {
        logger.warn({ err }, "embeddings: khởi tạo model thất bại")
        initPromise = null // cho phép thử lại ở lần gọi sau
        return null
      })
  }
  return initPromise
}

// Warm-up lúc import — encode 1 câu ngắn để ONNX tải sẵn vào bộ nhớ.
void (async () => {
  const pipe = await getExtractor()
  if (!pipe) return
  try {
    await embedQuery("warmup")
  } catch {
    /* đã bắt trong embedQuery */
  }
})()

/** Mean pooling trên last_hidden_state rồi L2 normalize — trả mảng JS thường. */
async function encode(texts: string[]): Promise<Float32Array[] | null> {
  const pipe = await getExtractor()
  if (!pipe) return null
  try {
    const output = await pipe(texts, {
      pooling: "mean",
      normalize: true,
    })
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
  }
}

/**
 * Cache query embedding (LRU đơn giản bằng Map — giữ thứ tự chèn, xoá phần tử
 * cũ nhất khi vượt giới hạn). Query lặp lại (autocomplete gõ dần) không phải
 * encode lại (~26–49ms/lần).
 */
const queryCache = new Map<string, Float32Array>()

/**
 * Embed một query tìm kiếm (prefix `query: `). Trả `null` khi encoder lỗi —
 * caller fallback lexical, không bao giờ throw.
 */
export async function embedQuery(text: string): Promise<Float32Array | null> {
  const cached = queryCache.get(text)
  if (cached) return cached
  const pipe = await getExtractor()
  if (!pipe) return null
  try {
    const vec = (await encode([`query: ${text}`]))?.[0]
    if (vec) {
      if (queryCache.size >= QUERY_CACHE_MAX) {
        // Phần tử đầu tiên là phần cũ nhất (Map giữ thứ tự chèn).
        const oldest = queryCache.keys().next().value
        if (oldest !== undefined) queryCache.delete(oldest)
      }
      queryCache.set(text, vec)
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
