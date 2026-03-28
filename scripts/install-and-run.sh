#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

"$PROJECT_ROOT/scripts/install-openclaw.sh"

echo
echo "Starting Music Skill assistant..."

(
  export MUSIC_LIBRARY_DIR="${MUSIC_LIBRARY_DIR:-$PROJECT_ROOT}"
  cd "$PROJECT_ROOT"
  nohup "$PROJECT_ROOT/scripts/start-assistant.sh" >/dev/null 2>&1 &
)

echo "Assistant startup requested."
echo "On macOS this starts the panel. Host-level voice remains Windows-only in this MVP."
