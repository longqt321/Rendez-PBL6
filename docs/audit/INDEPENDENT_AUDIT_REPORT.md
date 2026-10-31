# Independent Audit Report — Rendez Redesign

Audit date: 2026-10-31. HEAD: 2e9e40d. Branch: main. Working tree has pre-existing user modifications (preserved, not touched).

## 1. Executive Summary
Rendez is a functional visual-first place discovery app. Backend (Django 5.2 modular monolith) and frontend (React 19 + Vite) are implemented and largely consistent. The 10 "redesign" prompts were executed as documentation-only passes because the implementation already existed; each added a commit noting "no code changes required". Test baseline: backend 182 pass / 1 fail (env-related), frontend 56 pass, Playwright 22 pass / 1 fail, typecheck + lint + build pass. Verdict: PASS WITH CONDITIONS (see §18).

## 2. Audit Scope
Repository /home/longtran/Projects/rendez-web. All code, docs, migrations, tests. No network for latest-version research; versions compared against locally locked manifests only.

## 3. Methodology
Independent verification: read source, run existing tests, run ruff/eslint/tsc/build, run Playwright E2E, inspect DB schema/indexes/extensions, curl runtime endpoints. No code modified.

## 4. Repository Baseline
- HEAD 2e9e40d; baseline pre-redesign e53319e.
- Redesign commits afb7161..2e9e40d (10 commits, docs only, 258 insertions).
- Pre-existing uncommitted changes preserved (not staged).

## 5. Product Compliance
- No AI/ML dependencies found in pyproject or package.json. Search uses PostgreSQL unaccent + pg_trgm + ILIKE + Python normalization. PASS for AI restriction.
- Place/Category generalized: 6 categories (cafe, market, riverside, beach, culture, nature); 14 places, 39 photos in dev DB. No coffee-only logic in models; frontend UI copy still references "Đà Nẵng" and "cà phê" in several strings (cosmetic, not blocking).
- Place vs Photo separated: PlacePhoto 1:1 PhotoAsset, M2M VisualAttribute via PhotoAttribute. PASS.

## 6. Architecture Assessment
Modular monolith with apps places/photos/accounts/favorites. DRF + drf-spectacular. Frontend routes lazy-load map. No dependency cycles observed. Modular boundaries acceptable. Migration strategy additive; no destructive migrations.

## 7. Backend Assessment
- Models: strong constraints (CheckConstraint, UniqueConstraint, FK PROTECT/CASCADE appropriate).
- Image pipeline (images.py): magic-byte validation, Pillow decode, EXIF transpose (strips metadata), dimension/size limits, decompression bomb protection. PASS.
- Services: transaction.atomic, select_for_update, idempotency keys. Good.
- Geocoding: external providers with timeouts, local fallback, city-center fallback (hardcoded Da Nang). Acceptable for current data scope.
- One concern: `technical_metadata` JSONField defined but never populated (INFORMATIONAL).

## 8. Frontend Assessment
- React 19, react-router 7, TanStack Query 5, Tailwind 4. Typecheck pass. 56 unit tests pass.
- Masonry uses ResizeObserver with read/write phases. Good.
- Accessibility: skip link, ARIA labels, focus management in account menu. Good.
- Bundle: main chunk 530KB, maplibre 1MB. Code-splitting warning (chunk >500KB) — MEDIUM perf concern.

## 9. Database Assessment
- PostgreSQL 17 + extensions unaccent, pg_trgm, btree_gist. GistIndex on coords. Trigram index on search text. PASS.
- Migrations: 7 places + 9 photos, makemigrations --check clean. One failing test (test_database_config_explicit_postgres_failure) due to psycopg already imported in process — test-env issue, not product.

## 10. UI/UX Assessment
Playwright E2E: 22/23 pass. One failure (visual.spec.ts:338) expects "Chưa có ảnh công khai" heading; likely timing/seed-data. Not verified as product bug vs test issue. Screenshots captured in test-results/.

## 11. Search & GIS Assessment
- Deterministic: PostgreSQL f_unaccent + pg_trgm (extension present) + ILIKE word matching; SQLite fallback in-memory normalization. Accent-insensitive tested.
- Map: MapLibre GL, Esri raster tiles (external, attribution present), local GeoJSON. maxBounds locks to Da Nang region. BBox validation. PASS.
- GIS external dependency: Esri tiles require network; no offline tile fallback (acceptable, documented partial).

## 12. Security Assessment
- Auth: session + CSRF, HTTPOnly cookies, Secure when HTTPS. Throttling scoped. Admin permission checks.
- Media: private originals require auth + ownership/staff; public media via get_object_or_404(public_photos()). X-Content-Type-Options nosniff. ETag caching.
- IDOR: favorites filtered by user; comments owner check; owner_edit_photo filters by submitted_by. Good.
- No rate limiting on some read endpoints (acceptable).
- Security headers: X-Frame-Options DENY, nosniff. No CSP observed (INFORMATIONAL).

## 13. Performance Assessment
- Feed uses select_related/prefetch_related; query count test exists. N+1 guarded by tests.
- Frontend bundle chunk size warning (MEDIUM).
- No measured API latency numbers (NOT VERIFIED).

## 14. Test Quality Assessment
- Backend: 182 pass / 1 fail (env). Frontend: 56 pass. Playwright: 22/23.
- Tests cover auth, authorization, upload safety, geocoding, map, interactions, performance. Good coverage of boundaries.
- One E2E failure needs investigation.

## 15. Technology Review
Versions match manifests; no upgrades performed. No AI deps. All declared deps present in lockfile. No unnecessary abstractions found.

## 16. Confirmed Findings
See REMEDIATION_BACKLOG.md for IDs. Summary: 0 Critical, 0 High, 2 Medium (bundle size; E2E empty-gallery assertion), 3 Low, 4 Informational.

## 17. Unverified Hypotheses
- API latency not measured.
- Latest stable versions not compared (no network).
- Production deployment not verified.
- E2E failure root cause not yet determined.

## 18. Final Verdict
Product & Engineering: PASS WITH CONDITIONS. Deployment: Local Development Ready / Academic Demo Ready. Not Staging/Production Ready (no prod env verified).

## 19. Audit Deliverables
docs/audit/INDEPENDENT_AUDIT_REPORT.md, REQUIREMENT_TRACEABILITY.md, REMEDIATION_BACKLOG.md, RESEARCH_REFERENCES.md.
