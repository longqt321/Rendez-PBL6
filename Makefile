.PHONY: setup backend frontend check schema e2e
setup:
	docker compose up -d --wait db
	uv sync --project backend --frozen
	bun install --cwd frontend --frozen-lockfile
	uv run --env-file .env --project backend python backend/manage.py migrate
	uv run --env-file .env --project backend python backend/manage.py seed_visual_demo
backend:
	uv run --env-file .env --project backend python backend/manage.py runserver 127.0.0.1:8000
frontend:
	bun run --cwd frontend dev
schema:
	uv run --env-file .env --project backend python backend/manage.py spectacular --file backend/openapi.yaml --validate --fail-on-warn
	bun run --cwd frontend schema:generate
check:
	uv run --env-file .env --project backend ruff check backend
	uv run --env-file .env --project backend ruff format --check backend
	uv run --env-file .env --project backend python backend/manage.py makemigrations --check --dry-run
	uv run --env-file .env --project backend pytest backend/tests
	bun run --cwd frontend lint
	bun run --cwd frontend format:check
	bun run --cwd frontend test
	bun run --cwd frontend build
e2e:
	uv run --env-file .env --project backend python backend/manage.py prepare_e2e
	bun run --cwd frontend e2e
