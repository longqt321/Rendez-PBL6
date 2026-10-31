# Remediation Backlog

## P1 (before final acceptance)
- AUD-001 MEDIUM — E2E failure visual.spec.ts:338 "Chưa có ảnh công khai". Investigate seed data / timing. Files: frontend/e2e/visual.spec.ts. Effort: 0.5h. Regression: re-run bun run e2e.
- AUD-002 MEDIUM — Frontend bundle chunk >500KB (main 530KB, maplibre 1MB). Consider manualChunks to split vendor. Files: frontend/vite.config.ts. Effort: 1h. Regression: bun run build size check.

## P2 (next improvement cycle)
- AUD-003 LOW — Frontend UI copy hardcodes "Đà Nẵng"/"cà phê" in several strings (shared.tsx:101,187,433; auth.tsx:300,328,480; discovery.tsx:144,277,283,309; map.tsx:136,163,246,412; App.tsx:127,129,193). Generalize copy or move to configurable constants. Effort: 2h.
- AUD-004 LOW — technical_metadata JSONField defined but never populated. Either populate during normalize_image or document as future. Files: backend/apps/photos/models.py:152. Effort: 1h.
- AUD-005 LOW — ShareButton not covered by automated test. Add unit/E2E test. Effort: 1h.

## P3 (future)
- AUD-006 INFORMATIONAL — No CSP header configured. Evaluate Content-Security-Policy for production. Effort: 2h.
- AUD-007 INFORMATIONAL — Geocoding city-center fallback hardcoded to Da Nang coordinates (geocoding.py:386-391). Make configurable per deployment. Effort: 1h.
- AUD-008 INFORMATIONAL — API latency not benchmarked. Add basic latency measurement tooling. Effort: 2h.
- AUD-009 INFORMATIONAL — Latest stable dependency versions not compared (no network). Run dependency audit when network available. Effort: 1h.
