$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$port = if ($env:PORT) { $env:PORT } else { "3310" }

if (-not $env:MUSIC_STORAGE_DRIVER) {
  $env:MUSIC_STORAGE_DRIVER = "sqlite"
}

if (-not $env:MUSIC_DB_PATH) {
  $env:MUSIC_DB_PATH = Join-Path $projectRoot "data\\music-skill.db"
}

Set-Location $projectRoot

Write-Host "Starting panel on http://localhost:$port"
Write-Host "MUSIC_STORAGE_DRIVER=$($env:MUSIC_STORAGE_DRIVER)"
Write-Host "MUSIC_DB_PATH=$($env:MUSIC_DB_PATH)"

pnpm dev:http
