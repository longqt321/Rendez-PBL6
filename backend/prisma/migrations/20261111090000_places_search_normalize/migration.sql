-- Chuẩn hoá chuỗi tìm kiếm giống hệt `normalizeText()` của mock
-- (`frontend/src/mocks/text.ts`): bỏ dấu, lowercase, ký tự không phải chữ/số
-- thành khoảng trắng, gộp khoảng trắng, trim.
--
-- Vì sao cần: HAYSTACK đã bỏ dấu nhưng từ khoá người dùng thì chưa, nên
-- `?q=bánh xèo` không khớp trong khi mock thì khớp (bug thật, không phải khác
-- biệt chấp nhận được). Ngoài ra mock coi dấu câu là khoảng trắng
-- ("Đường 2/9" → "duong 2 9"), SQL cũ giữ nguyên "duong 2/9".
--
-- `regexp_replace` là IMMUTABLE nên dùng được trong biểu thức index; hàm bọc
-- giữ IMMUTABLE để index GIN bên dưới hợp lệ.
-- Lưu ý: tham chiếu hàm phải ghi rõ schema `public.` — Prisma chạy migration với
-- search_path rỗng nên tên không định danh sẽ không phân giải được (lỗi 42883).
CREATE OR REPLACE FUNCTION immutable_search_normalize(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT btrim(
    regexp_replace(
      regexp_replace(
        public.immutable_unaccent(lower($1)),
        '[^a-z0-9\s]',
        ' ',
        'g'
      ),
      '\s+',
      ' ',
      'g'
    )
  )
$$;

-- Index cũ dùng biểu thức khác (không chuẩn hoá dấu câu) nên phải dựng lại;
-- biểu thức mới phải trùng khít HAYSTACK trong backend/src/lib/places.ts.
DROP INDEX IF EXISTS places_search_trgm_idx;

CREATE INDEX places_search_trgm_idx ON places USING gin (
  (
    immutable_search_normalize(
      name || ' ' || address || ' ' || city || ' ' || coalesce(district, '') || ' ' ||
      immutable_array_to_string(tags, ' ')
    )
  ) gin_trgm_ops
);
