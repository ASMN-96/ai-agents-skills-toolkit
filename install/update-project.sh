#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required to run install/update-project.sh." >&2
  exit 127
fi

exec node "$SCRIPT_DIR/project-sync-core.mjs" update "$@"
