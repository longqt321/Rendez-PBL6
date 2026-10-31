# Technology & Engineering Assessment

Date: 2026-10-31. Basis: manifests, lockfiles, runtime checks.

## Current stack (verified)
Frontend: Bun 1.3.14, React 19.2, react-router 7.9, TanStack Query 5.90, Vite 7.1, Tailwind 4.1, MapLibre 5, react-map-gl 8, TS ~5.9, Vitest 3.2, Playwright 1.56.
Backend: Python 3.12, Django 5.2.18, DRF 3.16, drf-spectacular 0.28, psycopg 3.2, Pillow 11.3, gunicorn 23, pytest 8.4, ruff 0.12.
DB: PostgreSQL 17 (Docker), extensions unaccent/pg_trgm/btree_gist.

## Latest technology status
Không có mạng trong một số phiên; research qua search tool xác nhận stack hiện đại. Không đề xuất nâng cấp hàng loạt — không có lý do bảo mật/compat bắt buộc.

## Library research
| Current implementation | Existing alternative | Trade-offs | Recommendation |
|---|---|---|---|
| Custom masonry ResizeObserver | CSS `masonry` (chưa standard) | Browser support chưa đủ | Giữ custom |
| Custom account menu | Radix DropdownMenu | Thêm dep cho 1 component | Giữ custom (YAGNI) |
| Django FileResponse media | django-storages + S3/MinIO | Cần infra mới | P3 khi scale |
| Esri raster tiles | Self-host vector tiles (Martin + PMTiles + OSM) | Cần infra mới, free | P3 |

## Dependency assessment
Không có dependency thừa. Không có AI deps. Không có security advisory blocking nào được xác nhận.

## Code quality
- Backend: ruff clean (trừ 1 file untracked pre-existing). Format pass.
- Frontend: eslint + prettier pass. Typecheck pass.
- Không có dead code lớn. `technical_metadata` field chưa dùng (LOW).

## Testing quality
- Backend: 182 pass / 1 fail (env-related, psycopg mock issue). Coverage rộng: auth, upload, geocoding, map, interactions, performance.
- Frontend: 56 pass. Playwright: 22/23 (1 fail cần investigate).
- CI: scripts/check.sh tồn tại; chưa có GitHub Actions workflow — NOT VERIFIED.

## Performance
- Bundle: main 530KB, maplibre 1MB. MEDIUM — cần manualChunks.
- Backend: query count test có. Chưa đo latency thực tế.

## Security
- Session auth + CSRF + HTTPOnly + Secure khi HTTPS. Throttling scoped. Media ownership check. IDOR guarded.
- Không có CSP header (INFORMATIONAL). Không rate limit trên GET read endpoints (acceptable).

## Operations
- Backup/restore scripts + test. E2E manager có safety guards. Local dev UX tốt (make setup/start).
- Chưa có error monitoring (Sentry-like) — INFORMATIONAL.

## Ponytail/YAGNI recommendations
- Không thêm dependency mới. Không refactor cho đẹp. Giữ custom masonry và account menu. Chỉ tách bundle chunks (P1).
