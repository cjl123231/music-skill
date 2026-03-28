#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is required but was not found in PATH." >&2
  exit 1
fi

if ! command -v openclaw >/dev/null 2>&1; then
  echo "openclaw CLI is required but was not found in PATH." >&2
  exit 1
fi

cd "$PROJECT_ROOT"

export MUSIC_STORAGE_DRIVER="${MUSIC_STORAGE_DRIVER:-sqlite}"
export MUSIC_DB_PATH="${MUSIC_DB_PATH:-$PROJECT_ROOT/data/music-skill.db}"
export MUSIC_AGENT_TEMPLATE="${MUSIC_AGENT_TEMPLATE:-default}"

echo "Installing dependencies..."
pnpm install --frozen-lockfile

echo "Generating Music Agent scaffold..."
pnpm generate:agent -- --template "$MUSIC_AGENT_TEMPLATE"

echo "Installing Music Skill from $PROJECT_ROOT"
openclaw plugins install --link "$PROJECT_ROOT"

echo "Restarting OpenClaw gateway..."
openclaw gateway restart

echo
echo "Install complete."
echo "Storage driver: $MUSIC_STORAGE_DRIVER"
echo "Database path:  $MUSIC_DB_PATH"
echo "Agent template: $MUSIC_AGENT_TEMPLATE"
echo "Music Agent root: ${OPENCLAW_HOME:-$HOME/.openclaw}/agents/music-agent"
echo "Verify with:"
echo "  openclaw plugins list"
echo "  openclaw skills list"
echo
echo "To launch the local panel:"
echo "  ./scripts/start-panel.sh"
