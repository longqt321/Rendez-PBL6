#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/env.sh"
if [[ -f .local/app.pid ]]; then kill -TERM "$(cat .local/app.pid)"; fi
if [[ ${1:-} == --database ]]; then docker compose --env-file .local/runtime.env -f compose.local.yaml stop db; fi
