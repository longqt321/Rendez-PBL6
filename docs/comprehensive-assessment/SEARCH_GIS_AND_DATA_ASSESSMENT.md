# Search, GIS & Data Assessment

Date: 2026-10-31. Basis: repo source + PostgreSQL research + MapLibre research.

## Search architecture
- PostgreSQL: `f_unaccent` (immutable wrapper) + `pg_trgm` GIN index trên `name || address || description`. SQLite fallback: Python normalization in-memory.
- Category filter: slug validation với cache 300s.
- Attribute filter: AND semantics qua `matching_photos`.
- Sort: recent / name. Pagination 20/page (max 50).
- Accent-insensitive verified by test `test_place_search_vietnamese_accent_insensitive`.

## Deterministic algorithms
- Tokenize query → normalize → ILIKE per word (Postgres via `.extra(where=...)`).
- Research finding: PostgreSQL FTS + trgm + unaccent là chuẩn cho Vietnamese; Rendez đang dùng trgm+unaccent (không FTS). Đủ cho MVP (names/addresses short text). FTS chỉ cần nếu có long descriptions.

## Search evaluation
- Benchmark dataset: chưa có query set ground-truth. Test duy nhất: 1 place + 2 queries. **NOT VERIFIED** — cần bộ query đánh giá nếu muốn claim chất lượng.

## GIS stack
- MapLibre GL JS 5 (BSD-3), Esri raster tiles (attribution present), local GeoJSON region.
- BBox validation, max span 2°, max 200 results.
- Coordinate ordering verified (lng,lat cho MapLibre, lat/lon cho DB).
- GPS fallback: onOutOfMaxBounds báo "ngoài phạm vi bản đồ Đà Nẵng".

## Data quality
- 14 places, 39 photos, 6 categories. `is_demo` flag filtering trong production. `technical_metadata` chưa populate.
- Geocoding: Nominatim → Photon → Esri → local GeoJSON → city center fallback. Timeout 3s/provider.

## Geographical extensibility
- Backend generic (không hardcode city). Frontend copy hardcode Đà Nẵng (P2). Map maxBounds locks Đà Nẵng (cần parameterize khi mở rộng).
- Category generic.

## Recommendation systems
- Similar places: attribute overlap + same category. Deterministic, explainable. OK cho MVP.

## Future AI data readiness
- Domain model có PhotoAttribute (manual) làm ground truth cho VLM attribute extraction sau này.
- PhotoAsset lưu sha256, dimensions — hỗ trợ dedup/embedding sau này.
- **Không thêm schema AI** hiện tại — đúng ràng buộc.
- Khi tích hợp AI tương lai: async ingestion queue, VLM JSON-mode metadata extraction, hybrid dense+sparse search (research finding: VLM + BM25 + vector). Cần GPU cost planning.
