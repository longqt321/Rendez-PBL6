# Migration Plan (Prompt 04)

Principles: additive Django migrations; never drop/reseed existing data; backup before each stage.

Sequence:
1. Backup DB and media.
2. Additive schema migrations (new tables/columns, backfill).
3. Data migration scripts idempotent, verified by row counts.
4. API changes additive (new endpoints, deprecate later).
5. Frontend route/component migration behind existing routes.
6. Verify with existing pytest suite and E2E.

Rollback: restore DB backup; migrations reversible where safe; document irreversible steps.

Media: local storage paths preserved.
