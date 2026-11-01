# Remediation Backlog

## P1 (before final acceptance)
- AUD-001 MEDIUM — ~~E2E failure visual.spec.ts:338 "Chưa có ảnh công khai"~~ **RESOLVED**. Root causes: (1) `e2e_manager.py setup` cleaned the media root while keeping the DB, leaving stale photo rows pointing at deleted derivative files; media clean moved into `reset` only. (2) `seed_test_accounts()` submitted its photo to `Place.objects.first()`, polluting the "no photos" demo fixture (`...0004`); pinned to demo place `...0001`. Verified: `bunx playwright test e2e/visual.spec.ts` → 7/7 passed.
- AUD-002 MEDIUM — ~~Frontend bundle chunk >500KB (main 530KB, maplibre 1MB)~~ **RESOLVED**. `manualChunks` vendor split (react, react-dom, react-router, @tanstack/react-query) added to `vite.config.ts`; entry chunk 542KB → 454KB raw (141KB gzip). Residual: lazy `maplibre` chunk (~1MB raw / 287KB gzip) still exceeds the default warning threshold by design — it is loaded only when the map page opens; documented in `docs/project/FRONTEND.md`.

## P2 (next improvement cycle)
- AUD-003 LOW — Frontend UI copy hardcodes "Đà Nẵng"/"cà phê" in several strings (shared.tsx:101,187,433; auth.tsx:300,328,480; discovery.tsx:144,277,283,309; map.tsx:136,163,246,412; App.tsx:127,129,193). Generalize copy or move to configurable constants. Effort: 2h.
- AUD-004 LOW — technical_metadata JSONField defined but never populated. Either populate during normalize_image or document as future. Files: backend/apps/photos/models.py:152. Effort: 1h.
- AUD-005 LOW — ShareButton not covered by automated test. Add unit/E2E test. Effort: 1h.

## P3 (future)
- AUD-006 INFORMATIONAL — No CSP header configured. Evaluate Content-Security-Policy for production. Effort: 2h.
- AUD-007 INFORMATIONAL — Geocoding city-center fallback hardcoded to Da Nang coordinates (geocoding.py:386-391). Make configurable per deployment. Effort: 1h.
- AUD-008 INFORMATIONAL — API latency not benchmarked. Add basic latency measurement tooling. Effort: 2h.
- AUD-009 INFORMATIONAL — Latest stable dependency versions not compared (no network). Run dependency audit when network available. Effort: 1h.
