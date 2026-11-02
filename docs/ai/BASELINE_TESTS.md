# Baseline test record

**Status: NOT RUN in this execution environment.**

## Repository test gate

The project defines its aggregate quality gate in **scripts/check.sh**:

| Gate | Command / scope |
|---|---|
| Backend lint | ruff check backend |
| Backend format | ruff format --check backend |
| Migration drift | python backend/manage.py makemigrations --check --dry-run |
| Backend tests | pytest -c backend/pyproject.toml backend/tests backend/apps |
| Django system checks | python backend/manage.py check |
| Frontend lint | bun run --cwd frontend lint |
| Frontend format | bun run --cwd frontend format:check |
| Frontend tests | bun run --cwd frontend test |
| Frontend build | bun run --cwd frontend build |

Run the full gate with:

    bash scripts/check.sh all

## Existing records in the repository

The checked-in **docs/ui-implementation-status.md** reports 222 backend tests, 61 frontend tests, 9/9 aggregate checks and 8 Playwright specs passing. These are historical checked-in results, not results from this execution.

The root README reports 168 backend and 56 frontend tests. Older source-index documentation reports 178 backend and 56 frontend tests. These counts conflict; they must not be treated as a current verified baseline.

## Why this baseline is incomplete

- The execution container did not contain a checkout or Git working tree for this repository.
- git ls-remote against GitHub failed with DNS error: Temporary failure in name resolution.
- Repository files were inspected read-only through the connected GitHub interface, which cannot run project commands.
- No application code, dependency, migration, database record or existing user file was changed in this execution.

**Tests passed in this execution: NOT MEASURED.** This does not mean zero tests pass; it means none were run.

Restore a local checkout of **feat/ai-smart-search**, run the aggregate gate above, save the actual logs, and resolve all failures before changing application code.
