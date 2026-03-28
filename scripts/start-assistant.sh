#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-3000}"

export MUSIC_LIBRARY_DIR="${MUSIC_LIBRARY_DIR:-$PROJECT_ROOT}"
export MUSIC_STORAGE_DRIVER="${MUSIC_STORAGE_DRIVER:-sqlite}"
export MUSIC_DB_PATH="${MUSIC_DB_PATH:-$PROJECT_ROOT/data/music-skill.db}"

echo "Starting Music Skill panel..."
"$PROJECT_ROOT/scripts/start-panel.sh" &

echo
echo "Panel startup requested."
echo "Open http://localhost:${PORT}/panel"
echo "Host-level voice listener is only implemented for Windows in this MVP."
