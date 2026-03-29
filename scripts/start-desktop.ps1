$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

if (-not $env:MUSIC_STORAGE_DRIVER) {
  $env:MUSIC_STORAGE_DRIVER = "sqlite"
}

if (-not $env:MUSIC_DB_PATH) {
  $env:MUSIC_DB_PATH = Join-Path $projectRoot "data\\music-skill.db"
}

if (-not $env:DESKTOP_PLAYER_PORT) {
  $env:DESKTOP_PLAYER_PORT = if ($env:PORT) { $env:PORT } else { "3330" }
}

Write-Host "Starting XiaoLe desktop player..."
Write-Host "DESKTOP_PLAYER_PORT=$($env:DESKTOP_PLAYER_PORT)"
Write-Host "MUSIC_STORAGE_DRIVER=$($env:MUSIC_STORAGE_DRIVER)"
Write-Host "MUSIC_DB_PATH=$($env:MUSIC_DB_PATH)"

Set-Location $projectRoot
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
pnpm desktop:start
