/**
 * Backfill embedding cho bảng `place_embeddings`.
 *
 * Passage text = name + category + district + tags (khớp thiết kế hybrid
 * search). content_hash = sha256(passage) — venue chưa đổi nội dung thì skip
 * để chạy lại script nhanh. Encode theo batch ~32, ghi bằng `INSERT ... ON
 * CONFLICT DO UPDATE` qua `$executeRaw` (Prisma không trả field Unsupported
 * `vector(384)` nên mọi thao tác embedding đều đi raw SQL).
 *
 * Chạy: bun run scripts/embed-places.ts
 */
import { createHash } from "node:crypto"
import { Prisma } from "../generated/prisma/client"
import { prisma } from "../src/lib/prisma"
import { embedPassages, vectorToLiteral } from "../src/lib/embeddings"

const MODEL_ID = "Xenova/multilingual-e5-small"
const DIM = 384
const BATCH_SIZE = 32

interface PlaceRow {
  id: string
  name: string
  category: string
  district: string | null
  tags: string[] | null
}

/** Passage text cho một venue — thay đổi cấu trúc này sẽ đổi content_hash toàn bộ. */
function passageText(place: PlaceRow): string {
  return [place.name, place.category, place.district ?? "", (place.tags ?? []).join(" ")]
    .filter((part) => part.length > 0)
    .join(" ")
}

async function main() {
  const places = await prisma.$queryRaw<PlaceRow[]>(Prisma.sql`
    SELECT p.id, p.name, p.category::text AS category, p.district,
           COALESCE(
             (SELECT ARRAY_AGG(t.name ORDER BY pt.position, t.name)
              FROM place_tags pt
              JOIN tags t ON t.id = pt.tag_id
              WHERE pt.place_id = p.id),
             ARRAY[]::text[]
           ) AS tags
    FROM places p
    WHERE p.published_at IS NOT NULL AND p.deleted_at IS NULL AND p.status <> 'closed'
  `)
  console.log(`Lấy ${places.length} venue published`)

  // Hash hiện có — skip venue chưa đổi nội dung.
  const rows = await prisma.$queryRaw<{ place_id: string; content_hash: string }[]>(
    Prisma.sql`SELECT place_id, content_hash FROM place_embeddings`,
  )
  const existing = new Map(rows.map((row) => [row.place_id, row.content_hash]))

  let encoded = 0
  let skipped = 0
  let failed = 0

  for (let i = 0; i < places.length; i += BATCH_SIZE) {
    const batch = places.slice(i, i + BATCH_SIZE)
    const texts = batch.map(passageText)
    const hashes = texts.map((text) => createHash("sha256").update(text).digest("hex"))

    // Tách venue cần encode (hash khác hoặc chưa có).
    const pending: { id: string; text: string; hash: string }[] = []
    batch.forEach((place, j) => {
      const text = texts[j]!
      const hash = hashes[j]!
      if (existing.get(place.id) !== hash) pending.push({ id: place.id, text, hash })
      else skipped++
    })

    if (pending.length === 0) continue
    const vecs = await embedPassages(pending.map((item) => item.text))

    for (let k = 0; k < pending.length; k++) {
      const vec = vecs[k]
      const item = pending[k]!
      if (!vec) {
        failed++
        console.warn(`[embed-places] encode lỗi: ${item.id}`)
        continue
      }
      await prisma.$executeRaw`
        INSERT INTO place_embeddings (place_id, model, dim, embedding, content_hash)
        VALUES (${item.id}, ${MODEL_ID}, ${DIM}, ${vectorToLiteral(vec)}::vector, ${item.hash})
        ON CONFLICT (place_id) DO UPDATE
        SET model = EXCLUDED.model, dim = EXCLUDED.dim,
            embedding = EXCLUDED.embedding, content_hash = EXCLUDED.content_hash,
            embedded_at = now()
      `
      encoded++
    }
    console.log(`  tiến độ: ${Math.min(i + BATCH_SIZE, places.length)}/${places.length}`)
  }

  console.log(`Xong: encode ${encoded}, skip ${skipped}, lỗi ${failed}`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
