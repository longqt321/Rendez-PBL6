import { Prisma } from "../../../generated/prisma/client"
import { prisma } from "../prisma"
import { selectPlaces } from "./select"
import { toPlaceDto, type PlaceDto, type PlaceRow } from "./types"
import type { Cursor } from "../cursor"

export async function findPublicPlace(id: string): Promise<PlaceDto | null> {
  const rows = await prisma.$queryRaw<PlaceRow[]>(Prisma.sql`
    ${selectPlaces()}
    WHERE p.id = ${id} AND p.published_at IS NOT NULL AND p.deleted_at IS NULL
    LIMIT 1
  `)
  const row = rows[0]
  return row ? toPlaceDto(row) : null
}

export async function findPublicPlaceWithVersion(
  id: string,
): Promise<{ place: PlaceDto; updatedAt: Date } | null> {
  const rows = await prisma.$queryRaw<Array<PlaceRow & { updated_at: Date }>>(Prisma.sql`
    ${selectPlaces(Prisma.sql`, p.updated_at`)}
    WHERE p.id = ${id} AND p.published_at IS NOT NULL AND p.deleted_at IS NULL
    LIMIT 1
  `)
  const row = rows[0]
  return row ? { place: toPlaceDto(row), updatedAt: row.updated_at } : null
}

export async function listSavedPlaces(
  userId: string,
  cursor: Cursor | null,
  pageSize: number,
): Promise<{ items: PlaceDto[]; next: Cursor | null }> {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`p.published_at IS NOT NULL`,
    Prisma.sql`p.status <> 'closed'`,
    Prisma.sql`p.deleted_at IS NULL`,
    Prisma.sql`EXISTS (
      SELECT 1 FROM collection_places cp
      JOIN collections col ON col.id = cp.collection_id
      WHERE cp.place_id = p.id AND col.owner_id = ${userId}::uuid AND col.deleted_at IS NULL
    )`,
  ]
  if (cursor) {
    conditions.push(
      Prisma.sql`(p.created_at, p.id) < (${cursor.createdAt}::timestamptz, ${cursor.id})`,
    )
  }

  const rows = await prisma.$queryRaw<PlaceRow[]>(Prisma.sql`
    ${selectPlaces()}
    WHERE ${Prisma.join(conditions, " AND ")}
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT ${pageSize + 1}
  `)

  const page = rows.slice(0, pageSize)
  const last = page.at(-1)
  const next = rows.length > pageSize && last ? { createdAt: last.created_at, id: last.id } : null

  return { items: page.map(toPlaceDto), next }
}
