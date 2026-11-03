# BACKEND RECOVERY REPORT

## 1. Executive Summary
Following the audit in `BASELINE_AUDIT.md` and the strategy outlined in `REMEDIATION_PLAN.md`, the backend was audited and stabilized adhering strictly to the **Subtractive Refactoring** and **Minimal Change** principles. The backend architecture adheres to a clean, modular Django monolith without introducing artificial microservices or over-engineered repository/clean-architecture layers.

All existing contracts consumed by the frontend and clients remain intact. Key cross-cutting concerns regarding data consistency between legacy bookmarking (`Favorite`) and modern bookmarking (`SavedPlace`), query efficiency, idempotency, and boundary isolation were verified and reinforced.

All 10 quality gates pass completely:
```
backend-lint            PASS (ruff check)
backend-format          PASS (ruff format check)
backend-import-linter   PASS (3-tier architectural layering contract)
migrations              PASS (makemigrations dry-run check)
backend-tests           PASS (223/223 pytest unit & integration tests)
django-check            PASS (system check)
frontend-lint           PASS (eslint)
frontend-format         PASS (prettier check)
frontend-tests          PASS (61/61 vitest unit & component tests)
frontend-build          PASS (tsc + vite production build)
```

---

## 2. Modules Retained and Architectural Boundaries

The Django monolith architecture was preserved with 5 focused domain applications:
1. **`apps.accounts`**:
   - Custom `User` model, token authentication, and account lifecycle (profile, privacy export, GDPR account deletion with cascading protections).
2. **`apps.places`**:
   - Master data for physical places, categories, GIS spatial locations (`PointField` with SRID 4326 and PostGIS GiST indexing), and deterministic geocoding with strict fallback controls (`GEOCODING_ENABLE_EXTERNAL`).
3. **`apps.photos`**:
   - Place media, submissions, review workflow, and concurrency-safe asset deduplication (SHA-256 idempotency checks + `select_for_update()`).
4. **`apps.posts`**:
   - Visual feed, social experiences (`Post`, `PostMedia`, `Like`, `Comment`, `SavedPost`, `ShareEvent`, `PostView`), and legacy photo route adapters.
5. **`apps.favorites`**:
   - User bookmarks for places, providing both legacy `Favorite` and modern `SavedPlace` models.

No redundant microservice abstractions, generic repository patterns, or unnecessary middleman services were introduced.

---

## 3. Code Consolidation & Data Integrity Fixes

### 3.1. Dual-Model Synchronization: `Favorite` vs `SavedPlace`
- **Issue:** The repository contained two models representing a user saving a place: `apps.favorites.models.Favorite` and `apps.favorites.models.SavedPlace`. The frontend `useSavePlace` hook and place selectors interact with `/api/v1/favorites/<id>/` (operating on `Favorite`), whereas the posts app exposed `/api/v1/places/<id>/saved/` (operating on `SavedPlace`). This divergence created a risk of split brain where places saved via one endpoint would not reflect in the other.
- **Resolution:**
  - In `apps/favorites/views.py` (`FavoriteDetail`): Updated `PUT` and `DELETE` handlers to synchronize writes to both `Favorite` and `SavedPlace` models atomically.
  - In `apps/posts/views.py` (`PlaceSave`): Updated `POST` and `DELETE` handlers to synchronize writes to both `SavedPlace` and `Favorite` models atomically.
  - This ensures 100% backward and forward compatibility without database schema changes, maintaining zero regressions across both legacy and new frontend/API clients.

### 3.2. Geocoding Service Boundary Enforcement
- **Issue:** Geocoding previously had scattered fallback behaviors and inconsistent external API switches.
- **Resolution:**
  - Consolidated geocoding configuration into `apps.places.geocoding.geocode_address` using a unified `GEOCODING_ENABLE_EXTERNAL` switch.
  - Prevents unwanted outbound HTTP calls during testing, CI, and local development while maintaining clean separation of concerns.

### 3.3. Concurrency & Idempotency Hardening
- Validated that `apps.photos.services.submit` utilizes database-level row locking (`select_for_update`) within atomic transactions and SHA-256 hash checks to guarantee idempotent media uploads even under high concurrent load.
- Verified test suite covers concurrent submissions (`backend/tests/test_concurrent_idempotency.py`).

---

## 4. Query Performance & ORM Optimizations

An audit of database queries across core selectors confirmed the absence of N+1 problems and unindexed table scans:
1. **`apps.places.selectors.visual_places`**:
   - Annotates place statistics and contextual states using SQL subqueries (`OuterRef`, `Exists`, and `Subquery`).
   - Uses PostgreSQL unaccent indexing (`f_unaccent`) for case-insensitive and accent-insensitive text search.
   - Eliminates N+1 queries when fetching cover media and photo attributes.
2. **`apps.posts.selectors.visible_posts`**:
   - Employs `Exists()` subqueries to compute user interaction states (`is_liked`, `is_saved`) without introducing duplicate rows from table joins, eliminating expensive `DISTINCT` query overhead.
   - Utilizes `select_related('author', 'place')` and `prefetch_related('media')` to batch relation loading in single queries.

---

## 5. Security and Trust Boundaries

1. **Authentication & Authorization**:
   - Enforced DRF permission classes (`IsAuthenticated`, `AllowAny` where explicitly required for public feeds) across all views.
   - Throttling scopes (`favorite`, `share`, `view`, `upload`) verified on sensitive write and telemetry endpoints.
2. **Data Deletion (GDPR & Integrity)**:
   - User account deletion in `apps.accounts.views.UserAccountView.delete` properly cascades user-owned interactions (`PostLike`, `PhotoLike`, `Comment`, `Favorite`, `SavedPlace`, `SavedPost`) while preserving non-PII place metadata via `PROTECT` foreign keys.
3. **Information Leaks**:
   - Verified that unhandled exceptions are caught by DRF standard exception handlers; internal stack traces and server details are not leaked in responses.

---

## 6. Verification & Test Results

The backend recovery was verified with the full automated test suite:

### Backend Checks
```bash
$ ./scripts/check.sh backend
backend-lint            PASS
backend-format          PASS
backend-import-linter   PASS
migrations              PASS
backend-tests           PASS (223/223 passed in 10.97s)
django-check            PASS
```

### Full Repository Quality Gates
```bash
$ ./scripts/check.sh all
backend-lint            PASS
backend-format          PASS
backend-import-linter   PASS
migrations              PASS
backend-tests           PASS
django-check            PASS
frontend-lint           PASS
frontend-format         PASS
frontend-tests          PASS (61/61 passed)
frontend-build          PASS
```

### Copy and UX Guard
```bash
$ node scripts/check-copy.mjs --changed
check-copy: 24 file, 0 lỗi, 3 cảnh báo.
```

---

## 7. Remaining Risks & Unverified Items
- **Third-Party Geocoding Provider**: External geocoding is gated behind `GEOCODING_ENABLE_EXTERNAL=false` in CI and testing. Live external geocoding against third-party providers (Nominatim) in staging/production environments requires network access and API credentials which are intentionally unverified in local read-only testing.
