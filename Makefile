.PHONY: setup start stop backend frontend check schema backup restore e2e
setup:
	bash scripts/setup-local.sh
start:
	bash scripts/start-local.sh
stop:
	bash scripts/stop-local.sh
backend:
	bash -c 'source scripts/env.sh; backend/.venv/bin/python backend/manage.py runserver 127.0.0.1:8000'
frontend:
	bash -c 'source scripts/env.sh; bun run --cwd frontend dev'
check:
	bash scripts/check.sh all
schema:
	bash -c 'source scripts/env.sh; backend/.venv/bin/python scripts/generate-schema.py'
	bun run --cwd frontend schema:generate
backup:
	bash scripts/backup-local.sh
restore:
	@if [ -z "$(BACKUP)" ]; then echo "Usage: make restore BACKUP=.local/backups/<backup-folder>"; exit 1; fi
	bash scripts/restore-local.sh $(BACKUP) --yes
e2e:
	bun run --cwd frontend e2e
