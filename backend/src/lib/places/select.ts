import { Prisma } from "../../../generated/prisma/client"
import { db, sql } from "../kysely"

/**
 * Type-safe Kysely query builder đọc đầy đủ `PlaceRow` từ `places` kèm tags,
 * thống kê review và ảnh đại diện (kiểm tra tên bảng/cột tại thời điểm biên dịch).
 */
export function selectPlacesQuery() {
  return db
    .selectFrom("places as p")
    .leftJoinLateral(
      (eb) =>
        eb
          .selectFrom("place_tags as pt")
          .innerJoin("tags as t", "t.id", "pt.tag_id")
          .whereRef("pt.place_id", "=", "p.id")
          .select([sql<string[]>`ARRAY_AGG(t.name ORDER BY pt.position, t.name)`.as("tags")])
          .as("tg"),
      (join) => join.onTrue(),
    )
    .leftJoinLateral(
      (eb) =>
        eb
          .selectFrom("reviews as rv")
          .whereRef("rv.place_id", "=", "p.id")
          .where("rv.deleted_at", "is", null)
          .select([
            sql<number>`COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE rv.tier IN ('good', 'must_try')) / NULLIF(COUNT(*), 0))::int, 0)`.as(
              "positive_ratio",
            ),
            sql<number>`COUNT(*) FILTER (WHERE rv.tier = 'must_try')::int`.as("must_try_count"),
            sql<number>`COUNT(*)::int`.as("review_count"),
          ])
          .as("r"),
      (join) => join.onTrue(),
    )
    .leftJoinLateral(
      (eb) =>
        eb
          .selectFrom("place_images as pi")
          .whereRef("pi.place_id", "=", "p.id")
          .orderBy("pi.position", "asc")
          .limit(1)
          .select(["pi.url as image_url", "pi.height as image_height"])
          .as("img"),
      (join) => join.onTrue(),
    )
    .select([
      "p.id",
      "p.name",
      "p.address",
      "p.city",
      "p.district",
      sql<string>`p.category::text`.as("category"),
      sql<string[]>`COALESCE(tg.tags, ARRAY[]::text[])`.as("tags"),
      "p.price_level",
      "p.lat",
      "p.lng",
      sql<string>`p.status::text`.as("status"),
      "p.description",
      "p.opening_hours",
      "p.phone",
      "p.created_at",
      "p.published_at",
      sql<number>`COALESCE(r.positive_ratio, 0)::int`.as("positive_ratio"),
      sql<number>`COALESCE(r.must_try_count, 0)::int`.as("must_try_count"),
      sql<number>`COALESCE(r.review_count, 0)::int`.as("review_count"),
      "img.image_url",
      "img.image_height",
    ])
}

export function selectPlaces(extra: Prisma.Sql = Prisma.empty): Prisma.Sql {
  return Prisma.sql`
  SELECT p.id, p.name, p.address, p.city, p.district, p.category::text AS category,
         COALESCE(tg.tags, ARRAY[]::text[]) AS tags,
         p.price_level, p.lat, p.lng, p.status::text AS status, p.description, p.opening_hours, p.phone, p.created_at, p.published_at,
         COALESCE(r.positive_ratio, 0)::int AS positive_ratio,
         COALESCE(r.must_try_count, 0)::int AS must_try_count,
         COALESCE(r.review_count, 0)::int AS review_count,
         img.url AS image_url, img.height AS image_height${extra}
  FROM places p
  LEFT JOIN LATERAL (
    SELECT ARRAY_AGG(t.name ORDER BY pt.position, t.name) AS tags
    FROM place_tags pt
    JOIN tags t ON t.id = pt.tag_id
    WHERE pt.place_id = p.id
  ) tg ON true
  LEFT JOIN LATERAL (
    SELECT
      COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE rv.tier IN ('good', 'must_try')) / NULLIF(COUNT(*), 0))::int, 0) AS positive_ratio,
      COUNT(*) FILTER (WHERE rv.tier = 'must_try')::int AS must_try_count,
      COUNT(*) AS review_count
    FROM reviews rv
    WHERE rv.place_id = p.id AND rv.deleted_at IS NULL
  ) r ON true
  LEFT JOIN LATERAL (
    SELECT pi.url, pi.height
    FROM place_images pi
    WHERE pi.place_id = p.id
    ORDER BY pi.position
    LIMIT 1
  ) img ON true
`
}
