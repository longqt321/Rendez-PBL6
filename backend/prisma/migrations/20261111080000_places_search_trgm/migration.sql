-- Chỉ mục tìm kiếm không dấu (T2.5 / Phần E: "tránh %...% không index — dùng pg_trgm GIN").
--
-- `unaccent()` của Postgres là STABLE (phụ thuộc dictionary), không dùng được
-- trong biểu thức index. Bọc lại bằng hàm IMMUTABLE đúng như tài liệu Postgres
-- khuyến nghị; truy vấn phải dùng CHÍNH hàm này thì planner mới khớp index.
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$ SELECT public.unaccent('public.unaccent', $1) $$;

-- `array_to_string` cũng là STABLE — bọc tương tự để dùng được trong index.
CREATE OR REPLACE FUNCTION immutable_array_to_string(text[], text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$ SELECT array_to_string($1, $2) $$;

-- Biểu thức phải trùng khít HAYSTACK trong backend/src/lib/places.ts.
-- Dùng `||` thay `concat_ws`: `concat_ws` là STABLE nên không dùng được trong
-- biểu thức index (đã thử và Postgres báo 42P17). name/address/city NOT NULL,
-- district coalesce, tags NOT NULL nên `||` không sinh NULL.
CREATE INDEX places_search_trgm_idx ON places USING gin (
  (
    immutable_unaccent(
      lower(
        name || ' ' || address || ' ' || city || ' ' || coalesce(district, '') || ' ' ||
        immutable_array_to_string(tags, ' ')
      )
    )
  ) gin_trgm_ops
);
