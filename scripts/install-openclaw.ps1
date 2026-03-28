$ErrorActionPreference = "Stop"

$pluginPath = Resolve-Path (Join-Path $PSScriptRoot "..")

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  throw "pnpm is required but was not found in PATH."
}

if (-not (Get-Command openclaw -ErrorAction SilentlyContinue)) {
  throw "openclaw CLI is required but was not found in PATH."
}

Set-Location $pluginPath

if (-not $env:MUSIC_STORAGE_DRIVER) {
  $env:MUSIC_STORAGE_DRIVER = "sqlite"
}

if (-not $env:MUSIC_DB_PATH) {
  $env:MUSIC_DB_PATH = Join-Path $pluginPath "data\\music-skill.db"
}

if (-not $env:MUSIC_AGENT_TEMPLATE) {
  $env:MUSIC_AGENT_TEMPLATE = "default"
}

Write-Host "Installing dependencies..."
pnpm install --frozen-lockfile

Write-Host "Generating Music Agent scaffold..."
pnpm generate:agent -- --template $env:MUSIC_AGENT_TEMPLATE

Write-Host "Installing Music Skill from $pluginPath"
openclaw plugins install --link $pluginPath

Write-Host "Restarting OpenClaw gateway..."
openclaw gateway restart

Write-Host ""
Write-Host "Install complete."
Write-Host "Storage driver: $($env:MUSIC_STORAGE_DRIVER)"
Write-Host "Database path:  $($env:MUSIC_DB_PATH)"
Write-Host "Agent template: $($env:MUSIC_AGENT_TEMPLATE)"
Write-Host "Music Agent root: $([System.IO.Path]::Combine($HOME, '.openclaw', 'agents', 'music-agent'))"
Write-Host "Verify with:"
Write-Host "  openclaw plugins list"
Write-Host "  openclaw skills list"
Write-Host ""
Write-Host "To launch the local panel:"
Write-Host "  pnpm start:panel"
