#!/usr/bin/env bash
set -euo pipefail
RENDEZ_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RENDEZ_ROOT"
export PYTHONDONTWRITEBYTECODE=1
export PYTHONPATH="$RENDEZ_ROOT/backend${PYTHONPATH:+:$PYTHONPATH}"
export UV_CACHE_DIR="$RENDEZ_ROOT/.local/uv-cache"
if [[ -f .local/runtime.env ]]; then
  set -a
  source .local/runtime.env
  set +a
fi
