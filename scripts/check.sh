#!/usr/bin/env bash
set -uo pipefail
source "$(dirname "$0")/env.sh"
export TMPDIR="$RENDEZ_ROOT/.local/tmp"
mkdir -p "$TMPDIR" .local/logs
RENDEZ_FAILURE=0
run_check() {
  local label="$1"
  shift
  printf '%-24s' "$label"
  if "$@" > ".local/logs/check-$label.log" 2>&1; then printf 'PASS\n'; else
    printf 'FAIL\n'
    tail -n 22 ".local/logs/check-$label.log"
    RENDEZ_FAILURE=1
  fi
}
case "${1:-all}" in backend|all)
  run_check backend-lint backend/.venv/bin/python -m ruff check backend
  run_check backend-format backend/.venv/bin/python -m ruff format --check backend
  run_check migrations backend/.venv/bin/python backend/manage.py makemigrations --check --dry-run
  run_check backend-tests env DJANGO_DEBUG=1 backend/.venv/bin/python -m pytest -c backend/pyproject.toml backend/tests backend/apps --basetemp "$TMPDIR/pytest" -q
  run_check django-check backend/.venv/bin/python backend/manage.py check
esac
case "${1:-all}" in frontend|all)
  run_check frontend-lint bun run --cwd frontend lint
  run_check frontend-format bun run --cwd frontend format:check
  run_check frontend-tests bun run --cwd frontend test
  run_check frontend-build bun run --cwd frontend build
esac
exit "$RENDEZ_FAILURE"
