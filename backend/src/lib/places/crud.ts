import { db, sql } from "../kysely"
import { selectPlacesQuery } from "./select"
import { toPlaceDto, type PlaceDto, type PlaceRow } from "./types"
import type { Cursor } from "../cursor"

export async function findPublicPlace(id: string): Promise<PlaceDto | null> {
  const [rows, tierRows, dishRows] = await Promise.all([
    selectPlacesQuery()
      .where("p.id", "=", id)
      .where("p.published_at", "is not", null)
      .where("p.deleted_at", "is", null)
      .limit(1)
      .execute(),
    db
      .selectFrom("reviews")
      .where("place_id", "=", id)
      .where("deleted_at", "is", null)
      .select([
        sql<number>`COUNT(*) FILTER (WHERE tier = 'must_try')::int`.as("must_try_count"),
        sql<number>`COUNT(*) FILTER (WHERE tier = 'good')::int`.as("good_count"),
        sql<number>`COUNT(*) FILTER (WHERE tier = 'ok')::int`.as("ok_count"),
        sql<number>`COUNT(*)::int`.as("total_reviews"),
      ])
      .execute(),
    sql<{ dish_name: string; count: number }>`
      SELECT TRIM(dish) AS dish_name, COUNT(*)::int AS count
      FROM reviews r, LATERAL unnest(r.recommended_dishes) AS dish
      WHERE r.place_id = ${id} AND r.deleted_at IS NULL AND TRIM(dish) <> ''
      GROUP BY LOWER(TRIM(dish)), TRIM(dish)
      ORDER BY count DESC, dish_name ASC
      LIMIT 5
    `
      .execute(db)
      .then((res) => res.rows),
  ])
  const row = rows[0] as PlaceRow | undefined
  if (!row) return null
  const t = tierRows[0] ?? { must_try_count: 0, good_count: 0, ok_count: 0, total_reviews: 0 }
  const positiveRatio =
    t.total_reviews > 0
      ? Math.round((100 * (t.must_try_count + t.good_count)) / t.total_reviews)
      : 0
  return {
    ...toPlaceDto(row),
    tierSummary: {
      mustTryCount: t.must_try_count,
      goodCount: t.good_count,
      okCount: t.ok_count,
      totalReviews: t.total_reviews,
      positiveRatio,
    },
    topRecommendedDishes: dishRows.map((d) => ({ dishName: d.dish_name, count: d.count })),
  }
}

export async function findPublicPlaceWithVersion(
  id: string,
): Promise<{ place: PlaceDto; updatedAt: Date } | null> {
  const rows = await selectPlacesQuery()
    .select("p.updated_at")
    .where("p.id", "=", id)
    .where("p.published_at", "is not", null)
    .where("p.deleted_at", "is", null)
    .limit(1)
    .execute()
  const row = rows[0] as (PlaceRow & { updated_at: Date }) | undefined
  return row ? { place: toPlaceDto(row), updatedAt: row.updated_at } : null
}

export async function listSavedPlaces(
  userId: string,
  cursor: Cursor | null,
  pageSize: number,
): Promise<{ items: PlaceDto[]; next: Cursor | null }> {
  let query = selectPlacesQuery()
    .where("p.published_at", "is not", null)
    .where("p.status", "!=", "closed")
    .where("p.deleted_at", "is", null)
    .where((eb) =>
      eb.exists(
        eb
          .selectFrom("collection_places as cp")
          .innerJoin("collections as col", "col.id", "cp.collection_id")
          .whereRef("cp.place_id", "=", "p.id")
          .where("col.owner_id", "=", userId)
          .where("col.deleted_at", "is", null)
          .select(sql.lit(1).as("one")),
      ),
    )

  if (cursor) {
    query = query.where(
      sql<boolean>`(p.created_at, p.id) < (${cursor.createdAt}::timestamptz, ${cursor.id})`,
    )
  }

  const rows = (await query
    .orderBy("p.created_at", "desc")
    .orderBy("p.id", "desc")
    .limit(pageSize + 1)
    .execute()) as PlaceRow[]

  const page = rows.slice(0, pageSize)
  const last = page.at(-1)
  const next = rows.length > pageSize && last ? { createdAt: last.created_at, id: last.id } : null

  return { items: page.map(toPlaceDto), next }
}
