# Repository context

**Inspection date:** 2026-11-03  
**Repository:** longqt321/Rendez-PBL6  
**Base:** main at e87b04faa0d85842c124cddafd86a0af3961f83c  
**Working branch:** feat/ai-smart-search

## Execution environment

The repository was not mounted in the execution container. It had no project checkout or Git working tree, and external DNS resolution failed. Repository files were inspected read-only through the connected GitHub interface. Source facts below are based on checked-in files; live database state and tests were not independently inspected.

## Stack and entry points

- Backend: Django 5.2, Django REST Framework, Python requirement >=3.12,<3.13 in backend/pyproject.toml.
- Frontend: React 19, TypeScript, Vite and Bun 1.3.14 in frontend/package.json.
- Database: PostgreSQL 17 in compose.yaml; local port 55432. Django settings provide a SQLite fallback when psycopg is unavailable.
- Local setup and aggregate test gate: scripts/setup-local.sh and scripts/check.sh.
- Backend API routes: backend/config/urls.py.
- Frontend search screen: frontend/src/features/search/SearchPage.tsx.

## Existing Place and Category schema

backend/apps/places/models.py defines:

- Category: slug, display name, active flag and sort order.
- Place: UUID primary key; name, slug, description, address, source URL, verification timestamp, category, publication/deletion state and audit timestamps.
- Coordinates are separate DecimalField columns latitude and longitude (six decimal places, nullable), not a PostGIS geometry.
- Opening hours currently use opening_hours_text, opening_hours_source, opening_hours_verified_at and JSON opening_hours_specification. No canonical 0–10079 minute-of-week representation was found in the inspected model.
- A GiST index exists on the scalar coordinate columns; the map endpoint uses bounding-box filtering.

## Existing photo and visual-attribute schema

backend/apps/photos/models.py defines:

- VisualAttribute: code, Vietnamese display name, description, active flag and searchability.
- PhotoAsset: original/derivative file paths, SHA-256, size, dimensions, sort order and technical metadata.
- PlacePhoto: place/asset relation, publication state, cover flag, caption, alt text and publication/withdrawal timestamps.
- PhotoAttribute: reviewed relation between a photo and a visual attribute, including source, reviewer and review timestamp.

The inspected models do not provide external-photo license, author, original URL or attribution fields. The proposed source image manifest must remain separate until an additive migration and import path are designed and tested.

## Existing taxonomies

The committed data/danang.json seed uses six categories: study, night, vintage, garden, checkin and classic. These describe use/vibe, not mutually exclusive business types.

The seed import command defines visual-attribute codes plants, study, architecture, interior, night, food and wood. These existing manual attributes must not be silently re-labelled as the proposed CLIP/agent review labels.

## Current API and search

Existing routes in backend/config/urls.py include:

- GET /api/v1/places/ with q, category, attributes, sort and pagination.
- GET /api/v1/places/map/ with validated bbox and optional filters.
- GET /api/v1/places/geocode/.

There is no inspected implementation of the requested GET /api/v1/places/search/ endpoint.

backend/apps/places/selectors.py folds Vietnamese accents and performs deterministic text matching. It is not a learned ranker. The frontend has a separate /search route.

The DRF default permission is IsAuthenticated. A new search endpoint should preserve visibility and permission behavior unless changed through a deliberate, tested decision.

## PostgreSQL capabilities

The checked-in migration backend/apps/places/migrations/0006_enable_postgresql_extensions_and_gist.py defines/uses unaccent, pg_trgm and btree_gist for text and scalar-coordinate indexes. Existing assessment documents describe a trigram GIN search index. PostGIS is deferred in more recent architecture decisions, and django.contrib.gis is not present in the inspected INSTALLED_APPS list.

A live database extension check was not possible. Migration definitions do not prove the state of a running database.

## Existing seed data

data/README.md describes data/danang.json as 12 seed POIs and data/photos as 36 generated placeholder illustrations, not field photographs. Some checked-in audit documents refer to 14 places and 39 photos in a development database. That database was not available, and those runtime totals cannot be reconciled here. The 12/36 figures describe the committed seed and its placeholder assets only.

## Test commands

    bash scripts/check.sh all

Backend pytest configuration is in backend/pyproject.toml. Frontend test commands are in frontend/package.json. See BASELINE_TESTS.md for historical count conflicts and the fact that the gate was not run in this environment.
