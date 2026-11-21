import { Prisma } from "../../../generated/prisma/client"

export function selectPlaces(extra: Prisma.Sql = Prisma.empty): Prisma.Sql {
  return Prisma.sql`
  SELECT p.id, p.name, p.address, p.city, p.district, p.category::text AS category,
         COALESCE(tg.tags, ARRAY[]::text[]) AS tags,
         p.price_level, p.lat, p.lng, p.status::text AS status, p.description, p.opening_hours, p.created_at, p.published_at,
         COALESCE(r.rating, 0)::float8 AS rating,
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
    SELECT ROUND(AVG(rv.rating)::numeric, 1) AS rating, COUNT(*) AS review_count
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
