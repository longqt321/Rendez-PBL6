# Domain & Architecture Assessment

Date: 2026-10-31. Basis: repo source + 00_CURRENT_STATE_AUDIT + prior docs.

## Domain model review
- Place (UUID PK, status draft/published/hidden, soft delete) — tổng quát, không coffee-only. OK.
- Category (flat slug) — đủ cho MVP; chưa có hierarchy (chưa cần).
- PlacePhoto ↔ PhotoAsset (1:1 PROTECT), PlacePhoto M2M VisualAttribute via PhotoAttribute (manual review). Phân biệt place-attribute vs photo-attribute rõ.
- PhotoSubmission (idempotency_key + payload_hash, transaction.atomic, lock user row). Robust.
- VenueProposal tồn tại nhưng auto-publication đã được test; Decision Pending vẫn chưa giải quyết chính thức.
- Creator không phải entity riêng — User reuse. OK (YAGNI).
- Archived Photo concept chưa implement (Decision Pending #3).

## Architecture review
- Modular monolith: phù hợp MVP. Không cần microservices.
- API: DRF + drf-spectacular, OpenAPI generated types. Đồng bộ frontend/backend.
- Frontend: React 19, react-router 7, TanStack Query 5, lazy map. State phân tách tốt.
- Media: local filesystem, Django FileResponse với auth/ownership. OK cho MVP; không scale production (P3).
- GIS: MapLibre + Esri raster + local GeoJSON. Không PostGIS (bbox filtering đủ).

## Database assessment
- PostgreSQL 17 + unaccent/pg_trgm/btree_gist. GistIndex coords, trigram index search text. Strong.
- Constraints: Place coords valid, publication invariants, PhotoAttribute unique, Favorite unique, ContentReport one-target. Good.
- Migrations: additive, reversible mostly (extension creation not fully reversible but acceptable).
- SQLite fallback cho dev: search path khác (Python in-memory normalization) — parity risk, đã test accent-insensitive trên cả hai.

## API assessment
- 25+ endpoints, permission IsAuthenticated default, CSRF enforced. Throttling scoped.
- Exception handler chuẩn hóa response (code, message, fields, request_id). Good.
- N+1 guarded by test_feed_query_count_does_not_grow_per_photo.

## GIS & media
- MapLibre BSD-3, OSM ODbL attribution required (hiện dùng Esri tiles — attribution present).
- Media fallback paths có thể expose file sai nếu storage mismatch (low risk, local only).

## Target architecture recommendations
**Giữ nguyên** modular monolith. Không thêm abstraction. Khi scale: tách media storage (S3-compatible self-hosted MinIO) và tile server (Martin + PMTiles) — research đã confirm stack MapLibre+OSM+Martin free/self-hosted.
