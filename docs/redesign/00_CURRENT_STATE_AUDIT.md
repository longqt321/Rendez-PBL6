# Current State Audit (Prompt 01)

## Repo state
- Branch main, HEAD e53319e.
- Pre-existing uncommitted changes present; preserved.
- No AI components found in current manifests.

## Stack (declared/locked)
- Backend: Python >=3.12,<3.13; Django 5.2.18; DRF 3.16.x; psycopg 3.2.x; Pillow 11.3.0; pytest 8.x; ruff 0.12.x.
- Frontend: Bun 1.3.14; React 19.2; React Router 7.9; TanStack Query 5.90; Vite 7.1; Tailwind 4.1; MapLibre GL 5; react-map-gl 8; TypeScript ~5.9; Vitest 3.2; Playwright 1.56.
- DB: PostgreSQL 17 (compose), SQLite db.sqlite3 present (local dev).
- Media: local filesystem static/media.

## Tests
- Backend: ~178 pytest tests across API, security, geocoding, map, interactions.
- Frontend: 9 Vitest files; 6 Playwright specs.
- E2E manager and safety guards present.

## Risks / unverified
- Actual installed npm/bun lock versions not fully audited here; latest stable comparison deferred.
- No internet research performed in this environment (offline constraint); latest stable versions unverified.
- SQLite vs Postgres parity for local dev.
- Existing modified files not scoped by this stage.

## Decision Pending
- None introduced.
