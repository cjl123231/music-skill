#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export PORT="${PORT:-3000}"
export MUSIC_LIBRARY_DIR="${MUSIC_LIBRARY_DIR:-$PROJECT_ROOT}"
export MUSIC_STORAGE_DRIVER="${MUSIC_STORAGE_DRIVER:-sqlite}"
export MUSIC_DB_PATH="${MUSIC_DB_PATH:-$PROJECT_ROOT/data/music-skill.db}"

cd "$PROJECT_ROOT"

echo "Starting panel on http://localhost:${PORT}"
echo "MUSIC_LIBRARY_DIR=${MUSIC_LIBRARY_DIR}"
echo "MUSIC_STORAGE_DRIVER=${MUSIC_STORAGE_DRIVER}"
echo "MUSIC_DB_PATH=${MUSIC_DB_PATH}"

pnpm dev:http
